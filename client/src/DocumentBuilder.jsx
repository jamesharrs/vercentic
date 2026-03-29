// client/src/DocumentBuilder.jsx — Document Builder & Generator
import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";

const F = "'DM Sans',-apple-system,sans-serif";
const C = {
  surface:"var(--t-card,#fff)", surface2:"var(--t-surface2,#f8fafc)",
  border:"var(--t-border,#E5E7EB)", text1:"var(--t-text1,#111827)",
  text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9CA3AF)",
  accent:"var(--t-accent,#4361EE)", accentLight:"var(--t-accent-light,#EEF2FF)",
  green:"#0CAF77", red:"#EF4444", amber:"#F59E0B", purple:"#7C3AED",
};
const inp = { padding:"8px 12px", borderRadius:8, border:`1.5px solid ${C.border}`,
  fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:C.surface,
  width:"100%", boxSizing:"border-box" };
const lbl = { fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4,
  letterSpacing:"0.04em", textTransform:"uppercase" };
const CAT_COLORS = { Recruitment:C.accent, Legal:"#7c3aed", HR:C.green, Finance:C.amber, General:C.text3 };

function RenderDoc({ markdown }) {
  const html = (markdown||"")
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/^### (.+)/gm,'<h3 style="font-size:14px;margin:12px 0 6px;color:#111">$1</h3>')
    .replace(/^## (.+)/gm,'<h2 style="font-size:16px;margin:16px 0 8px;color:#111">$1</h2>')
    .replace(/^# (.+)/gm,'<h1 style="font-size:20px;margin:20px 0 10px;color:#111">$1</h1>')
    .replace(/^- (.+)/gm,'<li style="margin:3px 0">$1</li>')
    .replace(/---/g,'<hr style="border:none;border-top:1px solid #E5E7EB;margin:16px 0"/>')
    .replace(/\n\n/g,'<br/><br/>').replace(/\n/g,'<br/>');
  return <div style={{ fontSize:13, lineHeight:1.75, color:C.text1, fontFamily:"Georgia,serif" }}
    dangerouslySetInnerHTML={{ __html:html }}/>;
}

function VarInput({ variable, value, onChange }) {
  const { key, label, type, required, options } = variable;
  return (
    <div style={{ marginBottom:12 }}>
      <label style={lbl}>{label}{required&&<span style={{ color:C.red }}> *</span>}</label>
      {type==="select"?(
        <select style={inp} value={value||""} onChange={e=>onChange(key,e.target.value)}>
          <option value="">— select —</option>
          {(options||[]).map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ):type==="boolean"?(
        <div style={{ display:"flex",gap:8 }}>
          {["Yes","No"].map(o=>(
            <button key={o} onClick={()=>onChange(key,o==="Yes"?"true":"false")}
              style={{ flex:1, padding:"7px", borderRadius:8,
                border:`1.5px solid ${(value==="true")===(o==="Yes")?C.accent:C.border}`,
                background:(value==="true")===(o==="Yes")?C.accentLight:C.surface,
                color:(value==="true")===(o==="Yes")?C.accent:C.text2,
                fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
              {o}
            </button>
          ))}
        </div>
      ):type==="date"?(
        <input type="date" style={inp} value={value||""} onChange={e=>onChange(key,e.target.value)}/>
      ):type==="number"?(
        <input type="number" style={inp} value={value||""} onChange={e=>onChange(key,e.target.value)}/>
      ):(
        <input type="text" style={inp} value={value||""} onChange={e=>onChange(key,e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}…`}/>
      )}
    </div>
  );
}

function TemplateCard({ tmpl, onUse, onEdit, onDelete }) {
  const catColor = CAT_COLORS[tmpl.category]||C.text3;
  return (
    <div style={{ borderRadius:14, border:`1.5px solid ${C.border}`, background:C.surface,
      overflow:"hidden", transition:"all .15s" }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)";e.currentTarget.style.borderColor=`${catColor}40`;}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.border;}}>
      <div style={{ height:4, background:`linear-gradient(90deg,${catColor},${catColor}80)` }}/>
      <div style={{ padding:"16px 18px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
          <span style={{ fontSize:28 }}>{tmpl.icon||"📄"}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:C.text1, marginBottom:4 }}>{tmpl.name}</div>
            <span style={{ fontSize:10, padding:"2px 8px", borderRadius:99,
              background:`${catColor}15`, color:catColor, fontWeight:700 }}>{tmpl.category}</span>
          </div>
        </div>
        {tmpl.description&&<p style={{ margin:"0 0 12px", fontSize:12, color:C.text3, lineHeight:1.5 }}>{tmpl.description}</p>}
        <div style={{ fontSize:11, color:C.text3, marginBottom:14 }}>
          {(tmpl.variables||[]).length} variable{(tmpl.variables||[]).length!==1?"s":""}
          {tmpl.is_system&&" · System"}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>onUse(tmpl)} style={{ flex:2, padding:"8px", borderRadius:9,
            border:"none", background:C.accent, color:"#fff", cursor:"pointer",
            fontSize:12, fontWeight:700, fontFamily:F }}>Use Template</button>
          {!tmpl.is_system&&<>
            <button onClick={()=>onEdit(tmpl)} style={{ width:34, height:34, borderRadius:9,
              border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✎</button>
            <button onClick={()=>onDelete(tmpl.id)} style={{ width:34, height:34, borderRadius:9,
              border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🗑</button>
          </>}
        </div>
      </div>
    </div>
  );
}

function GeneratorModal({ template, environment, onClose, onGenerated }) {
  const [vars,        setVars]        = useState({});
  const [preview,     setPreview]     = useState("");
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [tab,         setTab]         = useState("fill");
  const [docTitle,    setDocTitle]    = useState(`${template.name} — ${new Date().toLocaleDateString()}`);

  const setVar = (key, val) => setVars(v=>({...v,[key]:val}));

  const loadPreview = useCallback(async () => {
    setLoadingPrev(true);
    try {
      const r = await api.post(`/documents/templates/${template.id}/preview`, { variables: vars });
      setPreview(r.rendered||"");
    } catch {}
    setLoadingPrev(false);
  }, [template.id, vars]);

  useEffect(() => { if (tab==="preview") loadPreview(); }, [tab, loadPreview]);

  const aiGenerate = async () => {
    setAiLoading(true);
    try {
      const r = await api.post(`/documents/ai-generate`, { template_id:template.id, variables:vars });
      setPreview(r.body||""); setTab("preview");
    } catch (e) { alert(e.message); }
    setAiLoading(false);
  };

  const generate = async () => {
    const missing = (template.variables||[]).filter(v=>v.required&&!vars[v.key]);
    if (missing.length) { alert(`Please fill in: ${missing.map(v=>v.label).join(", ")}`); return; }
    setGenerating(true);
    try {
      const doc = await api.post(`/documents/generate`, {
        template_id:template.id, variables:vars, title:docTitle,
        rendered_body:preview||undefined,
      });
      onGenerated(doc); onClose();
    } catch (e) { alert(e.message); }
    setGenerating(false);
  };

  const printPreview = () => {
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>${docTitle}</title><style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:20px;line-height:1.8}strong{font-weight:bold}h1,h2,h3{color:#111}hr{border:none;border-top:1px solid #ccc;margin:20px 0}</style></head><body>${preview.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br/>')}</body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.5)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface,borderRadius:16,width:"100%",maxWidth:900,
        height:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 80px rgba(0,0,0,.25)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"16px 24px",
          borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
          <span style={{ fontSize:24 }}>{template.icon||"📄"}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15,fontWeight:800,color:C.text1 }}>{template.name}</div>
            <input value={docTitle} onChange={e=>setDocTitle(e.target.value)}
              style={{ fontSize:12,color:C.text3,border:"none",background:"transparent",
                outline:"none",fontFamily:F,width:"100%",marginTop:2 }}/>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            {tab==="preview"&&<button onClick={printPreview} style={{ padding:"7px 12px",
              borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",
              fontSize:11,fontWeight:600,color:C.text2,fontFamily:F }}>Print/Export</button>}
            <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,
              border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",
              fontSize:18,color:C.text3 }}>×</button>
          </div>
        </div>
        <div style={{ display:"flex",padding:"8px 24px 0",gap:2,
          borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
          {[["fill","1. Fill Variables"],["preview","2. Preview & Generate"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{ padding:"8px 16px",borderRadius:"8px 8px 0 0",border:"none",cursor:"pointer",
                fontFamily:F,fontSize:12,fontWeight:600,
                background:tab===id?C.surface:C.surface2,color:tab===id?C.text1:C.text3,
                borderBottom:tab===id?`2px solid ${C.accent}`:"2px solid transparent" }}>{label}</button>
          ))}
        </div>
        <div style={{ flex:1,overflowY:"auto",display:"flex" }}>
          {tab==="fill"&&(
            <div style={{ flex:1,padding:"24px" }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px" }}>
                {(template.variables||[]).map(v=>(
                  <VarInput key={v.key} variable={v} value={vars[v.key]||""} onChange={setVar}/>
                ))}
              </div>
              <div style={{ marginTop:16,display:"flex",gap:10 }}>
                <button onClick={aiGenerate} disabled={aiLoading}
                  style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",
                    borderRadius:9,border:`1.5px solid ${C.purple}40`,background:`${C.purple}10`,
                    cursor:aiLoading?"wait":"pointer",fontSize:12,fontWeight:700,
                    color:C.purple,fontFamily:F }}>
                  {aiLoading?"Generating…":"✦ AI-enhance with Vercentic"}
                </button>
                <button onClick={()=>setTab("preview")} style={{ padding:"9px 18px",
                  borderRadius:9,border:"none",background:C.accent,color:"#fff",
                  cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:F }}>Preview →</button>
              </div>
            </div>
          )}
          {tab==="preview"&&(
            <div style={{ flex:1,display:"flex",flexDirection:"column" }}>
              <div style={{ flex:1,overflowY:"auto",padding:"32px 48px",background:"#fff" }}>
                {loadingPrev?<div style={{ padding:40,textAlign:"center",color:C.text3 }}>Rendering…</div>
                :preview?<RenderDoc markdown={preview}/>
                :<div style={{ padding:40,textAlign:"center",color:C.text3 }}>Fill variables first</div>}
              </div>
              <div style={{ padding:"16px 24px",borderTop:`1px solid ${C.border}`,
                display:"flex",gap:10,alignItems:"center",flexShrink:0 }}>
                <button onClick={()=>setTab("fill")} style={{ padding:"9px 16px",
                  borderRadius:9,border:`1px solid ${C.border}`,background:"transparent",
                  cursor:"pointer",fontSize:12,fontFamily:F,color:C.text2 }}>← Back</button>
                <div style={{ flex:1 }}/>
                <button onClick={generate} disabled={generating}
                  style={{ padding:"9px 24px",borderRadius:9,border:"none",
                    background:C.green,color:"#fff",cursor:generating?"wait":"pointer",
                    fontSize:13,fontWeight:800,fontFamily:F }}>
                  {generating?"Creating…":"✓ Create Document"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneratedDocsList() {
  const [docs,    setDocs]    = useState([]);
  const [viewDoc, setViewDoc] = useState(null);
  const STATUS_COLOR = { draft:C.text3, finalised:C.green, signed:C.accent, archived:C.amber };
  useEffect(() => { api.get(`/documents/generated`).then(d=>setDocs(Array.isArray(d)?d:[])).catch(()=>{}); }, []);
  const updateStatus = async (id, status) => {
    await api.patch(`/documents/generated/${id}`, { status });
    setDocs(ds=>ds.map(d=>d.id===id?{...d,status}:d));
  };
  if (!docs.length) return <div style={{ padding:40,textAlign:"center",color:C.text3,fontSize:13,fontFamily:F }}>No documents generated yet.</div>;
  return (
    <div style={{ padding:24 }}>
      {viewDoc&&(
        <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.5)",
          display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}
          onClick={e=>e.target===e.currentTarget&&setViewDoc(null)}>
          <div style={{ background:C.surface,borderRadius:16,width:"100%",maxWidth:720,
            height:"80vh",display:"flex",flexDirection:"column" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"16px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
              <div style={{ fontSize:14,fontWeight:800,color:C.text1 }}>{viewDoc.title}</div>
              <button onClick={()=>setViewDoc(null)} style={{ background:"none",border:"none",
                cursor:"pointer",fontSize:20,color:C.text3 }}>×</button>
            </div>
            <div style={{ flex:1,overflowY:"auto",padding:"32px 48px" }}>
              <RenderDoc markdown={viewDoc.rendered_body}/>
            </div>
          </div>
        </div>
      )}
      <table style={{ width:"100%",borderCollapse:"separate",borderSpacing:"0 6px",fontFamily:F }}>
        <thead><tr>{["Title","Template","Created","Status",""].map(h=>(
          <th key={h} style={{ textAlign:"left",fontSize:10,fontWeight:700,color:C.text3,
            textTransform:"uppercase",letterSpacing:"0.05em",padding:"4px 12px" }}>{h}</th>
        ))}</tr></thead>
        <tbody>
          {docs.map(doc=>(
            <tr key={doc.id}>
              {[
                <span style={{ fontSize:13,fontWeight:600,color:C.text1,cursor:"pointer" }}
                  onClick={()=>setViewDoc(doc)}>{doc.title}</span>,
                <span style={{ fontSize:12,color:C.text3 }}>{doc.template_name}</span>,
                <span style={{ fontSize:12,color:C.text3 }}>{new Date(doc.created_at).toLocaleDateString()}</span>,
                <select value={doc.status} onChange={e=>updateStatus(doc.id,e.target.value)}
                  style={{ padding:"3px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:11,
                    fontFamily:F,color:STATUS_COLOR[doc.status]||C.text3,background:C.surface,cursor:"pointer" }}>
                  {["draft","finalised","signed","archived"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>,
                <button onClick={()=>setViewDoc(doc)} style={{ padding:"4px 8px",borderRadius:6,
                  border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:11,fontFamily:F }}>View</button>,
              ].map((cell,ci)=>(
                <td key={ci} style={{ padding:"10px 12px",background:C.surface,
                  borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,
                  ...(ci===0?{borderLeft:`1px solid ${C.border}`,borderRadius:"10px 0 0 10px"}:
                     ci===4?{borderRight:`1px solid ${C.border}`,borderRadius:"0 10px 10px 0"}:{}) }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocumentBuilder({ environment, session }) {
  const [templates, setTemplates] = useState([]);
  const [tab,       setTab]       = useState("templates");
  const [genModal,  setGenModal]  = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [loading,   setLoading]   = useState(true);
  const envId = environment?.id;

  useEffect(() => {
    if (!envId) return;
    api.get(`/documents/templates?environment_id=${envId}`)
      .then(d=>{ setTemplates(Array.isArray(d)?d:[]); setLoading(false); })
      .catch(()=>setLoading(false));
  }, [envId]);

  const categories = ["all", ...new Set(templates.map(t=>t.category))];
  const filtered = templates.filter(t=>catFilter==="all"||t.category===catFilter);

  return (
    <div style={{ padding:32, fontFamily:F }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
        <div>
          <h2 style={{ margin:"0 0 4px",fontSize:22,fontWeight:800,color:C.text1 }}>Document Builder</h2>
          <p style={{ margin:0,fontSize:13,color:C.text3 }}>
            Create templated documents — offer letters, contracts, correspondence</p>
        </div>
        <button onClick={()=>setEditModal({})} style={{ display:"flex",alignItems:"center",
          gap:7,padding:"9px 18px",borderRadius:10,border:"none",background:C.accent,
          color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:F }}>
          + New Template
        </button>
      </div>
      <div style={{ display:"flex",gap:2,background:C.surface2,borderRadius:10,padding:4,
        marginBottom:20,width:"fit-content",border:`1px solid ${C.border}` }}>
        {[["templates","Templates"],["generated","Generated Docs"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:"7px 20px",borderRadius:8,border:"none",cursor:"pointer",
              fontFamily:F,fontSize:12,fontWeight:600,
              background:tab===id?C.surface:"transparent",color:tab===id?C.text1:C.text3,
              boxShadow:tab===id?"0 1px 4px rgba(0,0,0,.08)":"none" }}>{label}</button>
        ))}
      </div>
      {tab==="templates"&&(
        <>
          <div style={{ display:"flex",gap:6,marginBottom:20,flexWrap:"wrap" }}>
            {categories.map(cat=>(
              <button key={cat} onClick={()=>setCatFilter(cat)}
                style={{ padding:"5px 14px",borderRadius:99,
                  border:`1.5px solid ${catFilter===cat?C.accent:C.border}`,
                  background:catFilter===cat?C.accentLight:"transparent",
                  color:catFilter===cat?C.accent:C.text3,fontSize:12,fontWeight:600,
                  cursor:"pointer",fontFamily:F }}>
                {cat==="all"?"All categories":cat}
              </button>
            ))}
          </div>
          {loading?<div style={{ padding:60,textAlign:"center",color:C.text3 }}>Loading…</div>
          :<div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16 }}>
            {filtered.map(t=>(
              <TemplateCard key={t.id} tmpl={t}
                onUse={tmpl=>setGenModal(tmpl)}
                onEdit={tmpl=>setEditModal(tmpl)}
                onDelete={async id=>{
                  if(confirm("Delete this template?")) {
                    await api.delete(`/documents/templates/${id}`);
                    setTemplates(ts=>ts.filter(t=>t.id!==id));
                  }
                }}/>
            ))}
          </div>}
        </>
      )}
      {tab==="generated"&&<GeneratedDocsList/>}
      {genModal&&<GeneratorModal template={genModal} environment={environment}
        onClose={()=>setGenModal(null)} onGenerated={()=>setTab("generated")}/>}
    </div>
  );
}
