// client/src/settings/CompanyDocuments.jsx — Document management with visibility control
import { useState, useEffect, useCallback, useRef } from "react";

const F = "'Geist', -apple-system, sans-serif";
const C = { accent:'#4361EE', accentLight:'#EEF2FF', text1:'#111827', text2:'#374151', text3:'#6B7280', border:'#E5E7EB', green:'#0CA678', amber:'#F59F00', red:'#EF4444', surface:'#FAFBFD' };
const api = {
  get: u => fetch(`/api${u}`).then(r=>r.json()),
  post: (u,b) => fetch(`/api${u}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch: (u,b) => fetch(`/api${u}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  delete: u => fetch(`/api${u}`,{method:'DELETE'}).then(r=>r.json()),
  upload: (u,fd) => fetch(`/api${u}`,{method:'POST',body:fd}).then(r=>r.json()),
};

const PATHS = { plus:'M12 5v14M5 12h14', trash:'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', x:'M18 6L6 18M6 6l12 12',
  search:'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z', upload:'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  file:'M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z', eye:'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
  lock:'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
  globe:'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
  users:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 3a4 4 0 110 8 4 4 0 010-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  edit:'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  chevD:'M6 9l6 6 6-6', check:'M20 6L9 17l-5-5',
};
function Ic({n,s=16,c=C.text3,style={}}){return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={PATHS[n]||''}/></svg>;}

const VIS = {
  internal: { label:'Internal Only', icon:'lock', color:'#EF4444', bg:'#FEF2F2', desc:'Salary bands, scoring rubrics, internal policies' },
  candidate: { label:'Candidate-Safe', icon:'users', color:'#F59F00', bg:'#FFFBEB', desc:'Benefits, culture, process info — safe for candidates' },
  public: { label:'Public', icon:'globe', color:'#0CA678', bg:'#F0FDF4', desc:'Press releases, brand materials, job descriptions' },
};
const CATS = ['Company Overview','Benefits & Perks','Culture & Values','Hiring Process','Policies','Brand Guidelines','Job Descriptions','Salary & Compensation','Interview Guides','Onboarding','Training','Other'];

function VisBadge({vis, size='sm'}) {
  const v = VIS[vis] || VIS.internal;
  const p = size==='sm' ? '2px 8px' : '4px 12px';
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:p,borderRadius:99,fontSize:size==='sm'?10:12,fontWeight:700,background:v.bg,color:v.color,fontFamily:F}}>
    <Ic n={v.icon} s={size==='sm'?10:12} c={v.color}/>{v.label}
  </span>;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

export default function CompanyDocuments({ environment }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVis, setFilterVis] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileRef = useRef(null);
  const envId = environment?.id;

  const load = useCallback(async () => {
    if (!envId) return;
    setLoading(true);
    const data = await api.get(`/company-documents?environment_id=${envId}`);
    setDocs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [envId]);
  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('environment_id', envId);
    fd.append('name', file.name.replace(/\.[^.]+$/, ''));
    fd.append('category', 'Other');
    fd.append('visibility', 'internal');
    await api.upload('/company-documents', fd);
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
    setShowUpload(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    await api.delete(`/company-documents/${id}`);
    load();
  };

  const handleUpdate = async (id, updates) => {
    await api.patch(`/company-documents/${id}`, updates);
    setEditDoc(null);
    load();
  };

  const filtered = docs.filter(d => {
    if (filterVis !== 'all' && d.visibility !== filterVis) return false;
    if (filterCat !== 'all' && d.category !== filterCat) return false;
    if (search) { const q = search.toLowerCase(); return (d.name||'').toLowerCase().includes(q) || (d.category||'').toLowerCase().includes(q); }
    return true;
  });

  const counts = { internal: docs.filter(d=>d.visibility==='internal').length, candidate: docs.filter(d=>d.visibility==='candidate').length, public: docs.filter(d=>d.visibility==='public').length };
  const inp = { fontFamily:F, fontSize:13, padding:'8px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, outline:'none', width:'100%', boxSizing:'border-box', color:C.text1 };

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:800,color:C.text1,margin:'0 0 4px',fontFamily:F}}>Company Documents</h2>
          <p style={{fontSize:13,color:C.text3,margin:0}}>Upload company knowledge that the Copilot can search and reference. Control what's visible to candidates vs internal users.</p>
        </div>
        <button onClick={()=>{ setShowUpload(true); setTimeout(()=>fileRef.current?.click(), 100); }}
          style={{padding:'9px 18px',borderRadius:10,border:'none',background:C.accent,color:'white',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <Ic n="upload" s={14} c="white"/> Upload Document
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md,.csv" onChange={handleUpload} style={{display:'none'}}/>
      </div>

      {/* Visibility stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {Object.entries(VIS).map(([key,v]) => (
          <div key={key} onClick={()=>setFilterVis(filterVis===key?'all':key)}
            style={{padding:'14px 16px',borderRadius:12,border:`1.5px solid ${filterVis===key?v.color:C.border}`,
              background:filterVis===key?v.bg:'white',cursor:'pointer',transition:'all .15s'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <Ic n={v.icon} s={16} c={v.color}/>
                <span style={{fontSize:13,fontWeight:700,color:v.color,fontFamily:F}}>{v.label}</span>
              </div>
              <span style={{fontSize:20,fontWeight:800,color:v.color,fontFamily:F}}>{counts[key]}</span>
            </div>
            <div style={{fontSize:11,color:C.text3,marginTop:4}}>{v.desc}</div>
          </div>
        ))}
      </div>

      {/* Search + category filter */}
      <div style={{display:'flex',gap:10,marginBottom:16}}>
        <div style={{flex:1,position:'relative'}}>
          <Ic n="search" s={14} c={C.text3} style={{position:'absolute',left:10,top:10,pointerEvents:'none'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents..."
            style={{...inp,paddingLeft:32}}/>
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...inp,width:180}}>
          <option value="all">All categories</option>
          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Upload indicator */}
      {uploading && <div style={{padding:'12px 16px',borderRadius:10,background:C.accentLight,color:C.accent,fontSize:13,fontWeight:600,marginBottom:12,fontFamily:F,display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:16,height:16,border:`2px solid ${C.accent}`,borderTop:'2px solid transparent',borderRadius:'50%',animation:'spin .6s linear infinite'}}/> Processing document...
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>}

      {/* Empty state */}
      {!loading && docs.length === 0 && (
        <div style={{textAlign:'center',padding:'60px 24px',borderRadius:16,border:`2px dashed ${C.border}`,background:C.surface}}>
          <div style={{width:56,height:56,borderRadius:16,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
            <Ic n="file" s={24} c={C.accent}/>
          </div>
          <div style={{fontSize:16,fontWeight:700,color:C.text1,marginBottom:6}}>No documents yet</div>
          <p style={{fontSize:13,color:C.text3,margin:'0 0 16px',maxWidth:360,marginLeft:'auto',marginRight:'auto',lineHeight:1.6}}>
            Upload company documents like benefits guides, culture handbooks, and policies. The Copilot will search these when writing content or answering questions.
          </p>
        </div>
      )}

      {/* Document list */}
      {filtered.length > 0 && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map(doc => (
            <div key={doc.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:12,
              border:`1.5px solid ${C.border}`,background:'white',transition:'all .12s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent+'60';e.currentTarget.style.boxShadow=`0 2px 8px ${C.accent}10`}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow='none'}}>
              {/* Icon */}
              <div style={{width:40,height:40,borderRadius:10,background:VIS[doc.visibility]?.bg||C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Ic n="file" s={18} c={VIS[doc.visibility]?.color||C.accent}/>
              </div>
              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.text1,fontFamily:F,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.name}</span>
                  <VisBadge vis={doc.visibility}/>
                </div>
                <div style={{fontSize:12,color:C.text3,display:'flex',gap:12}}>
                  <span>{doc.category}</span>
                  <span>{formatSize(doc.file_size)}</span>
                  <span>{doc.word_count?.toLocaleString()||0} words</span>
                  <span>{doc.chunk_count||0} chunks</span>
                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {/* Actions */}
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>setEditDoc(doc)} title="Edit"
                  style={{padding:'6px 8px',borderRadius:6,border:`1px solid ${C.border}`,background:'white',cursor:'pointer'}}>
                  <Ic n="edit" s={13} c={C.text3}/>
                </button>
                <button onClick={()=>handleDelete(doc.id)} title="Delete"
                  style={{padding:'6px 8px',borderRadius:6,border:'1px solid #FECACA',background:'#FEF2F2',cursor:'pointer'}}>
                  <Ic n="trash" s={13} c={C.red}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && filtered.length===0 && docs.length>0 && (
        <div style={{textAlign:'center',padding:'40px',color:C.text3,fontSize:13}}>No documents match your filters.</div>
      )}

      {/* Edit modal */}
      {editDoc && (
        <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.35)'}}
          onClick={()=>setEditDoc(null)}>
          <div style={{background:'white',borderRadius:16,width:480,maxHeight:'80vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:15,fontWeight:700,color:C.text1,fontFamily:F}}>Edit Document</span>
              <button onClick={()=>setEditDoc(null)} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="x" s={16}/></button>
            </div>
            <EditDocForm doc={editDoc} onSave={handleUpdate} onCancel={()=>setEditDoc(null)}/>
          </div>
        </div>
      )}
    </div>
  );
}

function EditDocForm({ doc, onSave, onCancel }) {
  const [name, setName] = useState(doc.name || '');
  const [category, setCategory] = useState(doc.category || 'Other');
  const [visibility, setVisibility] = useState(doc.visibility || 'internal');
  const [description, setDescription] = useState(doc.description || '');
  const [saving, setSaving] = useState(false);
  const inp = { fontFamily:F, fontSize:13, padding:'8px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, outline:'none', width:'100%', boxSizing:'border-box', color:C.text1 };
  const lbl = (t) => <div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:4,fontFamily:F}}>{t}</div>;

  const save = async () => {
    setSaving(true);
    await onSave(doc.id, { name, category, visibility, description });
    setSaving(false);
  };

  return (
    <div style={{padding:'20px'}}>
      <div style={{marginBottom:14}}>{lbl("Document name")}<input value={name} onChange={e=>setName(e.target.value)} style={inp}/></div>
      <div style={{marginBottom:14}}>{lbl("Category")}
        <select value={category} onChange={e=>setCategory(e.target.value)} style={inp}>
          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{marginBottom:14}}>{lbl("Description")}<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} placeholder="What is this document about?" style={{...inp,resize:'vertical'}}/></div>
      <div style={{marginBottom:18}}>
        {lbl("Visibility")}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {Object.entries(VIS).map(([key,v]) => (
            <label key={key} onClick={()=>setVisibility(key)}
              style={{display:'flex',gap:12,padding:'10px 14px',borderRadius:10,
                border:`1.5px solid ${visibility===key?v.color:C.border}`,
                background:visibility===key?v.bg:'transparent',cursor:'pointer',transition:'all .15s'}}>
              <div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${visibility===key?v.color:C.border}`,flexShrink:0,marginTop:1,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                {visibility===key && <div style={{width:10,height:10,borderRadius:'50%',background:v.color}}/>}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:v.color,display:'flex',alignItems:'center',gap:6}}>
                  <Ic n={v.icon} s={13} c={v.color}/>{v.label}
                </div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>{v.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button onClick={onCancel} style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border}`,background:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F,color:C.text2}}>Cancel</button>
        <button onClick={save} disabled={saving} style={{padding:'8px 16px',borderRadius:8,border:'none',background:C.accent,color:'white',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:F,opacity:saving?0.6:1}}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
