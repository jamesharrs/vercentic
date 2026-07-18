// CSVImportModal.jsx — extracted from Records.jsx
import React, { useState } from 'react';
import { importCSV, downloadTemplate } from './RecordShared.jsx';

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
                  style={{ flex:1, padding:"8px 10px", borderRadius:8, border:`1.5px solid ${mode===v?"#3b5bdb":"#e8eaed"}`, background:mode===v?"#eef1ff":"transparent", color:mode===v?"#3b5bdb":"#4b5563", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
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

// Builds a plain-text list summary for the copilot


export default CSVImportModal;
