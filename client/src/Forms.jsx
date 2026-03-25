import { useState, useEffect, useCallback, useRef } from "react";
import api from './apiClient.js';
const F = "'Geist', -apple-system, sans-serif";
const C = {
  text1:"#111827", text2:"#374151", text3:"#9CA3AF", border:"#E5E7EB",
  accent:"#4361EE", accentLight:"#EEF2FF", surface:"#FFFFFF", surface2:"#F9FAFB",
  green:"#0CAF77", red:"#EF4444", amber:"#F79009", purple:"#7C3AED", cyan:"#0891B2",
};







const FIELD_TYPES = [
  {type:'text',        label:'Short Text',   icon:'T'},
  {type:'textarea',    label:'Long Text',    icon:'¶'},
  {type:'number',      label:'Number',       icon:'#'},
  {type:'email',       label:'Email',        icon:'@'},
  {type:'phone',       label:'Phone',        icon:'☎'},
  {type:'url',         label:'URL',          icon:'🔗'},
  {type:'date',        label:'Date',         icon:'📅'},
  {type:'select',      label:'Single Select',icon:'◉'},
  {type:'multi_select',label:'Multi Select', icon:'☑'},
  {type:'rating',      label:'Rating',       icon:'★'},
  {type:'boolean',     label:'Yes / No',     icon:'⊙'},
  {type:'currency',    label:'Currency',     icon:'$'},
  {type:'people',      label:'People',       icon:'👤'},
  {type:'section',     label:'Section Break',icon:'—'},
];

const CATEGORIES = [
  {id:'general',      label:'General',         color:C.accent},
  {id:'screening',    label:'Screening',       color:C.green},
  {id:'interview',    label:'Interview Notes', color:C.purple},
  {id:'survey',       label:'Survey',          color:C.cyan},
  {id:'confidential', label:'Confidential',    color:C.red},
];

const OBJECTS = ['people','jobs','talent_pools','employees'];

const inpSt = {width:'100%',padding:'8px 12px',borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,outline:'none',boxSizing:'border-box',background:C.surface};
const lblSt = {fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5};

// ── Icon helpers ──────────────────────────────────────────────────────────────
const PATHS = {
  plus:"M12 5v14M5 12h14", trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  copy:"M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM8 4h8M8 4V2M16 4v4H8",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  grip:"M9 5h2v2H9zm4 0h2v2h-2zM9 9h2v2H9zm4 0h2v2h-2zM9 13h2v2H9zm4 0h2v2h-2z",
  chevD:"M6 9l6 6 6-6", chevR:"M9 18l6-6-6-6",
  x:"M18 6L6 18M6 6l12 12", check:"M20 6L9 17l-5-5",
  form:"M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2M9 12h6M9 16h4",
  share:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
  lock:"M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
};
const Ic = ({n,s=14,c='currentColor'}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]||PATHS.form}/>
  </svg>
);

const Btn = ({children,onClick,v='primary',sz='md',disabled,style={}}) => {
  const sz2={sm:{padding:'5px 10px',fontSize:11},md:{padding:'8px 16px',fontSize:13},lg:{padding:'10px 20px',fontSize:14}};
  const vars={
    primary:{background:C.accent,color:'#fff',border:'none'},
    secondary:{background:C.surface2,color:C.text2,border:`1px solid ${C.border}`},
    danger:{background:'#FEF2F2',color:C.red,border:`1px solid ${C.red}30`},
    ghost:{background:'transparent',color:C.text2,border:`1px solid ${C.border}`},
    green:{background:C.green,color:'#fff',border:'none'},
  };
  return <button onClick={onClick} disabled={disabled} style={{display:'flex',alignItems:'center',gap:6,borderRadius:8,fontFamily:F,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,transition:'all .12s',...sz2[sz],...vars[v],...style}}>{children}</button>;
};

// ── Field Editor (single field config in builder) ─────────────────────────────
const FieldEditor = ({ field, index, total, onChange, onRemove, onMove }) => {
  const [open, setOpen] = useState(false);
  const ft = FIELD_TYPES.find(t => t.type === field.field_type) || FIELD_TYPES[0];
  const isSection = field.field_type === 'section';

  if (isSection) return (
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:'#F0F4FF',borderRadius:8,border:`1.5px dashed ${C.accent}`,marginBottom:8}}>
      <span style={{cursor:'grab',color:C.text3}}><Ic n="grip" s={14}/></span>
      <span style={{flex:1,fontSize:13,fontWeight:700,color:C.accent}}>{field.label || 'Section Break'}</span>
      <input value={field.label||''} onChange={e=>onChange(index,'label',e.target.value)} placeholder="Section heading…"
        style={{...inpSt,width:200,padding:'5px 8px',fontSize:12,background:'white'}}/>
      <button onClick={()=>onRemove(index)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3}}><Ic n="x" s={13}/></button>
    </div>
  );

  return (
    <div style={{marginBottom:8,borderRadius:10,border:`1px solid ${open?C.accent:C.border}`,background:C.surface,overflow:'hidden',transition:'border-color .15s'}}>
      {/* Header row */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',cursor:'pointer',background:open?C.accentLight:C.surface}} onClick={()=>setOpen(o=>!o)}>
        <span style={{color:C.text3,fontSize:11,cursor:'grab'}}><Ic n="grip" s={14}/></span>
        <span style={{width:26,height:26,borderRadius:6,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:C.accent,flexShrink:0}}>{ft.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,color:C.text1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{field.label||<span style={{color:C.text3,fontStyle:'italic'}}>Untitled {ft.label}</span>}</div>
          <div style={{fontSize:10,color:C.text3}}>{ft.label}{field.required?' · Required':''}{field.confidential?' · Confidential':''}</div>
        </div>
        <div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
          {index>0&&<button onClick={()=>onMove(index,-1)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,padding:2,fontSize:11}}>↑</button>}
          {index<total-1&&<button onClick={()=>onMove(index,1)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,padding:2,fontSize:11}}>↓</button>}
          <button onClick={()=>onRemove(index)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,padding:2}}><Ic n="trash" s={13}/></button>
        </div>
        <Ic n={open?'chevD':'chevR'} s={14} c={C.text3}/>
      </div>

      {/* Expanded config */}
      {open && (
        <div style={{padding:'12px 16px',borderTop:`1px solid ${C.border}`,background:C.surface2,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{gridColumn:'1/-1'}}>
            <label style={lblSt}>Field Label *</label>
            <input value={field.label||''} onChange={e=>onChange(index,'label',e.target.value)} placeholder="e.g. Overall Rating" style={inpSt}/>
          </div>
          <div>
            <label style={lblSt}>Field Type</label>
            <select value={field.field_type} onChange={e=>onChange(index,'field_type',e.target.value)} style={inpSt}>
              {FIELD_TYPES.filter(t=>t.type!=='section').map(t=><option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lblSt}>API Key</label>
            <input value={field.api_key||''} onChange={e=>onChange(index,'api_key',e.target.value)}
              placeholder={field.label?.toLowerCase().replace(/[^a-z0-9]+/g,'_')||'field_key'}
              style={inpSt}/>
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label style={lblSt}>Placeholder / Help Text</label>
            <input value={field.placeholder||''} onChange={e=>onChange(index,'placeholder',e.target.value)} placeholder="Helper text shown in the form" style={inpSt}/>
          </div>
          {(field.field_type==='select'||field.field_type==='multi_select') && (
            <div style={{gridColumn:'1/-1'}}>
              <label style={lblSt}>Options (one per line)</label>
              <textarea value={(field.options||[]).join('\n')} rows={4}
                onChange={e=>onChange(index,'options',e.target.value.split('\n').filter(Boolean))}
                placeholder="Option 1&#10;Option 2&#10;Option 3" style={{...inpSt,resize:'vertical'}}/>
            </div>
          )}
          <div style={{gridColumn:'1/-1',display:'flex',gap:16,flexWrap:'wrap'}}>
            {[['required','Required'],['confidential','Confidential'],['searchable','Searchable'],['show_in_list','Show in list']].map(([k,lbl])=>(
              <label key={k} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,color:C.text2}}>
                <input type="checkbox" checked={!!field[k]} onChange={e=>onChange(index,k,e.target.checked)} style={{accentColor:C.accent}}/>
                {lbl}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Form Builder Modal ────────────────────────────────────────────────────────
const FormBuilderModal = ({ form, environment, onSave, onClose }) => {
  // Tell the copilot we're inside the form builder
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('talentos:editor-context', {
      detail: {
        type: 'form',
        name: form?.name || 'New Form',
        category: form?.category || 'general',
        fieldCount: (form?.fields || []).length,
      }
    }));
    return () => window.dispatchEvent(new CustomEvent('talentos:editor-context', { detail: null }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.name]);
  const isEdit = !!form?.id;
  const [tab, setTab] = useState('fields');
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name:           form?.name           || '',
    description:    form?.description    || '',
    category:       form?.category       || 'general',
    applies_to:     form?.applies_to     || ['people'],
    fields:         form?.fields         || [],
    sharing:        form?.sharing        || 'internal',
    confidential:   form?.confidential   || false,
    allow_multiple: form?.allow_multiple !== false,
    show_in_record: form?.show_in_record !== false,
    searchable:     form?.searchable     !== false,
    parseable:      form?.parseable      !== false,
  });

  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const addField = (type) => set('fields', [...f.fields, {
    id: Math.random().toString(36).slice(2), field_type: type,
    label: '', api_key: '', placeholder: '', required: false,
    confidential: false, searchable: true, show_in_list: false, options: [],
  }]);

  const updateField = (i, k, v) => {
    const updated = [...f.fields];
    updated[i] = { ...updated[i], [k]: v };
    // Auto-generate api_key from label
    if (k === 'label' && !updated[i]._api_key_edited) {
      updated[i].api_key = v.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    }
    if (k === 'api_key') updated[i]._api_key_edited = true;
    set('fields', updated);
  };

  const removeField = (i) => set('fields', f.fields.filter((_,idx)=>idx!==i));
  const moveField   = (i, dir) => {
    const arr = [...f.fields];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set('fields', arr);
  };

  const handleSave = async () => {
    if (!f.name.trim()) return window.__toast?.alert('Form name is required');
    if (!f.fields.length) return window.__toast?.alert('Add at least one field');
    setSaving(true);
    await onSave({ ...f, environment_id: environment?.id });
    setSaving(false);
  };

  const TAB = id => ({ padding:'7px 14px',border:'none',borderRadius:7,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',background:tab===id?C.accent:'transparent',color:tab===id?'#fff':C.text2 });
  const cat = CATEGORIES.find(c=>c.id===f.category)||CATEGORIES[0];

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{background:C.surface,borderRadius:16,width:'100%',maxWidth:780,height:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,.2)',overflow:'hidden',fontFamily:F}}>

        {/* Header */}
        <div style={{padding:'16px 22px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${cat.color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Ic n="form" s={16} c={cat.color}/>
          </div>
          <div style={{flex:1}}>
            <input value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Form name…"
              style={{fontSize:16,fontWeight:800,color:C.text1,border:'none',outline:'none',fontFamily:F,width:'100%',background:'transparent'}}/>
            <input value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Optional description…"
              style={{fontSize:12,color:C.text3,border:'none',outline:'none',fontFamily:F,width:'100%',background:'transparent',marginTop:2}}/>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:20}}>×</button>
        </div>

        {/* Tabs */}
        <div style={{padding:'8px 22px 0',borderBottom:`1px solid ${C.border}`,display:'flex',gap:4,background:C.surface2}}>
          {[['fields','Fields'],['settings','Settings'],['sharing','Sharing']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={TAB(id)}>{label} {id==='fields'?`(${f.fields.length})`:''}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 22px'}}>

          {/* FIELDS TAB */}
          {tab==='fields' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:16,alignItems:'start'}}>
              {/* Field list */}
              <div>
                {f.fields.length===0 && (
                  <div style={{textAlign:'center',padding:'48px 0',color:C.text3,border:`2px dashed ${C.border}`,borderRadius:12}}>
                    <Ic n="form" s={32} c={C.text3}/>
                    <div style={{marginTop:10,fontSize:14,fontWeight:600}}>No fields yet</div>
                    <div style={{fontSize:12,marginTop:4}}>Click a field type on the right to add it</div>
                  </div>
                )}
                {f.fields.map((field,i)=>(
                  <FieldEditor key={field.id||i} field={field} index={i} total={f.fields.length}
                    onChange={updateField} onRemove={removeField} onMove={moveField}/>
                ))}
              </div>
              {/* Field type palette */}
              <div style={{position:'sticky',top:0}}>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Add Field</div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {FIELD_TYPES.map(ft=>(
                    <button key={ft.type} onClick={()=>addField(ft.type)}
                      style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:'pointer',fontFamily:F,fontSize:12,color:C.text2,textAlign:'left',transition:'all .1s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background=C.accentLight;e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
                      onMouseLeave={e=>{e.currentTarget.style.background=C.surface;e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text2;}}>
                      <span style={{width:22,height:22,borderRadius:5,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:C.accent,flexShrink:0}}>{ft.icon}</span>
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {tab==='settings' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,maxWidth:540}}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lblSt}>Category</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {CATEGORIES.map(cat=>(
                    <button key={cat.id} onClick={()=>set('category',cat.id)}
                      style={{padding:'6px 12px',borderRadius:20,border:`1.5px solid ${f.category===cat.id?cat.color:C.border}`,background:f.category===cat.id?`${cat.color}14`:C.surface,color:f.category===cat.id?cat.color:C.text2,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:F}}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lblSt}>Applies to (objects)</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {OBJECTS.map(obj=>(
                    <button key={obj} onClick={()=>set('applies_to',f.applies_to.includes(obj)?f.applies_to.filter(o=>o!==obj):[...f.applies_to,obj])}
                      style={{padding:'5px 12px',borderRadius:20,border:`1.5px solid ${f.applies_to.includes(obj)?C.accent:C.border}`,background:f.applies_to.includes(obj)?C.accentLight:C.surface,color:f.applies_to.includes(obj)?C.accent:C.text2,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F,textTransform:'capitalize'}}>
                      {obj.replace('_',' ')}
                    </button>
                  ))}
                </div>
              </div>
              {[
                ['confidential','Confidential','Responses only visible to admins and the submitter',C.red],
                ['allow_multiple','Allow Multiple Responses','Same person can submit this form more than once',C.accent],
                ['show_in_record','Show in Record Panel','Form appears in the record\'s panel automatically',C.accent],
                ['searchable','Searchable & Reportable','Form responses included in search and reports',C.green],
                ['parseable','AI Parse Target','Fields available as targets when parsing CVs/documents',C.purple],
              ].map(([k,lbl,desc,col])=>(
                <div key={k} style={{gridColumn:'1/-1',display:'flex',alignItems:'flex-start',gap:12,padding:'10px 14px',borderRadius:10,border:`1px solid ${C.border}`,cursor:'pointer',background:f[k]?`${col}05`:C.surface}}
                  onClick={()=>set(k,!f[k])}>
                  <input type="checkbox" checked={!!f[k]} onChange={()=>set(k,!f[k])} style={{accentColor:col,marginTop:2,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{lbl}</div>
                    <div style={{fontSize:11,color:C.text3,marginTop:2}}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SHARING TAB */}
          {tab==='sharing' && (
            <div style={{maxWidth:500}}>
              {[
                ['internal','Internal Only','Only accessible within the Vercentic platform by logged-in users'],
                ['link','Link Sharing','Anyone with the link can fill out this form (no login required)'],
                ['public','Public','Discoverable publicly (future feature)'],
              ].map(([id,lbl,desc])=>(
                <div key={id} onClick={()=>set('sharing',id)}
                  style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 16px',borderRadius:10,border:`2px solid ${f.sharing===id?C.accent:C.border}`,background:f.sharing===id?C.accentLight:C.surface,cursor:'pointer',marginBottom:10}}>
                  <div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${f.sharing===id?C.accent:C.border}`,background:f.sharing===id?C.accent:'transparent',flexShrink:0,marginTop:2,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {f.sharing===id&&<div style={{width:6,height:6,borderRadius:'50%',background:'#fff'}}/>}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:f.sharing===id?C.accent:C.text1}}>{lbl}</div>
                    <div style={{fontSize:12,color:C.text3,marginTop:2}}>{desc}</div>
                  </div>
                </div>
              ))}
              {form?.share_token&&f.sharing==='link'&&(
                <div style={{padding:'12px 14px',borderRadius:8,background:'#F0F4FF',border:`1px solid ${C.accent}30`,fontSize:12}}>
                  <div style={{color:C.text3,marginBottom:4,fontWeight:600}}>Share link</div>
                  <div style={{fontFamily:'monospace',color:C.accent,wordBreak:'break-all'}}>
                    {window.location.origin}/form/{form.share_token}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'14px 22px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,color:C.text3}}>{f.fields.filter(f=>f.field_type!=='section').length} fields</span>
          <div style={{display:'flex',gap:8}}>
            <Btn v='ghost' onClick={onClose}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving?'Saving…':isEdit?'Save Changes':'Create Form'}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Form List (Admin) ─────────────────────────────────────────────────────────
export function FormsList({ environment }) {
  const [forms, setForms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);  // null | 'new' | form object
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api.get(`/forms?environment_id=${environment?.id||''}`);
    setForms(Array.isArray(d)?d:[]);
    setLoading(false);
  }, [environment?.id]);

  useEffect(()=>{ load(); },[load]);

  const handleSave = async (data) => {
    if (editing?.id) await api.patch(`/forms/${editing.id}`, data);
    else             await api.post('/forms', data);
    setEditing(null); load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this form? All responses will be lost.')) return;
    await api.del(`/forms/${id}`); load();
  };

  const filtered = forms.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.category?.includes(search.toLowerCase()));

  return (
    <div style={{fontFamily:F}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text1}}>Forms</div>
          <div style={{fontSize:13,color:C.text3,marginTop:2}}>Build forms for screening, interviews, surveys and more</div>
        </div>
        <Btn onClick={()=>setEditing('new')}><Ic n="plus" s={14}/>New Form</Btn>
      </div>
      <div style={{marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search forms…" style={{...inpSt,maxWidth:300}}/>
      </div>
      {loading && <div style={{color:C.text3,padding:40,textAlign:'center'}}>Loading…</div>}
      {!loading && filtered.length===0 && (
        <div style={{textAlign:'center',padding:'60px 0',color:C.text3,border:`2px dashed ${C.border}`,borderRadius:12}}>
          <Ic n="form" s={36} c={C.text3}/>
          <div style={{marginTop:12,fontSize:15,fontWeight:700,color:C.text2}}>No forms yet</div>
          <div style={{fontSize:13,marginTop:4,marginBottom:16}}>Create forms for screening notes, interviews, surveys and confidential data</div>
          <Btn onClick={()=>setEditing('new')}><Ic n="plus" s={14}/>Create first form</Btn>
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.map(form=>{
          const cat = CATEGORIES.find(c=>c.id===form.category)||CATEGORIES[0];
          return (
            <div key={form.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,transition:'border-color .15s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{width:42,height:42,borderRadius:10,background:`${cat.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Ic n="form" s={18} c={cat.color}/>
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{form.name}</span>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:`${cat.color}15`,color:cat.color}}>{cat.label}</span>
                  {form.confidential&&<span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:'#FEF2F2',color:C.red,fontWeight:700}}>Confidential</span>}
                  {form.sharing==='link'&&<span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:'#F0F4FF',color:C.accent,fontWeight:700}}>Link sharing</span>}
                </div>
                <div style={{fontSize:11,color:C.text3}}>
                  {form.fields?.filter(f=>f.field_type!=='section').length||0} fields · 
                  {form.applies_to?.map(o=>` ${o}`).join(',') || ' all objects'} ·
                  {form.response_count||0} responses
                  {form.description&&` · ${form.description}`}
                </div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <Btn sz='sm' v='secondary' onClick={()=>setEditing(form)}><Ic n="edit" s={12}/>Edit</Btn>
                <Btn sz='sm' v='danger' onClick={()=>handleDelete(form.id)}><Ic n="trash" s={12}/></Btn>
              </div>
            </div>
          );
        })}
      </div>
      {editing && (
        <FormBuilderModal
          form={editing==='new'?null:editing}
          environment={environment}
          onSave={handleSave}
          onClose={()=>setEditing(null)}/>
      )}
    </div>
  );
}

// ── Form Field Renderer (single field inside the form) ────────────────────────
const FormField = ({ field, value, onChange }) => {
  if (field.field_type === 'section') return (
    <div style={{borderBottom:`2px solid ${C.border}`,paddingBottom:6,marginBottom:12,marginTop:16}}>
      <span style={{fontSize:13,fontWeight:800,color:C.text1}}>{field.label}</span>
    </div>
  );

  const common = {...inpSt, borderColor: field.required&&!value ? C.red : C.border};

  return (
    <div style={{marginBottom:14}}>
      <label style={{...lblSt,color:field.confidential?C.red:C.text3}}>
        {field.label}{field.required&&<span style={{color:C.red}}> *</span>}
        {field.confidential&&<span style={{fontSize:9,marginLeft:4,padding:'1px 4px',borderRadius:3,background:'#FEF2F2',color:C.red}}>CONFIDENTIAL</span>}
      </label>
      {field.field_type==='textarea' && <textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={3} placeholder={field.placeholder} style={{...common,resize:'vertical'}}/>}
      {['text','email','phone','url','number','currency'].includes(field.field_type) && <input type={field.field_type==='number'||field.field_type==='currency'?'number':'text'} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder} style={common}/>}
      {field.field_type==='date' && <input type="date" value={value||''} onChange={e=>onChange(e.target.value)} style={common}/>}
      {field.field_type==='boolean' && (
        <div style={{display:'flex',gap:10}}>
          {['Yes','No'].map(opt=>(
            <button key={opt} onClick={()=>onChange(opt)}
              style={{padding:'7px 20px',borderRadius:8,border:`1.5px solid ${value===opt?C.accent:C.border}`,background:value===opt?C.accentLight:C.surface,color:value===opt?C.accent:C.text2,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>
              {opt}
            </button>
          ))}
        </div>
      )}
      {field.field_type==='rating' && (
        <div style={{display:'flex',gap:4}}>
          {[1,2,3,4,5].map(n=>(
            <button key={n} onClick={()=>onChange(n)}
              style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:n<=(value||0)?C.amber:'#D1D5DB',padding:'0 2px'}}>
              ★
            </button>
          ))}
        </div>
      )}
      {field.field_type==='select' && (
        <select value={value||''} onChange={e=>onChange(e.target.value)} style={common}>
          <option value="">Select…</option>
          {(field.options||[]).map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {field.field_type==='multi_select' && (
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {(field.options||[]).map(o=>{
            const sel = (value||[]).includes(o);
            return (
              <button key={o} onClick={()=>onChange(sel?(value||[]).filter(v=>v!==o):[...(value||[]),o])}
                style={{padding:'5px 12px',borderRadius:99,border:`1.5px solid ${sel?C.accent:C.border}`,background:sel?C.accentLight:C.surface,color:sel?C.accent:C.text2,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>
                {o}
              </button>
            );
          })}
        </div>
      )}
      {field.placeholder&&!['select','multi_select','boolean','rating','section','textarea'].includes(field.field_type)&&null}
    </div>
  );
};

// ── Form Response Viewer ──────────────────────────────────────────────────────
const ResponseViewer = ({ response, form, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{borderRadius:10,border:`1px solid ${C.border}`,marginBottom:8,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',background:open?C.accentLight:C.surface}} onClick={()=>setOpen(o=>!o)}>
        <Ic n={open?'chevD':'chevR'} s={13} c={C.text3}/>
        <div style={{flex:1}}>
          <span style={{fontSize:12,fontWeight:600,color:C.text1}}>{response.submitted_by}</span>
          <span style={{fontSize:11,color:C.text3,marginLeft:8}}>{new Date(response.submitted_at).toLocaleString()}</span>
        </div>
        <button onClick={e=>{e.stopPropagation();onDelete(response.id);}} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,padding:2}}>
          <Ic n="trash" s={12}/>
        </button>
      </div>
      {open&&(
        <div style={{padding:'12px 14px',background:C.surface2,borderTop:`1px solid ${C.border}`}}>
          {(form.fields||[]).filter(f=>f.field_type!=='section').map(field=>{
            const val = response.data?.[field.api_key];
            if (!val&&val!==0) return null;
            return (
              <div key={field.api_key} style={{display:'flex',gap:10,marginBottom:8,fontSize:13}}>
                <span style={{color:C.text3,minWidth:140,flexShrink:0,fontWeight:600}}>{field.label}</span>
                <span style={{color:C.text1}}>{Array.isArray(val)?val.join(', '):String(val)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Record Form Panel ─────────────────────────────────────────────────────────
// Embedded inside a record's panel — shows all applicable forms
export function RecordFormPanel({ record, objectSlug, environment, currentUser }) {
  const [forms, setForms]         = useState([]);
  const [activeForm, setActiveForm] = useState(null);
  const [responses, setResponses]   = useState({});
  const [formData, setFormData]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(()=>{
    if (!environment?.id) return;
    Promise.all([
      api.get(`/forms?environment_id=${environment.id}&object_slug=${objectSlug||'people'}`),
    ]).then(([formsData])=>{
      const f = Array.isArray(formsData)?formsData.filter(f=>f.show_in_record):[];
      setForms(f);
      setLoading(false);
    });
  },[environment?.id, objectSlug]);

  useEffect(()=>{
    if (!activeForm||!record?.id) return;
    api.get(`/forms/${activeForm.id}/responses?record_id=${record.id}`)
      .then(d=>setResponses(prev=>({...prev,[activeForm.id]:Array.isArray(d)?d:[]})));
  },[activeForm?.id, record?.id]);

  const openForm = (form) => {
    setActiveForm(form);
    setFormData({});
    setSubmitted(false);
    setShowHistory(false);
  };

  const handleSubmit = async () => {
    const required = (activeForm.fields||[]).filter(f=>f.required&&f.field_type!=='section');
    const missing  = required.filter(f=>!formData[f.api_key]&&formData[f.api_key]!==0);
    if (missing.length) { window.__toast?.alert(`Please fill in: ${missing.map(f=>f.label).join(', ')}`); return; }
    setSubmitting(true);
    await api.post(`/api/forms/${activeForm.id}/responses`, {
      record_id: record.id, record_type: objectSlug,
      environment_id: environment?.id,
      data: formData,
      submitted_by: currentUser?.name || currentUser?.email || 'Admin',
    });
    setSubmitted(true); setSubmitting(false);
    // Refresh responses
    const d = await api.get(`/forms/${activeForm.id}/responses?record_id=${record.id}`);
    setResponses(prev=>({...prev,[activeForm.id]:Array.isArray(d)?d:[]}));
  };

  const handleDeleteResponse = async (formId, responseId) => {
    if (!confirm('Delete this response?')) return;
    await api.del(`/forms/${formId}/responses/${responseId}`);
    const d = await api.get(`/forms/${formId}/responses?record_id=${record.id}`);
    setResponses(prev=>({...prev,[formId]:Array.isArray(d)?d:[]}));
  };

  if (loading) return (
    <div style={{color:"#d1d5db",fontSize:12,textAlign:'center',padding:'20px 0'}}>
      No forms yet
    </div>
  );
  if (!forms.length) return (
    <div style={{color:"#9ca3af",fontSize:12,textAlign:'center',padding:'20px 0'}}>
      No forms configured for this record type.<br/>
      <span style={{fontSize:11}}>Go to Settings → Forms to create one.</span>
    </div>
  );

  // Form list view
  if (!activeForm) return (
    <div>
      {forms.map(form=>{
        const cat = CATEGORIES.find(c=>c.id===form.category)||CATEGORIES[0];
        const resCount = (responses[form.id]||[]).length;
        return (
          <div key={form.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:`1px solid ${C.border}`,marginBottom:8,cursor:'pointer',background:C.surface,transition:'all .12s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=cat.color;e.currentTarget.style.background=`${cat.color}05`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}>
            <div style={{width:32,height:32,borderRadius:8,background:`${cat.color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Ic n="form" s={14} c={cat.color}/>
            </div>
            <div style={{flex:1}} onClick={()=>openForm(form)}>
              <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{form.name}</div>
              <div style={{fontSize:11,color:C.text3}}>{cat.label}{form.confidential?' · Confidential':''} · {form.fields?.filter(f=>f.field_type!=='section').length||0} fields{resCount?` · ${resCount} response${resCount!==1?'s':''}`:''}</div>
            </div>
            <div style={{display:'flex',gap:4}}>
              {resCount>0&&<button onClick={()=>{setActiveForm(form);setShowHistory(true);}} style={{background:'none',border:`1px solid ${C.border}`,borderRadius:6,cursor:'pointer',padding:'4px 8px',fontSize:10,fontWeight:700,color:C.text3,fontFamily:F}}>{resCount}</button>}
              <button onClick={()=>openForm(form)} style={{background:cat.color,border:'none',borderRadius:6,cursor:'pointer',padding:'5px 10px',fontSize:11,fontWeight:700,color:'#fff',fontFamily:F}}>Fill in</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const cat = CATEGORIES.find(c=>c.id===activeForm.category)||CATEGORIES[0];
  const existingResponses = responses[activeForm.id]||[];

  return (
    <div>
      {/* Form header */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <button onClick={()=>setActiveForm(null)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:16}}>←</button>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:800,color:C.text1}}>{activeForm.name}</div>
          {activeForm.description&&<div style={{fontSize:11,color:C.text3}}>{activeForm.description}</div>}
        </div>
        {existingResponses.length>0&&(
          <button onClick={()=>setShowHistory(h=>!h)} style={{background:'none',border:`1px solid ${C.border}`,borderRadius:6,cursor:'pointer',padding:'4px 8px',fontSize:11,fontWeight:700,color:C.text2,fontFamily:F}}>
            {showHistory?'Fill in':'History ('+existingResponses.length+')'}
          </button>
        )}
      </div>

      {showHistory ? (
        <div>
          {existingResponses.map(r=>(
            <ResponseViewer key={r.id} response={r} form={activeForm} onDelete={id=>handleDeleteResponse(activeForm.id,id)}/>
          ))}
        </div>
      ) : submitted ? (
        <div style={{textAlign:'center',padding:'20px 0'}}>
          <div style={{fontSize:22,marginBottom:8}}>✓</div>
          <div style={{fontSize:14,fontWeight:700,color:C.green}}>Submitted</div>
          <div style={{fontSize:12,color:C.text3,marginTop:4,marginBottom:12}}>Response saved successfully</div>
          <div style={{display:'flex',gap:8,justifyContent:'center'}}>
            {activeForm.allow_multiple&&<Btn v='secondary' sz='sm' onClick={()=>{setFormData({});setSubmitted(false);}}>Submit another</Btn>}
            <Btn v='secondary' sz='sm' onClick={()=>setActiveForm(null)}>Back to forms</Btn>
          </div>
        </div>
      ) : (
        <div>
          {(activeForm.fields||[]).map((field,i)=>(
            <FormField key={field.id||i} field={field} value={formData[field.api_key]}
              onChange={v=>setFormData(d=>({...d,[field.api_key]:v}))}/>
          ))}
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <Btn v='ghost' sz='sm' onClick={()=>setActiveForm(null)}>Cancel</Btn>
            <Btn sz='sm' onClick={handleSubmit} disabled={submitting}>{submitting?'Submitting…':'Submit'}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormsList;
