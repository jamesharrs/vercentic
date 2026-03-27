import { useState, useEffect } from "react";

const F = "'Geist', -apple-system, sans-serif";
const C = {
  text1:"#111827", text2:"#374151", text3:"#9CA3AF", border:"#E5E7EB",
  accent:"#4361EE", accentLight:"#EEF2FF", surface:"#FFFFFF", surface2:"#F9FAFB",
  green:"#0CAF77", red:"#EF4444", amber:"#F79009", purple:"#7C3AED",
};

import api from '../apiClient.js';






const TYPE_COLORS = ['#4361EE','#0CAF77','#F79009','#7C3AED','#EF4444','#0891B2','#EC4899','#9DA8C7'];
const TYPE_ICONS  = [{slug:'file-text',label:'Document'},{slug:'shield',label:'Shield'},{slug:'credit-card',label:'ID Card'},{slug:'award',label:'Award'},{slug:'file',label:'File'},{slug:'layers',label:'Layers'},{slug:'paperclip',label:'Paperclip'},{slug:'image',label:'Image'}];
const FORMAT_OPTIONS = ['pdf','docx','doc','jpg','jpeg','png','gif','zip','xlsx','txt'];

const PATHS = {
  'file-text':"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  'credit-card':"M1 4h22v16H1zM1 10h22",
  award:"M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  file:"M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7",
  layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  paperclip:"M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
  image:"M21 3H3v18h18V3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21",
  plus:"M12 5v14M5 12h14", trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  x:"M18 6L6 18M6 6l12 12",
};

const Ic = ({n,s=14,c='currentColor'}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]||PATHS.file}/>
  </svg>
);

const Btn = ({children,onClick,v='primary',sz='md',disabled,style={}}) => {
  const sz2={sm:{padding:'5px 10px',fontSize:11},md:{padding:'8px 16px',fontSize:13}};
  const vars={primary:{background:C.accent,color:'#fff',border:'none'},secondary:{background:C.surface2,color:C.text2,border:`1px solid ${C.border}`},danger:{background:'#FEF2F2',color:C.red,border:`1px solid ${C.red}30`},ghost:{background:'transparent',color:C.text2,border:`1px solid ${C.border}`}};
  return <button onClick={onClick} disabled={disabled} style={{display:'flex',alignItems:'center',gap:6,borderRadius:8,fontFamily:F,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,transition:'all .12s',...sz2[sz],...vars[v],...style}}>{children}</button>;
};

const inpSt = {width:'100%',padding:'8px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,outline:'none',boxSizing:'border-box',background:C.surface};
const lblSt = {fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5};

const MappingRow = ({mapping,index,objectFields,onUpdate,onRemove}) => (
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 2fr auto',gap:8,alignItems:'center',padding:'8px 12px',background:C.surface2,borderRadius:8,border:`1px solid ${C.border}`,marginBottom:6}}>
    <div>
      <div style={{fontSize:10,fontWeight:700,color:C.text3,marginBottom:3}}>EXTRACTED KEY</div>
      <input value={mapping.extracted_key} onChange={e=>onUpdate(index,'extracted_key',e.target.value)} placeholder="e.g. full_name" style={{...inpSt,fontSize:12,padding:'6px 8px'}}/>
    </div>
    <div>
      <div style={{fontSize:10,fontWeight:700,color:C.text3,marginBottom:3}}>MAPS TO FIELD</div>
      <select value={mapping.field_api_key} onChange={e=>{const f=objectFields.find(f=>f.api_key===e.target.value);onUpdate(index,'field_api_key',e.target.value);if(f)onUpdate(index,'field_label',f.name);}} style={{...inpSt,fontSize:12,padding:'6px 8px'}}>
        <option value="">— not mapped —</option>
        {objectFields.map(f=><option key={f.id} value={f.api_key}>{f.name} ({f.api_key})</option>)}
      </select>
    </div>
    <div>
      <div style={{fontSize:10,fontWeight:700,color:C.text3,marginBottom:3}}>EXTRACTION HINT</div>
      <input value={mapping.description||''} onChange={e=>onUpdate(index,'description',e.target.value)} placeholder="e.g. Full legal name as printed on the document" style={{...inpSt,fontSize:12,padding:'6px 8px'}}/>
    </div>
    <button onClick={()=>onRemove(index)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,padding:4,marginTop:12}}><Ic n="x" s={14}/></button>
  </div>
);

const FileTypeFormModal = ({fileType,allObjects,environment,onSave,onClose}) => {
  const [form,setForm] = useState({
    name:fileType?.name||'', slug:fileType?.slug||'', icon:fileType?.icon||'file', color:fileType?.color||'#4361EE',
    parse_cv:fileType?.parse_cv||false, extract_enabled:fileType?.extract_enabled||false,
    extract_object_id:fileType?.extract_object_id||'',
    allowed_formats:fileType?.allowed_formats||['pdf','jpg','png'], max_size_mb:fileType?.max_size_mb||10,
    applies_to:fileType?.applies_to||['people'], mappings:fileType?.mappings||[],
  });
  const [objectFields,setObjectFields] = useState([]);
  const [saving,setSaving] = useState(false);
  const [tab,setTab] = useState('details');
  const isEdit = !!fileType?.id;

  useEffect(()=>{
    if(form.extract_object_id&&environment?.id){
      api.get(`/fields?object_id=${form.extract_object_id}&environment_id=${environment.id}`)
        .then(d=>setObjectFields(Array.isArray(d)?d.filter(f=>!f.deleted_at):[]))
        .catch(()=>{});
    }
  },[form.extract_object_id,environment?.id]);

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const addMapping=()=>setForm(f=>({...f,mappings:[...f.mappings,{extracted_key:'',field_api_key:'',field_label:'',description:''}]}));
  const updateMapping=(i,k,v)=>setForm(f=>{const m=[...f.mappings];m[i]={...m[i],[k]:v};return{...f,mappings:m};});
  const removeMapping=(i)=>setForm(f=>({...f,mappings:f.mappings.filter((_,idx)=>idx!==i)}));
  const toggleFormat=(fmt)=>set('allowed_formats',form.allowed_formats.includes(fmt)?form.allowed_formats.filter(f=>f!==fmt):[...form.allowed_formats,fmt]);
  const handleSave=async()=>{if(!form.name.trim())return window.__toast?.alert('Name is required');setSaving(true);await onSave({...form,slug:form.slug||form.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')});setSaving(false);};
  const TAB=id=>({padding:'7px 14px',border:'none',borderRadius:7,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',background:tab===id?C.accent:'transparent',color:tab===id?'#fff':C.text2});

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:C.surface,borderRadius:16,width:'100%',maxWidth:680,maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.2)',overflow:'hidden',fontFamily:F}}>
        <div style={{padding:'18px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:16,fontWeight:800,color:C.text1}}>{isEdit?`Edit: ${fileType.name}`:'New File Type'}</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:20}}>×</button>
        </div>
        <div style={{padding:'10px 24px 0',borderBottom:`1px solid ${C.border}`,display:'flex',gap:4,background:C.surface2}}>
          {[['details','Details'],['formats','Formats'],['mappings','Field Mappings']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={TAB(id)}>{label}</button>
          ))}
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
          {tab==='details' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <div style={{gridColumn:'1/-1'}}><label style={lblSt}>Name *</label><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Passport" style={inpSt}/></div>
              <div><label style={lblSt}>Slug</label><input value={form.slug} onChange={e=>set('slug',e.target.value)} placeholder="e.g. passport" style={inpSt}/></div>
              <div><label style={lblSt}>Max Size (MB)</label><input type="number" value={form.max_size_mb} onChange={e=>set('max_size_mb',Number(e.target.value))} style={inpSt}/></div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lblSt}>Colour</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {TYPE_COLORS.map(c=><button key={c} onClick={()=>set('color',c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:form.color===c?`3px solid ${C.text1}`:'3px solid transparent',cursor:'pointer',padding:0}}/>)}
                </div>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lblSt}>Icon</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {TYPE_ICONS.map(ic=>(
                    <button key={ic.slug} onClick={()=>set('icon',ic.slug)} style={{padding:'6px 10px',borderRadius:8,border:`1px solid ${form.icon===ic.slug?C.accent:C.border}`,background:form.icon===ic.slug?C.accentLight:C.surface,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
                      <Ic n={ic.slug} s={13} c={form.icon===ic.slug?C.accent:C.text2}/><span style={{fontSize:11,color:form.icon===ic.slug?C.accent:C.text2}}>{ic.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{gridColumn:'1/-1',display:'flex',gap:20}}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:C.text2}}>
                  <input type="checkbox" checked={form.parse_cv} onChange={e=>set('parse_cv',e.target.checked)} style={{accentColor:C.accent}}/>Show "Parse CV" button
                </label>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:C.text2}}>
                  <input type="checkbox" checked={form.extract_enabled} onChange={e=>set('extract_enabled',e.target.checked)} style={{accentColor:C.accent}}/>Enable "Extract Data" button
                </label>
              </div>
            </div>
          )}
          {tab==='formats' && (
            <div>
              <p style={{fontSize:13,color:C.text3,marginBottom:16}}>Choose which file formats are accepted for this type.</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {FORMAT_OPTIONS.map(fmt=>(
                  <button key={fmt} onClick={()=>toggleFormat(fmt)} style={{padding:'6px 14px',borderRadius:20,border:`1px solid ${form.allowed_formats.includes(fmt)?C.accent:C.border}`,background:form.allowed_formats.includes(fmt)?C.accentLight:C.surface,color:form.allowed_formats.includes(fmt)?C.accent:C.text2,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F,textTransform:'uppercase'}}>
                    {fmt}
                  </button>
                ))}
              </div>
              <p style={{fontSize:12,color:C.text3,marginTop:12}}>Selected: {form.allowed_formats.join(', ')}</p>
            </div>
          )}

          {tab==='mappings' && (
            <div>
              <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#1E40AF'}}>
                <b>Document Extraction</b> — Vercentic will analyse uploaded files of this type and extract data into the mapped fields. Works with images (ID photos, scans) and documents (PDF, DOCX).
              </div>
              <div style={{marginBottom:14}}>
                <label style={lblSt}>Extract data into object</label>
                <select value={form.extract_object_id} onChange={e=>set('extract_object_id',e.target.value)} style={inpSt}>
                  <option value="">— select object —</option>
                  {(allObjects||[]).filter(o=>!o.deleted_at).map(o=><option key={o.id} value={o.id}>{o.name} ({o.slug})</option>)}
                </select>
              </div>
              {form.extract_object_id && (
                <>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text1}}>Field Mappings ({form.mappings.length})</div>
                    <Btn sz='sm' v='secondary' onClick={addMapping}><Ic n="plus" s={13}/>Add Mapping</Btn>
                  </div>
                  {form.mappings.length===0
                    ? <div style={{textAlign:'center',padding:'28px 0',color:C.text3,border:`2px dashed ${C.border}`,borderRadius:10}}>
                        <div style={{marginBottom:8,fontSize:13}}>No mappings yet</div>
                        <button onClick={addMapping} style={{padding:'7px 16px',borderRadius:8,border:`1px solid ${C.accent}`,background:C.accentLight,color:C.accent,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F}}>+ Add first mapping</button>
                      </div>
                    : <>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 2fr auto',gap:8,padding:'0 12px 6px',fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                          <div>Extracted Key</div><div>Maps to Field</div><div>Extraction Hint</div><div/>
                        </div>
                        {form.mappings.map((m,i)=><MappingRow key={i} mapping={m} index={i} objectFields={objectFields} onUpdate={updateMapping} onRemove={removeMapping}/>)}
                      </>
                  }
                  {objectFields.length===0&&<p style={{fontSize:12,color:C.amber,marginTop:8}}>⚠ No fields loaded — select a different object or check field configuration.</p>}
                </>
              )}
            </div>
          )}
        </div>
        <div style={{padding:'14px 24px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
          <Btn v='ghost' onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>{saving?'Saving…':isEdit?'Save Changes':'Create File Type'}</Btn>
        </div>
      </div>
    </div>
  );
};

export default function FileTypesSettings({environment,objects:objectsProp}) {
  const [fileTypes,setFileTypes] = useState([]);
  const [loading,setLoading]     = useState(true);
  const [showForm,setShowForm]   = useState(false);
  const [editType,setEditType]   = useState(null);
  const [objects,setObjects]     = useState(objectsProp||[]);

  useEffect(()=>{
    if(environment?.id && (!objectsProp||objectsProp.length===0)){
      api.get(`/objects?environment_id=${environment.id}`)
        .then(d=>setObjects(Array.isArray(d)?d.filter(o=>!o.deleted_at):[]))
        .catch(()=>{});
    }
  },[environment?.id]);

  const load = () => {
    setLoading(true);
    api.get('/file-types').then(d=>{setFileTypes(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));
  };
  useEffect(()=>{load();},[]);

  const handleSave = async(data) => {
    if(editType?.id) await api.patch(`/file-types/${editType.id}`,data);
    else             await api.post('/file-types',data);
    setShowForm(false); setEditType(null); load();
  };
  const handleDelete = async(id) => { if(!confirm('Delete this file type?'))return; await api.del(`/file-types/${id}`); load(); };

  return (
    <div style={{fontFamily:F}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text1}}>File Types</div>
          <div style={{fontSize:13,color:C.text3,marginTop:2}}>Configure file categories, allowed formats and AI extraction field mappings</div>
        </div>
        <Btn onClick={()=>{setEditType(null);setShowForm(true);}}><Ic n="plus" s={14}/>New File Type</Btn>
      </div>
      {loading
        ? <div style={{color:C.text3,padding:40,textAlign:'center'}}>Loading…</div>
        : <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {fileTypes.map(ft=>(
              <div key={ft.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:C.surface,borderRadius:12,border:`1px solid ${C.border}`}}>
                <div style={{width:40,height:40,borderRadius:10,background:`${ft.color||C.accent}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Ic n={ft.icon||'file'} s={18} c={ft.color||C.accent}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{ft.name}</span>
                    {ft.parse_cv      && <span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4,background:`${C.accent}14`,color:C.accent}}>CV Parse</span>}
                    {ft.extract_enabled&&<span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4,background:`${C.green}14`,color:C.green}}>AI Extract</span>}
                    {ft.mappings?.length>0&&<span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4,background:`${C.purple}14`,color:C.purple}}>{ft.mappings.length} mappings</span>}
                  </div>
                  <div style={{fontSize:11,color:C.text3}}>{ft.allowed_formats?.join(' · ').toUpperCase()||'All formats'} · Max {ft.max_size_mb}MB</div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <Btn sz='sm' v='secondary' onClick={()=>{setEditType(ft);setShowForm(true);}}><Ic n="edit" s={12}/>Edit</Btn>
                  <Btn sz='sm' v='danger' onClick={()=>handleDelete(ft.id)}><Ic n="trash" s={12}/></Btn>
                </div>
              </div>
            ))}
          </div>
      }
      {showForm && <FileTypeFormModal fileType={editType} allObjects={objects} environment={environment} onSave={handleSave} onClose={()=>{setShowForm(false);setEditType(null);}}/>}
    </div>
  );
}
