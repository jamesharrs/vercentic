// DataImportSettings.jsx — Settings → Import/Export → Data Import tab
// Full wizard: Upload → Map Fields → Dedup Check → Review → Commit
import { useState, useEffect, useCallback, useRef } from "react";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  accent: "var(--t-accent, #4361ee)", accentLight: "var(--t-accent-light, #eef1ff)",
  text1: "var(--t-text1, #111827)", text2: "var(--t-text2, #374151)", text3: "var(--t-text3, #6b7280)", text4: "var(--t-text4, #9ca3af)",
  border: "var(--t-border, #e5e7eb)", card: "var(--t-card, #ffffff)", bg: "var(--t-bg, #f9fafb)",
  green: "#059669", red: "#dc2626", amber: "#d97706", purple: "#7c3aed",
};

const api = {
  get: u => fetch(u.startsWith('http') ? u : `/api${u}`).then(r => r.json()),
  post: (u, b) => fetch(`/api${u}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  del: u => fetch(`/api${u}`, { method: 'DELETE' }).then(r => r.json()),
};

// ── Icon helper ───────────────────────────────────────────────────────────────
const ICON_PATHS = {
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  chevD: "M6 9l6 6 6-6",
  chevR: "M9 18l6-6-6-6",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  search: "M11 17.25a6.25 6.25 0 110-12.5 6.25 6.25 0 010 12.5zM16 16l4.5 4.5",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  clock: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  merge: "M18 4l-4 4 4 4M6 4l4 4-4 4M14 8H8M14 16H8",
  split: "M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
  skip: "M5 4l10 8-10 8V4z M19 5v14",
  map: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
};

const Ic = ({ n, s = 16, c = "currentColor", style }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <path d={ICON_PATHS[n] || ""} />
  </svg>
);

// ── Shared UI components ──────────────────────────────────────────────────────
const Badge = ({ children, color, bg }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg || `${color}15`, color, whiteSpace: "nowrap" }}>{children}</span>
);

const Btn = ({ children, variant, size, disabled, onClick, style }) => {
  const isPrimary = variant === "primary";
  const isSm = size === "sm";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", alignItems: "center", gap: 6, padding: isSm ? "6px 12px" : "9px 18px",
      borderRadius: 9, border: isPrimary ? "none" : `1.5px solid ${C.border}`,
      background: isPrimary ? C.accent : "white", color: isPrimary ? "white" : C.text2,
      fontSize: isSm ? 12 : 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, fontFamily: F, transition: "all .15s", ...style,
    }}>{children}</button>
  );
};

// ── Wizard Steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { key: "upload", label: "Upload", icon: "upload" },
  { key: "map", label: "Map Fields", icon: "map" },
  { key: "review", label: "Review", icon: "search" },
  { key: "result", label: "Result", icon: "check" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function DataImportSettings({ environment }) {
  const [activeTab, setActiveTab] = useState("import"); // import | history
  const [step, setStep] = useState(0); // wizard step index
  const [objects, setObjects] = useState([]);
  const [fields, setFields] = useState([]);
  const [selObjectId, setSelObjectId] = useState("");
  const [history, setHistory] = useState([]);

  // Upload state
  const [uploadResult, setUploadResult] = useState(null); // { upload_id, headers, preview, row_count }
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const dropRef = useRef(null);

  // Mapping state
  const [mappings, setMappings] = useState([]); // { source_column, action, target_field, target_type, split_config }

  // Dedup state
  const [checkDuplicates, setCheckDuplicates] = useState(false);
  const [dupThreshold, setDupThreshold] = useState(50);

  // Preview state
  const [previewResult, setPreviewResult] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [dupDecisions, setDupDecisions] = useState({}); // { row_index: 'create' | 'skip' | 'merge' }

  // Import state
  const [importMode, setImportMode] = useState("create");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const envId = environment?.id;

  useEffect(() => {
    if (!envId) return;
    api.get(`/objects?environment_id=${envId}`).then(d => setObjects(Array.isArray(d) ? d : []));
    api.get(`/data-import/history?environment_id=${envId}`).then(d => setHistory(Array.isArray(d) ? d : []));
  }, [envId]);

  useEffect(() => {
    if (!selObjectId) { setFields([]); return; }
    api.get(`/fields?object_id=${selObjectId}`).then(d => setFields(Array.isArray(d) ? d : []));
  }, [selObjectId]);

  // ── Upload handler ──────────────────────────────────────────────────────────
  const handleUpload = async (file) => {
    if (!file || !selObjectId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/data-import/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) { alert(data.error); setUploading(false); return; }
      setUploadResult(data);

      // Auto-generate mappings
      const autoMappings = data.headers.map(h => {
        const normalised = h.toLowerCase().replace(/[\s-]+/g, '_');
        const match = fields.find(f =>
          f.api_key === normalised ||
          f.name.toLowerCase() === h.toLowerCase() ||
          f.api_key === h.toLowerCase()
        );
        // Detect potential split columns
        const isSplittable = /full.?name|name/i.test(h) && !fields.some(f => f.api_key === normalised);
        if (isSplittable && fields.some(f => f.api_key === 'first_name') && fields.some(f => f.api_key === 'last_name')) {
          return {
            source_column: h,
            action: 'split',
            target_field: null,
            target_type: null,
            split_config: {
              separator: ' ',
              targets: [
                { target_field: 'first_name', label: 'First Name' },
                { target_field: 'last_name', label: 'Last Name' },
              ],
            },
          };
        }
        return {
          source_column: h,
          action: match ? 'map' : 'skip',
          target_field: match?.api_key || '',
          target_type: match?.field_type || 'text',
          split_config: null,
        };
      });
      setMappings(autoMappings);
      setStep(1); // advance to mapping step
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  };

  // ── Preview / dedup check ───────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!uploadResult?.upload_id) return;
    setPreviewing(true);
    try {
      const data = await api.post('/data-import/preview', {
        upload_id: uploadResult.upload_id,
        object_id: selObjectId,
        environment_id: envId,
        mappings: mappings.filter(m => m.action !== 'skip'),
        check_duplicates: checkDuplicates,
        duplicate_threshold: dupThreshold,
      });
      setPreviewResult(data);
      // Default all duplicate decisions to 'review'
      const decisions = {};
      (data.duplicates || []).forEach(d => { decisions[String(d.row_index)] = 'review'; });
      setDupDecisions(decisions);
      setStep(2);
    } catch (err) {
      alert('Preview failed: ' + err.message);
    }
    setPreviewing(false);
  };

  // ── Commit import ───────────────────────────────────────────────────────────
  const handleCommit = async () => {
    if (!uploadResult?.upload_id) return;
    setImporting(true);
    try {
      // Convert 'review' decisions to 'create' (default action for unresolved)
      const finalDecisions = {};
      Object.entries(dupDecisions).forEach(([k, v]) => {
        finalDecisions[k] = v === 'review' ? 'create' : v;
      });
      const result = await api.post('/data-import/commit', {
        upload_id: uploadResult.upload_id,
        object_id: selObjectId,
        environment_id: envId,
        mappings: mappings.filter(m => m.action !== 'skip'),
        mode: importMode,
        duplicate_decisions: finalDecisions,
      });
      setImportResult(result);
      setStep(3);
      // Refresh history
      api.get(`/data-import/history?environment_id=${envId}`).then(d => setHistory(Array.isArray(d) ? d : []));
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
    setImporting(false);
  };

  // ── Reset wizard ────────────────────────────────────────────────────────────
  const resetWizard = () => {
    setStep(0); setUploadResult(null); setMappings([]); setPreviewResult(null);
    setDupDecisions({}); setImportResult(null); setImportMode('create'); setCheckDuplicates(false);
  };

  // ── Mapping helpers ─────────────────────────────────────────────────────────
  const updateMapping = (idx, updates) => {
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, ...updates } : m));
  };

  const mappedCount = mappings.filter(m => m.action === 'map' || m.action === 'split').length;
  const skippedCount = mappings.filter(m => m.action === 'skip').length;
  const selObject = objects.find(o => o.id === selObjectId);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, fontFamily: F }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: C.text1 }}>Data Import</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.text3 }}>Import records from CSV, Excel, TSV, or JSON files.</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["import", "history"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F,
              background: activeTab === tab ? C.accent : "transparent", color: activeTab === tab ? "white" : C.text3,
            }}>{tab === "import" ? "Import" : `History (${history.length})`}</button>
          ))}
        </div>
      </div>

      {activeTab === "history" ? (
        <HistoryView history={history} objects={objects} onDelete={async (id) => {
          await api.del(`/data-import/history/${id}`);
          setHistory(h => h.filter(x => x.id !== id));
        }} />
      ) : (
        <div>
          {/* Wizard progress */}
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {STEPS.map((s, i) => (
              <div key={s.key} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < step ? C.green : i === step ? C.accent : C.bg,
                  color: i <= step ? "white" : C.text4, fontSize: 12, fontWeight: 700,
                  border: `2px solid ${i < step ? C.green : i === step ? C.accent : C.border}`,
                }}>{i < step ? <Ic n="check" s={12} c="white" /> : i + 1}</div>
                <span style={{ fontSize: 12, fontWeight: i === step ? 700 : 500, color: i === step ? C.text1 : C.text3 }}>{s.label}</span>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? C.green : C.border, borderRadius: 1 }} />}
              </div>
            ))}
          </div>

          {/* Step 0: Upload */}
          {step === 0 && (
            <StepUpload
              objects={objects} selObjectId={selObjectId} onSelectObject={setSelObjectId}
              onUpload={handleUpload} uploading={uploading} fileRef={fileRef} dropRef={dropRef}
            />
          )}

          {/* Step 1: Map Fields */}
          {step === 1 && uploadResult && (
            <StepMap
              uploadResult={uploadResult} mappings={mappings} fields={fields}
              onUpdateMapping={updateMapping} mappedCount={mappedCount} skippedCount={skippedCount}
              checkDuplicates={checkDuplicates} onToggleDedup={setCheckDuplicates}
              dupThreshold={dupThreshold} onSetThreshold={setDupThreshold}
              importMode={importMode} onSetMode={setImportMode}
              onBack={() => setStep(0)} onNext={handlePreview} previewing={previewing}
            />
          )}

          {/* Step 2: Review */}
          {step === 2 && previewResult && (
            <StepReview
              previewResult={previewResult} dupDecisions={dupDecisions} onSetDupDecision={(idx, action) => {
                setDupDecisions(prev => ({ ...prev, [String(idx)]: action }));
              }}
              onSetAllDupDecisions={(action) => {
                const all = {};
                (previewResult.duplicates || []).forEach(d => { all[String(d.row_index)] = action; });
                setDupDecisions(all);
              }}
              onBack={() => setStep(1)} onCommit={handleCommit} importing={importing}
              selObject={selObject}
            />
          )}

          {/* Step 3: Result */}
          {step === 3 && importResult && (
            <StepResult result={importResult} selObject={selObject} onReset={resetWizard} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 0: Upload ────────────────────────────────────────────────────────────
function StepUpload({ objects, selObjectId, onSelectObject, onUpload, uploading, fileRef }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "24px 28px" }}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, display: "block", marginBottom: 6, letterSpacing: ".04em", textTransform: "uppercase" }}>
          Import into
        </label>
        <select value={selObjectId} onChange={e => onSelectObject(e.target.value)} style={{
          width: "100%", maxWidth: 320, padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`,
          fontSize: 13, fontFamily: F, outline: "none", background: "white", color: C.text1,
        }}>
          <option value="">Select object…</option>
          {objects.map(o => <option key={o.id} value={o.id}>{o.plural_name || o.name}</option>)}
        </select>
      </div>

      {selObjectId && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? C.accent : C.border}`, borderRadius: 14,
            padding: "48px 24px", textAlign: "center", cursor: "pointer",
            background: dragOver ? C.accentLight : C.bg, transition: "all .2s",
          }}>
          <Ic n="upload" s={32} c={dragOver ? C.accent : C.text4} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 4 }}>
            {uploading ? "Uploading…" : "Drop file here or click to browse"}
          </div>
          <div style={{ fontSize: 12, color: C.text3 }}>
            CSV, TSV, JSON, XLS, XLSX — up to 50MB
          </div>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.json,.xls,.xlsx" hidden
            onChange={e => { if (e.target.files[0]) onUpload(e.target.files[0]); e.target.value = ''; }} />
        </div>
      )}
    </div>
  );
}

// ── Step 1: Map Fields ────────────────────────────────────────────────────────
function StepMap({ uploadResult, mappings, fields, onUpdateMapping, mappedCount, skippedCount,
  checkDuplicates, onToggleDedup, dupThreshold, onSetThreshold, importMode, onSetMode,
  onBack, onNext, previewing }) {

  const usedTargets = new Set(mappings.filter(m => m.action === 'map').map(m => m.target_field));

  return (
    <div>
      {/* File info strip */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Badge color={C.accent} bg={C.accentLight}><Ic n="file" s={11} c={C.accent} /> {uploadResult.file_name}</Badge>
        <Badge color={C.text2}>{uploadResult.row_count} rows</Badge>
        <Badge color={C.green}>{mappedCount} mapped</Badge>
        {skippedCount > 0 && <Badge color={C.amber}>{skippedCount} skipped</Badge>}
      </div>

      {/* Mapping table */}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr", gap: 0, padding: "10px 16px",
          background: C.bg, borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".05em" }}>
          <span>Source Column</span>
          <span style={{ textAlign: "center" }}>Action</span>
          <span>Target Field</span>
        </div>
        {mappings.map((m, idx) => (
          <MappingRow key={idx} mapping={m} idx={idx} fields={fields} usedTargets={usedTargets}
            preview={uploadResult.preview?.[0]?.[m.source_column]}
            onUpdate={(updates) => onUpdateMapping(idx, updates)} />
        ))}
      </div>

      {/* Options row */}
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 16, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 4, display: "block" }}>Import mode</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ v: "create", l: "Create new" }, { v: "upsert", l: "Update + create" }].map(({ v, l }) => (
              <button key={v} onClick={() => onSetMode(v)} style={{
                padding: "6px 12px", borderRadius: 7, border: `1.5px solid ${importMode === v ? C.accent : C.border}`,
                background: importMode === v ? C.accentLight : "white", color: importMode === v ? C.accent : C.text3,
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F,
              }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={checkDuplicates} onChange={e => onToggleDedup(e.target.checked)}
            style={{ accentColor: C.accent }} />
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>Check for duplicates before importing</label>
          {checkDuplicates && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="range" min={30} max={90} step={5} value={dupThreshold} onChange={e => onSetThreshold(Number(e.target.value))}
                style={{ width: 80, accentColor: C.accent }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>{dupThreshold}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview strip */}
      {uploadResult.preview?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>
            Preview (first 3 rows after mapping)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>{mappings.filter(m => m.action !== 'skip').map((m, i) => (
                  <th key={i} style={{ padding: "6px 10px", textAlign: "left", borderBottom: `1px solid ${C.border}`, color: C.text2, fontWeight: 600 }}>
                    {m.action === 'split' ? m.split_config?.targets?.map(t => t.target_field).join(' / ') : m.target_field}
                  </th>
                ))}</tr>
              </thead>
              <tbody>
                {uploadResult.preview.slice(0, 3).map((row, ri) => (
                  <tr key={ri}>{mappings.filter(m => m.action !== 'skip').map((m, ci) => (
                    <td key={ci} style={{ padding: "5px 10px", borderBottom: `1px solid ${C.bg}`, color: C.text1 }}>
                      {m.action === 'split'
                        ? (row[m.source_column] || '').split(m.split_config?.separator || ' ').join(' → ')
                        : row[m.source_column] || '—'}
                    </td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Btn onClick={onBack}><Ic n="chevR" s={12} c={C.text3} style={{ transform: "rotate(180deg)" }} /> Back</Btn>
        <Btn variant="primary" onClick={onNext} disabled={previewing || mappedCount === 0}>
          {previewing ? "Analysing…" : "Review Import"} <Ic n="chevR" s={12} c="white" />
        </Btn>
      </div>
    </div>
  );
}

// ── Mapping Row ───────────────────────────────────────────────────────────────
function MappingRow({ mapping, idx, fields, usedTargets, preview, onUpdate }) {
  const [showSplit, setShowSplit] = useState(mapping.action === 'split');

  const actionColor = mapping.action === 'map' ? C.green : mapping.action === 'split' ? C.purple : C.amber;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr", gap: 0, padding: "10px 16px",
      borderBottom: `1px solid ${C.bg}`, alignItems: "center" }}>
      {/* Source */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{mapping.source_column}</div>
        {preview && <div style={{ fontSize: 11, color: C.text4, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>e.g. {preview}</div>}
      </div>

      {/* Action */}
      <div style={{ textAlign: "center" }}>
        <select value={mapping.action} onChange={e => {
          const newAction = e.target.value;
          if (newAction === 'split') {
            setShowSplit(true);
            onUpdate({ action: 'split', target_field: null, split_config: { separator: ' ', targets: [{ target_field: '', label: 'Part 1' }, { target_field: '', label: 'Part 2' }] } });
          } else {
            setShowSplit(false);
            onUpdate({ action: newAction, split_config: null });
          }
        }} style={{
          padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
          border: `1.5px solid ${actionColor}30`, background: `${actionColor}10`, color: actionColor,
          fontFamily: F, cursor: "pointer", outline: "none",
        }}>
          <option value="map">Map →</option>
          <option value="split">Split ✂</option>
          <option value="skip">Skip</option>
        </select>
      </div>

      {/* Target */}
      <div>
        {mapping.action === 'skip' ? (
          <span style={{ fontSize: 12, color: C.text4, fontStyle: "italic" }}>Not imported</span>
        ) : mapping.action === 'split' ? (
          <SplitConfig config={mapping.split_config} fields={fields} onUpdate={cfg => onUpdate({ split_config: cfg })} />
        ) : (
          <select value={mapping.target_field} onChange={e => {
            const field = fields.find(f => f.api_key === e.target.value);
            onUpdate({ target_field: e.target.value, target_type: field?.field_type || 'text' });
          }} style={{
            width: "100%", padding: "6px 10px", borderRadius: 7, border: `1.5px solid ${C.border}`,
            fontSize: 12, fontFamily: F, outline: "none", color: C.text1, background: "white",
          }}>
            <option value="">Select field…</option>
            {fields.map(f => (
              <option key={f.api_key} value={f.api_key} disabled={usedTargets.has(f.api_key) && f.api_key !== mapping.target_field}>
                {f.name} ({f.field_type})
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// ── Split Config ──────────────────────────────────────────────────────────────
function SplitConfig({ config, fields, onUpdate }) {
  if (!config) return null;

  const updateTarget = (idx, field) => {
    const targets = [...(config.targets || [])];
    targets[idx] = { ...targets[idx], target_field: field };
    onUpdate({ ...config, targets });
  };

  const addTarget = () => {
    onUpdate({ ...config, targets: [...(config.targets || []), { target_field: '', label: `Part ${(config.targets?.length || 0) + 1}` }] });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: C.text3 }}>Split by:</span>
        <input value={config.separator || ' '} onChange={e => onUpdate({ ...config, separator: e.target.value })}
          style={{ width: 40, padding: "3px 6px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 11, textAlign: "center", fontFamily: "monospace" }} />
      </div>
      {(config.targets || []).map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: C.purple, fontWeight: 700, width: 14 }}>{i + 1}.</span>
          <select value={t.target_field} onChange={e => updateTarget(i, e.target.value)} style={{
            flex: 1, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.purple}30`, fontSize: 11, fontFamily: F, outline: "none",
          }}>
            <option value="">→ field…</option>
            {fields.map(f => <option key={f.api_key} value={f.api_key}>{f.name}</option>)}
          </select>
        </div>
      ))}
      <button onClick={addTarget} style={{ fontSize: 10, color: C.purple, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, fontFamily: F }}>
        + Add part
      </button>
    </div>
  );
}

// ── Step 2: Review ────────────────────────────────────────────────────────────
function StepReview({ previewResult, dupDecisions, onSetDupDecision, onSetAllDupDecisions, onBack, onCommit, importing, selObject }) {
  const [showDups, setShowDups] = useState(false);
  const dupCount = previewResult?.duplicate_count || 0;
  const skipCount = Object.values(dupDecisions).filter(v => v === 'skip').length;
  const mergeCount = Object.values(dupDecisions).filter(v => v === 'merge').length;
  const createCount = previewResult.total_rows - skipCount;

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total rows", value: previewResult.total_rows, color: C.text1 },
          { label: "Will create", value: createCount - mergeCount, color: C.green },
          { label: "Will merge", value: mergeCount, color: C.purple },
          { label: "Will skip", value: skipCount, color: C.amber },
          { label: "Duplicates found", value: dupCount, color: dupCount > 0 ? C.red : C.green },
        ].map((s, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Duplicates section */}
      {dupCount > 0 && (
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.red}20`, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Ic n="alert" s={16} c={C.amber} />
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{dupCount} potential duplicate{dupCount !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn size="sm" onClick={() => onSetAllDupDecisions('skip')} style={{ borderColor: `${C.amber}40`, color: C.amber }}>
                <Ic n="skip" s={11} c={C.amber} /> Skip all
              </Btn>
              <Btn size="sm" onClick={() => onSetAllDupDecisions('create')} style={{ borderColor: `${C.green}40`, color: C.green }}>
                Create all anyway
              </Btn>
              <Btn size="sm" onClick={() => onSetAllDupDecisions('merge')} style={{ borderColor: `${C.purple}40`, color: C.purple }}>
                <Ic n="merge" s={11} c={C.purple} /> Merge all
              </Btn>
              <Btn size="sm" onClick={() => setShowDups(!showDups)}>
                {showDups ? "Hide" : "Review each"} <Ic n="chevD" s={11} />
              </Btn>
            </div>
          </div>
          {showDups && (previewResult.duplicates || []).map((dup, i) => (
            <DuplicateRow key={i} dup={dup} decision={dupDecisions[String(dup.row_index)] || 'review'}
              onDecide={(action) => onSetDupDecision(dup.row_index, action)} />
          ))}
        </div>
      )}

      {/* Data preview */}
      {previewResult.preview?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 8, textTransform: "uppercase" }}>
            Mapped data preview (first 10 rows)
          </div>
          <div style={{ overflowX: "auto", maxHeight: 300 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr>{Object.keys(previewResult.preview[0] || {}).map(k => (
                <th key={k} style={{ padding: "5px 8px", textAlign: "left", borderBottom: `1px solid ${C.border}`, color: C.text3, fontWeight: 600, whiteSpace: "nowrap" }}>{k}</th>
              ))}</tr></thead>
              <tbody>{previewResult.preview.map((row, ri) => (
                <tr key={ri}>{Object.values(row).map((v, ci) => (
                  <td key={ci} style={{ padding: "4px 8px", borderBottom: `1px solid ${C.bg}`, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {Array.isArray(v) ? v.join(', ') : String(v ?? '')}
                  </td>
                ))}</tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Btn onClick={onBack}><Ic n="chevR" s={12} c={C.text3} style={{ transform: "rotate(180deg)" }} /> Back</Btn>
        <Btn variant="primary" onClick={onCommit} disabled={importing}>
          {importing ? "Importing…" : `Import ${createCount} record${createCount !== 1 ? 's' : ''}`} <Ic n="check" s={12} c="white" />
        </Btn>
      </div>
    </div>
  );
}

// ── Duplicate Row ─────────────────────────────────────────────────────────────
function DuplicateRow({ dup, decision, onDecide }) {
  const incoming = dup.incoming_data || {};
  const existing = dup.match?.existing_data || {};
  const name = [incoming.first_name, incoming.last_name].filter(Boolean).join(' ') || incoming.email || `Row ${dup.row_index + 1}`;
  const existingName = [existing.first_name, existing.last_name].filter(Boolean).join(' ') || existing.email || 'Existing';

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.bg}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{name}</div>
        <div style={{ fontSize: 11, color: C.text3 }}>
          matches <strong>{existingName}</strong> ({dup.match?.score}% — {dup.match?.reasons?.join(', ')})
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {[
          { v: 'create', l: 'Create', c: C.green, icon: 'check' },
          { v: 'skip', l: 'Skip', c: C.amber, icon: 'skip' },
          { v: 'merge', l: 'Merge', c: C.purple, icon: 'merge' },
        ].map(({ v, l, c, icon }) => (
          <button key={v} onClick={() => onDecide(v)} style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F,
            border: `1.5px solid ${decision === v ? c : C.border}`, background: decision === v ? `${c}10` : "white", color: decision === v ? c : C.text3,
            display: "flex", alignItems: "center", gap: 4,
          }}><Ic n={icon} s={10} c={decision === v ? c : C.text4} /> {l}</button>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Result ────────────────────────────────────────────────────────────
function StepResult({ result, selObject, onReset }) {
  const hasErrors = result.errors?.length > 0;
  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${result.success ? C.green : C.red}30`, padding: "32px", textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        background: result.success ? `${C.green}15` : `${C.red}15`, margin: "0 auto 16px",
      }}>
        <Ic n={result.success ? "check" : "alert"} s={28} c={result.success ? C.green : C.red} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.text1, marginBottom: 8 }}>
        Import {result.success ? "Complete" : "Failed"}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Created", value: result.created, color: C.green },
          { label: "Updated", value: result.updated, color: C.accent },
          { label: "Merged", value: result.merged, color: C.purple },
          { label: "Skipped", value: result.skipped, color: C.amber },
          { label: "Errors", value: result.errors?.length || 0, color: C.red },
        ].filter(s => s.value > 0).map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.text3 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {hasErrors && (
        <div style={{ background: `${C.red}08`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, textAlign: "left", maxHeight: 160, overflowY: "auto" }}>
          {result.errors.slice(0, 20).map((e, i) => (
            <div key={i} style={{ fontSize: 11, color: C.red, marginBottom: 4 }}>Row {e.row}: {e.error}</div>
          ))}
        </div>
      )}
      <Btn variant="primary" onClick={onReset} style={{ margin: "0 auto" }}>
        <Ic n="upload" s={14} c="white" /> Import another file
      </Btn>
    </div>
  );
}

// ── History View ──────────────────────────────────────────────────────────────
function HistoryView({ history, objects, onDelete }) {
  if (!history.length) {
    return (
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 48, textAlign: "center" }}>
        <Ic n="clock" s={32} c={C.text4} style={{ margin: "0 auto 12px" }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text1, marginBottom: 4 }}>No imports yet</div>
        <div style={{ fontSize: 13, color: C.text3 }}>Import history will appear here after your first data import.</div>
      </div>
    );
  }

  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
            {["Date", "File", "Object", "Mode", "Created", "Updated", "Merged", "Skipped", "Errors", ""].map(h => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: C.text3, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map(h => {
            const obj = objects.find(o => o.id === h.object_id);
            return (
              <tr key={h.id} style={{ borderBottom: `1px solid ${C.bg}` }}>
                <td style={{ padding: "8px 12px", color: C.text2 }}>{new Date(h.imported_at).toLocaleDateString()} {new Date(h.imported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ padding: "8px 12px", color: C.text1, fontWeight: 600 }}>{h.file_name}</td>
                <td style={{ padding: "8px 12px" }}><Badge color={C.accent}>{obj?.plural_name || h.object_id?.slice(0, 8)}</Badge></td>
                <td style={{ padding: "8px 12px" }}><Badge color={h.mode === 'upsert' ? C.purple : C.green}>{h.mode}</Badge></td>
                <td style={{ padding: "8px 12px", color: C.green, fontWeight: 700 }}>{h.created || 0}</td>
                <td style={{ padding: "8px 12px", color: C.accent, fontWeight: 700 }}>{h.updated || 0}</td>
                <td style={{ padding: "8px 12px", color: C.purple, fontWeight: 700 }}>{h.merged || 0}</td>
                <td style={{ padding: "8px 12px", color: C.amber, fontWeight: 700 }}>{h.skipped || 0}</td>
                <td style={{ padding: "8px 12px", color: h.error_count > 0 ? C.red : C.text4, fontWeight: 700 }}>{h.error_count || 0}</td>
                <td style={{ padding: "8px 12px" }}>
                  <button onClick={() => onDelete(h.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <Ic n="trash" s={13} c={C.text4} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
