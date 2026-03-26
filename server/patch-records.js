const fs = require('fs');

let rec = fs.readFileSync('client/src/Records.jsx', 'utf8');

// 1. Add MatchingEngine import at top
if (!rec.includes('MatchingEngine')) {
  rec = rec.replace(
    'import { useState, useEffect, useCallback, useRef } from "react";',
    'import { useState, useEffect, useCallback, useRef } from "react";\nimport { MatchingEngine } from "./AI.jsx";'
  );
  console.log('✅ Added MatchingEngine import');
}

// 2. Add CSV helpers after the api object
const CSV_HELPERS = `
/* ─── CSV helpers ────────────────────────────────────────────────────────────── */
const downloadCSV = async (objectId, environmentId, objectSlug) => {
  const url = \`/api/csv/export?object_id=\${objectId}&environment_id=\${environmentId}\`;
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = \`\${objectSlug}-export.csv\`;
  a.click();
};

const downloadTemplate = async (objectId, objectSlug) => {
  const url = \`/api/csv/template?object_id=\${objectId}\`;
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = \`\${objectSlug}-template.csv\`;
  a.click();
};

const importCSV = async (objectId, environmentId, file, mode='create') => {
  const text = await file.text();
  const res = await fetch(\`/api/csv/import?object_id=\${objectId}&environment_id=\${environmentId}&mode=\${mode}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: text,
  });
  return res.json();
};
`;

if (!rec.includes('downloadCSV')) {
  // Insert after the api object definition
  rec = rec.replace(
    '\nconst Ic = ',
    CSV_HELPERS + '\nconst Ic = '
  );
  console.log('✅ Added CSV helpers');
}

// 3. Add CSV import modal component before RecordsView export
const CSV_MODAL = `
/* ─── CSV Import Modal ───────────────────────────────────────────────────────── */
const CSVImportModal = ({ object, environment, onClose, onDone }) => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('create');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!file) return;
    setLoading(true);
    const r = await importCSV(object.id, environment.id, file, mode);
    setResult(r);
    setLoading(false);
    if (r.success) onDone();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", width:440, fontFamily:"'DM Sans',sans-serif", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:17, fontWeight:800, color:"#111827", marginBottom:4 }}>Import CSV</div>
        <div style={{ fontSize:12, color:"#9ca3af", marginBottom:20 }}>Import {object.plural_name} from a CSV file</div>

        {!result ? <>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#4b5563", display:"block", marginBottom:6 }}>Import Mode</label>
            <div style={{ display:"flex", gap:8 }}>
              {[{v:"create",l:"Create new records"},{v:"upsert",l:"Update existing + create new"}].map(({v,l}) => (
                <button key={v} onClick={()=>setMode(v)}
                  style={{ flex:1, padding:"8px 10px", borderRadius:8, border:\`1.5px solid \${mode===v?"#3b5bdb":"#e8eaed"}\`, background:mode===v?"#eef1ff":"transparent", color:mode===v?"#3b5bdb":"#4b5563", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#4b5563", display:"block", marginBottom:6 }}>Select File</label>
            <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])}
              style={{ width:"100%", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}/>
          </div>

          <div style={{ marginBottom:20 }}>
            <button onClick={()=>downloadTemplate(object.id, object.slug)}
              style={{ fontSize:12, color:"#3b5bdb", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", fontFamily:"'DM Sans',sans-serif", padding:0 }}>
              Download template CSV
            </button>
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #e8eaed", background:"white", color:"#4b5563", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
            <button onClick={handle} disabled={!file||loading}
              style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#3b5bdb", color:"white", fontSize:13, fontWeight:600, cursor:!file||loading?"not-allowed":"pointer", opacity:!file||loading?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
              {loading?"Importing…":"Import"}
            </button>
          </div>
        </> : (
          <div>
            <div style={{ background:result.success?"#f0fdf4":"#fef2f2", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:result.success?"#166534":"#991b1b", marginBottom:8 }}>
                {result.success?"Import complete":"Import failed"}
              </div>
              <div style={{ fontSize:12, color:"#374151" }}>
                ✅ {result.created} created · ✏️ {result.updated} updated · ⏭️ {result.skipped} skipped
              </div>
              {result.errors?.length > 0 && (
                <div style={{ marginTop:8, fontSize:11, color:"#991b1b" }}>
                  {result.errors.slice(0,3).map((e,i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ width:"100%", padding:"9px", borderRadius:8, border:"none", background:"#3b5bdb", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
};
`;

if (!rec.includes('CSVImportModal')) {
  rec = rec.replace(
    'export default function RecordsView',
    CSV_MODAL + '\nexport default function RecordsView'
  );
  console.log('✅ Added CSVImportModal component');
}

// 4. Add showImport state and AI matching tab to RecordsView
if (!rec.includes('showImport')) {
  rec = rec.replace(
    'const [page, setPage]         = useState(1);',
    `const [page, setPage]         = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab]   = useState("records"); // "records" | "matching"`
  );
  console.log('✅ Added import state and tab state');
}

// 5. Add tab bar and CSV buttons to toolbar, replace the single return block
const OLD_TOOLBAR_END = `        <Btn icon="plus" onClick={()=>setShowForm(true)}>New {object.name}</Btn>
      </div>`;

const NEW_TOOLBAR_END = `        {/* CSV */}
        <button onClick={()=>downloadCSV(object.id, environment.id, object.slug)}
          style={{ padding:"7px 11px", borderRadius:8, border:\`1px solid \${C.border}\`, background:C.surface, color:C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", gap:5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Export
        </button>
        <button onClick={()=>setShowImport(true)}
          style={{ padding:"7px 11px", borderRadius:8, border:\`1px solid \${C.border}\`, background:C.surface, color:C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", gap:5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          Import
        </button>
        <Btn icon="plus" onClick={()=>setShowForm(true)}>New {object.name}</Btn>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:0, marginBottom:16, borderBottom:\`1px solid \${C.border}\` }}>
        {[{id:"records",label:"Records"},{id:"matching",label:"⚡ AI Matching"}].map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{ padding:"9px 16px", border:"none", background:"transparent", cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:activeTab===t.id?700:500, color:activeTab===t.id?C.accent:C.text3, borderBottom:\`2px solid \${activeTab===t.id?C.accent:"transparent"}\`, transition:"all .12s" }}>
            {t.label}
          </button>
        ))}
      </div>`;

if (!rec.includes('activeTab')) {
  rec = rec.replace(OLD_TOOLBAR_END, NEW_TOOLBAR_END);
  console.log('✅ Added CSV buttons and tab bar');
}

// 6. Wrap Content section in tab conditional
const OLD_CONTENT_START = `      {/* Content */}
      <div style={{ flex:1, background:C.surface, borderRadius:14, border:\`1px solid \${C.border}\`, overflow:"hidden" }}>`;

const NEW_CONTENT_START = `      {/* AI Matching tab */}
      {activeTab === "matching" && (
        <MatchingEngine environment={environment} initialObject={object}/>
      )}

      {/* Records tab */}
      {activeTab === "records" && <>
      {/* Content */}
      <div style={{ flex:1, background:C.surface, borderRadius:14, border:\`1px solid \${C.border}\`, overflow:"hidden" }}>`;

if (!rec.includes('activeTab === "matching"')) {
  rec = rec.replace(OLD_CONTENT_START, NEW_CONTENT_START);
  console.log('✅ Wrapped content in tab conditional');
}

// 7. Close the records tab conditional before detail panel
const OLD_DETAIL = `      {/* Detail panel */}
      {selected && (`;

const NEW_DETAIL = `      </>}

      {/* Detail panel */}
      {selected && (`;

if (rec.includes(OLD_DETAIL) && !rec.includes('</>}')) {
  rec = rec.replace(OLD_DETAIL, NEW_DETAIL);
  console.log('✅ Closed records tab wrapper');
}

// 8. Add CSVImportModal to render
const OLD_EDIT_MODAL = `      {/* Edit form */}
      {editRecord && (
        <RecordFormModal fields={fields} record={editRecord} objectName={object.name} onSave={handleUpdate} onClose={()=>setEditRecord(null)}/>
      )}
    </div>
  );
}`;

const NEW_EDIT_MODAL = `      {/* Edit form */}
      {editRecord && (
        <RecordFormModal fields={fields} record={editRecord} objectName={object.name} onSave={handleUpdate} onClose={()=>setEditRecord(null)}/>
      )}

      {/* CSV Import */}
      {showImport && (
        <CSVImportModal object={object} environment={environment} onClose={()=>setShowImport(false)} onDone={()=>{ setShowImport(false); load(); }}/>
      )}
    </div>
  );
}`;

if (!rec.includes('CSVImportModal object=')) {
  rec = rec.replace(OLD_EDIT_MODAL, NEW_EDIT_MODAL);
  console.log('✅ Added CSVImportModal to render');
}

fs.writeFileSync('client/src/Records.jsx', rec);
console.log('\n✅ Records.jsx patched with AI Matching tab + CSV import/export');
