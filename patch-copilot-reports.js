#!/usr/bin/env node
/**
 * Combined patch:
 *   A) Fix copilot report creation (3 root causes)
 *   B) List page context — copilot reads the current list so it can
 *      answer "how many people are in this list?", "who has status Active?" etc.
 *
 * Run from: ~/projects/talentos
 * node patch-copilot-reports.js
 */
const fs = require('fs');

function patch(filepath, label, from, to) {
  let src = fs.readFileSync(filepath, 'utf8');
  if (typeof from === 'string' && !src.includes(from)) {
    console.log(`SKIP ${label} — anchor not found`);
    return;
  }
  const result = src.replace(from, to);
  if (result === src) { console.log(`SKIP ${label} — already applied`); return; }
  fs.writeFileSync(filepath, result);
  console.log(`OK   ${label}`);
}

const AI      = 'client/src/AI.jsx';
const APP     = 'client/src/App.jsx';
const REPORTS = 'client/src/Reports.jsx';
const RECORDS = 'client/src/Records.jsx';

// ── PART A: FIX REPORT CREATION ───────────────────────────────────

const aiSrc = fs.readFileSync(AI, 'utf8');
console.log('\n-- A: Report creation fixes --');
console.log(`  handleConfirmReport: ${aiSrc.includes('handleConfirmReport')}`);
console.log(`  pendingReport state: ${aiSrc.includes('pendingReport')}`);

// A1: stamp _ts so App detects change even when already on reports page
patch(AI, 'A1 handleConfirmReport stamp _ts',
  `const handleConfirmReport = () => {
    if (!pendingReport) return;
    window.dispatchEvent(new CustomEvent('talentos:open-report', { detail: pendingReport }));
    setPendingReport(null);
  };`,
  `const handleConfirmReport = () => {
    if (!pendingReport) return;
    window.dispatchEvent(new CustomEvent('talentos:open-report', {
      detail: { ...pendingReport, _ts: Date.now() }
    }));
    setPendingReport(null);
  };`
);

// A2: App.jsx — force Reports.jsx to react when already on reports page
patch(APP, 'A2 open-report force re-render (multiline)',
  `setReportPreset(e.detail);
      setActiveNav("reports");`,
  `const preset = e.detail;
      if (activeNav === "reports") {
        setReportPreset(null);
        setTimeout(() => setReportPreset(preset), 0);
      } else {
        setReportPreset(preset);
        setActiveNav("reports");
      }`
);
patch(APP, 'A2 open-report force re-render (single line)',
  `setReportPreset(e.detail); setActiveNav("reports");`,
  `const preset = e.detail;
      if (activeNav === "reports") {
        setReportPreset(null);
        setTimeout(() => setReportPreset(preset), 0);
      } else {
        setReportPreset(preset);
        setActiveNav("reports");
      }`
);

// A3: Reports.jsx — react to initialReport prop changes
try {
  patch(REPORTS, 'A3 initialReport useEffect deps comment variant',
    `  }, []);  // initialReport`,
    `  }, [initialReport]);  // react to preset changes`
  );
  const rSrc = fs.readFileSync(REPORTS, 'utf8');
  const m = rSrc.match(/useEffect\(\s*\(\)\s*=>\s*\{[^}]*initialReport[^}]*\}[^,]*,\s*\[\s*\]\s*\)/s);
  if (m) patch(REPORTS, 'A3 initialReport useEffect deps (regex)', m[0], m[0].replace(/,\s*\[\s*\]/, ', [initialReport]'));
  else console.log('  SKIP A3 regex — not found (may already be correct)');
} catch(e) { console.log('  SKIP A3 — Reports.jsx not accessible'); }

// A4: Report confirmation card in UI
const aiSrc2 = fs.readFileSync(AI, 'utf8');
const hasReportCard = aiSrc2.includes('pendingReport&&') || aiSrc2.includes('pendingReport &&');
console.log(`  Report card exists: ${hasReportCard}`);
if (!hasReportCard) {
  patch(AI, 'A4 Add report confirmation card',
    `{/* ── Interview Scheduling Card ──`,
    `{/* ── Report Creation Card ── */}
          {pendingReport&&(
            <div style={{margin:"8px 0",padding:"14px",borderRadius:12,border:"1.5px solid #d97706",background:"#fffbeb"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:28,height:28,borderRadius:8,background:"#d97706",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ic n="bar-chart-2" s={14} c="white"/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{pendingReport.title||"Report"}</div>
                  <div style={{fontSize:11,color:"#d97706",fontWeight:600}}>
                    {pendingReport.object} · {pendingReport.chart_type||"bar"} chart
                    {pendingReport.group_by?" · grouped by "+pendingReport.group_by:""}
                  </div>
                </div>
              </div>
              {pendingReport.description&&<div style={{fontSize:12,color:"#4b5563",marginBottom:10,lineHeight:1.5}}>{pendingReport.description}</div>}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setPendingReport(null)} style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #e5e7eb",background:"transparent",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Discard</button>
                <button onClick={handleConfirmReport} disabled={creating} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:"#d97706",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {creating?<><Ic n="loader" s={12}/> Opening...</>:<><Ic n="bar-chart-2" s={12}/> Open Report</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Interview Scheduling Card ──`
  );
}

// ── PART B: LIST PAGE CONTEXT AWARENESS ──────────────────────────
console.log('\n-- B: List page context awareness --');

// B1: App.jsx — add listContext state
patch(APP, 'B1 Add listContext state',
  `const [activeRecord, setActiveRecord]   = useState(null);
  const [activeRecordObj, setActiveRecordObj] = useState(null);`,
  `const [activeRecord, setActiveRecord]   = useState(null);
  const [activeRecordObj, setActiveRecordObj] = useState(null);
  const [listContext, setListContext]       = useState(null);`
);

// B2: App.jsx — listen for list context events from RecordsView
patch(APP, 'B2 Listen for list-context event',
  `window.addEventListener("talentos:openCopilot",`,
  `window.addEventListener("talentos:list-context", (e) => { setListContext(e.detail || null); });
    window.addEventListener("talentos:openCopilot",`
);

// B3: App.jsx — clear list context on non-list navigation
patch(APP, 'B3 Clear listContext on nav away from list',
  `if (!id.startsWith("record_")) { setActiveRecord(null); setActiveRecordObj(null); }`,
  `if (!id.startsWith("record_")) { setActiveRecord(null); setActiveRecordObj(null); }
    if (!id.startsWith("obj_") && !id.startsWith("record_")) { setListContext(null); }`
);

// B4: App.jsx — pass listContext to AICopilot as pageContext
patch(APP, 'B4 Pass listContext as pageContext to AICopilot',
  `activeNav={activeNav}
          navObjects={navObjects}
          pageContext={null}`,
  `activeNav={activeNav}
          navObjects={navObjects}
          pageContext={listContext}`
);

// B5: Records.jsx — add helper + fire event when records load
patch(RECORDS, 'B5a Add buildListContext helper before RecordsView',
  `export default function RecordsView(`,
  `// Builds a plain-text list summary for the copilot
function buildListContext(object, records, total) {
  if (!object || !records) return null;
  const lines = [];
  lines.push("LIST: " + (object.plural_name || object.name) +
    " (" + total + " total" + (records.length < total ? ", showing " + records.length : "") + ")");
  const getName = r => {
    const d = r.data || {};
    return (d.first_name ? (d.first_name + " " + (d.last_name || "")).trim() : null)
      || d.job_title || d.pool_name || d.name || "";
  };
  const statuses = {};
  records.forEach(r => { const s = r.data?.status; if (s) statuses[s] = (statuses[s] || 0) + 1; });
  if (Object.keys(statuses).length)
    lines.push("Status breakdown: " +
      Object.entries(statuses).map(([k,v]) => k + ": " + v).join(", "));
  const depts = {};
  records.forEach(r => { const d = r.data?.department; if (d) depts[d] = (depts[d] || 0) + 1; });
  if (Object.keys(depts).length)
    lines.push("Department breakdown: " +
      Object.entries(depts).map(([k,v]) => k + ": " + v).join(", "));
  const names = records.slice(0, 25).map(getName).filter(Boolean);
  if (names.length)
    lines.push("Records (first " + names.length + "): " + names.join(", ") +
      (total > 25 ? " ... and " + (total - 25) + " more" : ""));
  return lines.join("\n");
}

export default function RecordsView(`
);

patch(RECORDS, 'B5b Fire list-context event after records load',
  `setRecords(data.records || []);
      setTotal(data.pagination?.total ?? (data.records||[]).length);
      setLoading(false);`,
  `const loadedRecs = data.records || [];
      const totalCount = data.pagination?.total ?? loadedRecs.length;
      setRecords(loadedRecs);
      setTotal(totalCount);
      setLoading(false);
      window.dispatchEvent(new CustomEvent("talentos:list-context", {
        detail: buildListContext(object, loadedRecs, totalCount)
      }));`
);

// B6: AI.jsx — explain list context to Claude in system prompt
patch(AI, 'B6 Update system prompt for list awareness',
  `- On a list page: offer to search, filter, or create new records`,
  `- On a list page: the context includes "LIST:" data — total count, status/dept breakdown,
    first 25 record names. Use this to answer questions like "how many people are in this list?",
    "what statuses are shown?", "who has status Active?", "how many open jobs?".
    NEVER say you cannot see the list — the record count and summary is always provided.`
);

console.log('\nDone! Now run:');
console.log('  git add client/src/AI.jsx client/src/App.jsx client/src/Reports.jsx client/src/Records.jsx');
console.log('  git commit -m "fix: copilot report creation + list page context awareness"');
console.log('  git push origin main');
console.log('  cd client && vercel --prod --yes');
