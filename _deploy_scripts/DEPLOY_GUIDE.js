// DEPLOYMENT GUIDE — High-Volume Features
// ═══════════════════════════════════════════════════════════════════════════════
//
// FILES TO COPY:
// ──────────────────────────────────────────────────────────────────────────────
//
// 1. server/routes/data_import.js     ← Data import with field mapping + dedup
// 2. server/routes/bulk_actions.js    ← Server-side bulk actions for "select all matching"
// 3. server/routes/screening.js       ← Screening rules + auto-score + knockout questions
// 4. client/src/settings/DataImportSettings.jsx  ← Import wizard UI
// 5. client/src/ScreeningRulesPanel.jsx           ← Screening rules panel for job records
//
// DEPENDENCIES TO INSTALL:
// ──────────────────────────────────────────────────────────────────────────────
//   cd server && npm install xlsx
//
// ═══════════════════════════════════════════════════════════════════════════════
// WIRING — server/index.js
// ═══════════════════════════════════════════════════════════════════════════════
//
// Add these three lines alongside the existing route registrations:
//
//   app.use('/api/data-import',  require('./routes/data_import'));
//   app.use('/api/records',      require('./routes/bulk_actions'));
//   app.use('/api/screening',    require('./routes/screening'));
//
// ═══════════════════════════════════════════════════════════════════════════════
// WIRING — client/src/Settings.jsx
// ═══════════════════════════════════════════════════════════════════════════════
//
// The current Import/Export section (ConfigSection) needs a tab bar splitting it
// into "Config" and "Data Import" tabs. The DataImportSettings component replaces
// the inline CSV import that was previously on list pages.
//
// 1. Add import at the top of Settings.jsx:
//
//    import DataImportSettings from "./settings/DataImportSettings.jsx";
//
// 2. Find the ConfigSection component and wrap it in tabs:
//
//    Replace the standalone <ConfigSection environment={environment}/>  render
//    with a tabbed container:
//
//    const ImportExportSection = ({ environment }) => {
//      const [tab, setTab] = useState("config");
//      return (
//        <div>
//          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
//            {[{ id: "config", label: "Config" }, { id: "data", label: "Data Import" }].map(t => (
//              <button key={t.id} onClick={() => setTab(t.id)} style={{
//                padding: "7px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600,
//                cursor: "pointer", fontFamily: F,
//                background: tab === t.id ? C.accent : "transparent",
//                color: tab === t.id ? "white" : C.text3,
//              }}>{t.label}</button>
//            ))}
//          </div>
//          {tab === "config" ? <ConfigSection environment={environment} /> : <DataImportSettings environment={environment} />}
//        </div>
//      );
//    };
//
//    Then replace the render case for "import_export" to use <ImportExportSection/>.
//
// ═══════════════════════════════════════════════════════════════════════════════
// WIRING — client/src/Records.jsx (Bulk actions upgrade)
// ═══════════════════════════════════════════════════════════════════════════════
//
// 1. REMOVE the CSV import button from the toolbar (force through Settings instead)
//
//    Find the Import/Export buttons in the toolbar and remove the Import button.
//    Keep the Export button.
//
// 2. ADD "Select all matching" to the BulkActionBar:
//
//    When selectedIds.size > 0 and activeFilters.length > 0, show:
//    "Select all {totalMatchingCount} matching this filter"
//
//    This needs a new state:
//      const [totalFilteredCount, setTotalFilteredCount] = useState(null);
//      const [selectAllMatching, setSelectAllMatching] = useState(false);
//
//    When filters change, call:
//      POST /api/records/bulk-count { object_id, environment_id, filters: activeFilters }
//    And store the count in totalFilteredCount.
//
//    When "Select all matching" is clicked, set selectAllMatching = true.
//    The bulk action bar shows: "All {totalFilteredCount} records matching this filter selected"
//
//    When bulk edit/delete fires with selectAllMatching = true, call:
//      POST /api/records/bulk-action { object_id, environment_id, filters, action, payload }
//    Instead of doing per-record API calls.
//
// 3. ADD double-confirm for delete:
//
//    When action === 'delete':
//    - Check session.role.slug === 'super_admin' — if not, show "Only super administrators can bulk delete"
//    - If super_admin, show a modal with:
//      "You are about to permanently delete {count} records. Type the number {count} to confirm."
//      [input field] — must match the count exactly
//      [Cancel] [Delete {count} records] — button only enabled when input matches
//
// ═══════════════════════════════════════════════════════════════════════════════
// WIRING — client/src/Records.jsx (Screening Rules panel on Job records)
// ═══════════════════════════════════════════════════════════════════════════════
//
// 1. Import at the top:
//    import ScreeningRulesPanel from "./ScreeningRulesPanel.jsx";
//
// 2. Add to PANEL_META (the panel definitions object):
//    screening: { id: "screening", label: "Screening Rules", icon: "shield" },
//
// 3. In getDefaultPanelOrder, add "screening" for Job records:
//    if (objectName === 'Job') return ['screening', 'comms', 'notes', 'files', ...];
//
// 4. In PanelContent switch/if-chain, add the render case:
//    if (panelId === "screening") return (
//      <ScreeningRulesPanel
//        record={record}
//        environment={environment}
//        candidateFields={candidateFields} // ← need to load People object fields
//      />
//    );
//
//    Note: candidateFields should be the fields from the People object (not the
//    current object). Load them once when the panel opens:
//    useEffect(() => {
//      api.get(`/objects?environment_id=${envId}`).then(objs => {
//        const people = objs.find(o => o.slug === 'people');
//        if (people) api.get(`/fields?object_id=${people.id}`).then(setcandidateFields);
//      });
//    }, [envId]);
//
// ═══════════════════════════════════════════════════════════════════════════════
// WIRING — Portal apply form (knockout questions)
// ═══════════════════════════════════════════════════════════════════════════════
//
// In portal-renderer/src/portals/CareerSite.jsx, when rendering the apply form:
//
// 1. Fetch knockout questions for the job:
//    GET /api/screening/job/{job_id}/knockout-questions?environment_id={envId}
//
// 2. Render each knockout as a question above the regular form fields:
//    - yes_no type → Yes/No radio buttons
//    - number type → number input
//    - select type → dropdown with options
//
// 3. On form submit, evaluate knockout answers client-side before submitting:
//    - If any knockout fails → show polite message:
//      "Thank you for your interest. Unfortunately, this role requires [criteria].
//       We'll keep your details on file for future opportunities."
//    - Still submit the application (creates the People record) but mark the link
//      with screening_status: "knocked_out"
//
// 4. After the People record is created and linked to the job, call:
//    POST /api/screening/evaluate { candidate_id, job_id, environment_id }
//    This runs the full screening (including non-knockout rules) and stores the
//    result on the people_link record.
//
// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-SCORE TRIGGER — when a candidate is linked to a job
// ═══════════════════════════════════════════════════════════════════════════════
//
// In server/routes/records.js or wherever people_links are created (POST),
// add a post-insert hook:
//
//   // After creating the people_link:
//   if (newLink) {
//     try {
//       const screeningRoute = require('./screening');
//       // Fire screening evaluation asynchronously
//       const { evaluateCandidate } = require('./screening');
//       // Or call the endpoint internally:
//       fetch(`http://localhost:${PORT}/api/screening/evaluate`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           candidate_id: person_record_id,
//           job_id: target_record_id,
//           environment_id,
//         }),
//       }).catch(() => {}); // fire-and-forget
//     } catch (e) { console.error('Screening auto-eval failed:', e); }
//   }
//
// This ensures every time a person is linked to a job (whether manually,
// via the copilot, via portal apply, or via import), the screening rules
// are automatically evaluated and the score is stored.
//
// ═══════════════════════════════════════════════════════════════════════════════
