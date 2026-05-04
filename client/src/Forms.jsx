import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import api from './apiClient.js';
const F = "'Plus Jakarta Sans', -apple-system, sans-serif";
const C = {
  text1:"#111827", text2:"#374151", text3:"#9CA3AF", border:"#E5E7EB",
  accent:"#4361EE", accentLight:"#EEF2FF", surface:"#FFFFFF", surface2:"#F9FAFB",
  green:"#0CAF77", red:"#EF4444", amber:"#F79009", purple:"#7C3AED", cyan:"#0891B2",
};







const FIELD_TYPES = [
  {type:'text',        label:'Short Text',   icon:'text'},
  {type:'textarea',    label:'Long Text',    icon:'alignLeft'},
  {type:'number',      label:'Number',       icon:'hash'},
  {type:'email',       label:'Email',        icon:'atSign'},
  {type:'phone',       label:'Phone',        icon:'phone'},
  {type:'url',         label:'URL',          icon:'link'},
  {type:'date',        label:'Date',         icon:'calendar'},
  {type:'select',      label:'Single Select',icon:'list'},
  {type:'multi_select',label:'Multi Select', icon:'listCheck'},
  {type:'rating',      label:'Rating',       icon:'star'},
  {type:'boolean',     label:'Yes / No',     icon:'toggle'},
  {type:'currency',    label:'Currency',     icon:'dollar'},
  {type:'people',      label:'People',       icon:'users'},
  {type:'section',     label:'Section Break',icon:'minus'},
];

const CATEGORIES = [
  {id:'general',      label:'General',         color:C.accent},
  {id:'screening',    label:'Screening',       color:C.green},
  {id:'interview',    label:'Interview Notes', color:C.purple},
  {id:'scorecard',    label:'Scorecard',       color:'#d97706', icon:'clipboard'},
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
  // Field type icons
  text:       "M4 6h16M4 12h10M4 18h6",
  alignLeft:  "M21 10H3M21 6H3M15 14H3M21 18H3",
  hash:       "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
  atSign:     "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 019-9",
  phone:      "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  link:       "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  calendar:   "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  list:       "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  listCheck:  "M10 6H21M10 12H21M10 18H21M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  star:       "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  toggle:     "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3",
  dollar:     "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  users:      "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  star:       "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  mapPin:     "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 7a3 3 0 110 6 3 3 0 010-6z",
  minus:      "M5 12h14",
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
        <span style={{width:26,height:26,borderRadius:6,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic n={ft.icon} s={13} c={C.accent}/></span>
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
    context_trigger: form?.context_trigger || null, // null | 'job' | 'interview' | 'offer' | 'pipeline'
    fields:         form?.fields         || [],
    sharing:        form?.sharing        || 'internal',
    confidential:   form?.confidential   || false,
    allow_multiple: form?.allow_multiple !== false,
    show_in_record: form?.show_in_record ?? false,
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

  return createPortal(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9500,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
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
                      <span style={{width:22,height:22,borderRadius:5,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic n={ft.icon} s={12} c={C.accent}/></span>
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
              {/* Context trigger */}
              <div style={{gridColumn:'1/-1',padding:'12px 14px',borderRadius:10,border:`1px solid ${C.border}`,background:C.surface}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:6}}>Contextual trigger</div>
                <div style={{fontSize:11,color:C.text3,marginBottom:10}}>Automatically surface this form when a specific action or context is active — e.g. open an interview, link a job, or move a candidate to a pipeline stage.</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[
                    {id:null,       label:'None (always shown)'},
                    {id:'job',       label:'Linked to job'},
                    {id:'interview', label:'After interview'},
                    {id:'offer',     label:'With offer'},
                    {id:'pipeline',  label:'Pipeline stage change'},
                    {id:'onboarding',label:'Onboarding'},
                  ].map(opt=>(
                    <button key={String(opt.id)} onClick={()=>set('context_trigger',opt.id)}
                      style={{padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F,border:`1.5px solid ${f.context_trigger===opt.id?C.purple:C.border}`,background:f.context_trigger===opt.id?`${C.purple}12`:C.surface,color:f.context_trigger===opt.id?C.purple:C.text2}}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
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
  , document.body);
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
    if (!(await window.__confirm({ title:'Delete this form? All responses will be lost.', danger:true }))) return;
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
                  {form.context_trigger&&<span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,padding:'2px 6px',borderRadius:4,background:`${C.purple}12`,color:C.purple,fontWeight:700}}><Ic n="mapPin" s={9} c={C.purple}/>{form.context_trigger}</span>}
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
              style={{background:'none',border:'none',cursor:'pointer',padding:'0 2px',display:'flex'}}>
              <Ic n="star" s={22} c={n<=(value||0)?C.amber:'#D1D5DB'}/>
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


// ── Form Renderer (renders all fields of a form) ─────────────────────────────
const FormRenderer = ({ form, formData, setFormData }) => (
  <div>
    {(form.fields || []).map((field, i) => (
      <FormField key={field.id || i} field={field}
        value={formData[field.api_key]}
        onChange={v => setFormData(prev => ({ ...prev, [field.api_key]: v }))}/>
    ))}
  </div>
);

// ── Link Form Picker Modal ────────────────────────────────────────────────────
// linkedRecords = array of { id, title, objectName } — records this person is linked to
function LinkFormModal({ record, objectSlug, environment, currentUser, existingLinkIds, linkedRecords, onLinked, onClose }) {
  const [allForms, setAllForms] = useState([]);
  const [search, setSearch]     = useState('');
  const [contextRec, setContextRec] = useState(null); // { id, title }
  const [saving, setSaving]     = useState(null);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/forms?environment_id=${environment.id}&object_slug=${objectSlug||'people'}`)
      .then(d => setAllForms(Array.isArray(d) ? d : []));
  }, [environment?.id, objectSlug]);

  const available = allForms.filter(f =>
    !existingLinkIds.has(f.id) &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleLink = async (form) => {
    setSaving(form.id);
    await api.post('/forms/links', {
      record_id: record.id,
      form_id: form.id,
      environment_id: environment?.id,
      context_record_id: contextRec?.id || null,
      context_record_title: contextRec?.title || null,
      linked_by: currentUser?.name || currentUser?.email || null,
    });
    setSaving(null);
    onLinked();
  };

  return createPortal(
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:9500,
        display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:C.surface, borderRadius:16, width:'100%', maxWidth:520,
        maxHeight:'80vh', display:'flex', flexDirection:'column',
        boxShadow:'0 24px 64px rgba(0,0,0,.2)', overflow:'hidden', fontFamily:F }}>

        {/* Header */}
        <div style={{ padding:'16px 20px 12px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.text1 }}>Link a form</div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3, fontSize:18 }}>×</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search forms…" autoFocus
            style={{ width:'100%', padding:'8px 12px', border:`1.5px solid ${C.border}`, borderRadius:8,
              fontSize:13, fontFamily:F, color:C.text1, outline:'none', boxSizing:'border-box' }}/>
        </div>

        {/* Context — only linked records */}
        {linkedRecords?.length > 0 && (
          <div style={{ padding:'10px 20px', borderBottom:`1px solid ${C.border}`, background:C.surface2 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
              Associate with (optional)
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {linkedRecords.map(lr => {
                const active = contextRec?.id === lr.id;
                return (
                  <button key={lr.id} onClick={() => setContextRec(active ? null : lr)}
                    style={{ padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                      cursor:'pointer', fontFamily:F, border:`1.5px solid ${active ? C.accent : C.border}`,
                      background: active ? C.accentLight : C.surface,
                      color: active ? C.accent : C.text2 }}>
                    {lr.title}
                    {lr.objectName && <span style={{ color: active ? C.accent : C.text3, fontWeight:400, marginLeft:4 }}>({lr.objectName})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Form list */}
        <div style={{ flex:1, overflowY:'auto', padding:'10px 12px' }}>
          {available.length === 0 && (
            <div style={{ textAlign:'center', padding:'30px 0', color:C.text3, fontSize:12 }}>
              {allForms.length === 0 ? 'No forms created yet. Go to Settings → Forms.' : 'All available forms are already linked.'}
            </div>
          )}
          {available.map(form => {
            const cat = CATEGORIES.find(c => c.id === form.category) || CATEGORIES[0];
            return (
              <div key={form.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                borderRadius:10, border:`1px solid ${C.border}`, marginBottom:6, background:C.surface }}>
                <div style={{ width:32, height:32, borderRadius:8, background:`${cat.color}15`,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Ic n="form" s={14} c={cat.color}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{form.name}</div>
                  <div style={{ fontSize:11, color:C.text3 }}>{cat.label} · {form.fields?.filter(f=>f.field_type!=='section').length||0} fields</div>
                </div>
                <button onClick={() => handleLink(form)} disabled={saving === form.id}
                  style={{ background: saving === form.id ? C.text3 : C.accent, border:'none', borderRadius:7,
                    cursor: saving === form.id ? 'not-allowed' : 'pointer',
                    padding:'6px 14px', fontSize:12, fontWeight:700, color:'#fff', fontFamily:F }}>
                  {saving === form.id ? '…' : 'Link'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Record Form Panel ─────────────────────────────────────────────────────────
// Shows only forms explicitly linked to this record (not all forms automatically)
export function RecordFormPanel({ record, objectSlug, environment, currentUser, activeJobContext }) {
  const [links, setLinks]           = useState([]); // { id, form, context_record_title }
  const [activeLink, setActiveLink] = useState(null);
  const [responses, setResponses]   = useState({});
  const [formData, setFormData]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [linkedRecords, setLinkedRecords] = useState([]); // records this person is linked to

  // Fetch records this person is linked to (for context picker)
  useEffect(() => {
    if (!record?.id || !environment?.id) return;
    api.get(`/records/linked-jobs?person_id=${record.id}&environment_id=${environment.id}`)
      .then(d => {
        if (!Array.isArray(d)) return;
        setLinkedRecords(d.map(r => ({
          id: r.id,
          title: r.title || 'Untitled',
          objectName: r.object_name || '',
        })));
      });
  }, [record?.id, environment?.id]);

  const loadLinks = useCallback(async () => {
    if (!record?.id || !environment?.id) return;
    setLoading(true);
    const d = await api.get(`/forms/links?record_id=${record.id}&environment_id=${environment.id}`);
    setLinks(Array.isArray(d) ? d : []);
    setLoading(false);
  }, [record?.id, environment?.id]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  useEffect(() => {
    if (!activeLink?.form?.id || !record?.id) return;
    api.get(`/forms/${activeLink.form.id}/responses?record_id=${record.id}`)
      .then(d => setResponses(prev => ({ ...prev, [activeLink.form.id]: Array.isArray(d) ? d : [] })));
  }, [activeLink?.form?.id, record?.id]);

  const openLink = (link) => {
    setActiveLink(link);
    setFormData({});
    setSubmitted(false);
    setShowHistory(false);
  };

  const handleUnlink = async (linkId) => {
    if (!(await window.__confirm({ title:'Remove this form from this record?', danger:true }))) return;
    await api.delete(`/forms/links/${linkId}`);
    setLinks(prev => prev.filter(l => l.id !== linkId));
    if (activeLink?.id === linkId) setActiveLink(null);
  };

  const handleSubmit = async () => {
    if (!activeLink) return;
    const form = activeLink.form;
    const required = (form.fields || []).filter(f => f.required && f.field_type !== 'section');
    const missing  = required.filter(f => !formData[f.api_key] && formData[f.api_key] !== 0);
    if (missing.length) { alert(`Please fill in: ${missing.map(f => f.label).join(', ')}`); return; }
    setSubmitting(true);
    await api.post(`/forms/${form.id}/responses`, {
      record_id: record.id, record_type: objectSlug,
      environment_id: environment?.id,
      context_record_id: activeLink.context_record_id || null,
      data: formData,
      submitted_by: currentUser?.name || currentUser?.email || 'Admin',
    });
    setSubmitted(true); setSubmitting(false);
    const d = await api.get(`/forms/${form.id}/responses?record_id=${record.id}`);
    setResponses(prev => ({ ...prev, [form.id]: Array.isArray(d) ? d : [] }));
  };

  const handleDeleteResponse = async (formId, responseId) => {
    if (!(await window.__confirm({ title:'Delete this response?', danger:true }))) return;
    await api.delete(`/forms/${formId}/responses/${responseId}`);
    const d = await api.get(`/forms/${formId}/responses?record_id=${record.id}`);
    setResponses(prev => ({ ...prev, [formId]: Array.isArray(d) ? d : [] }));
  };

  const existingLinkIds = new Set(links.map(l => l.form_id));

  // Filter links by active job context:
  // - General (null) → show forms with no context OR forms for any context
  // - Specific job   → show only forms linked to that job context
  const visibleLinks = activeJobContext
    ? links.filter(l => l.context_record_id === activeJobContext)
    : links;

  // ── LOADING ──
  if (loading) return <div style={{ color:C.text3, fontSize:12, textAlign:'center', padding:'20px 0' }}>Loading…</div>;

  // ── NO ACTIVE FORM — show list ──
  if (!activeLink) return (
    <div>
      {visibleLinks.length === 0 && (
        <div style={{ textAlign:'center', padding:'24px 0', color:C.text3 }}>
          <Ic n="form" s={28} c={C.border}/>
          <div style={{ fontSize:12, marginTop:8, marginBottom:12 }}>
            {activeJobContext
              ? 'No forms linked for this context'
              : 'No forms linked to this record yet'}
          </div>
        </div>
      )}
      {visibleLinks.map(link => {
        const form = link.form;
        const cat  = CATEGORIES.find(c => c.id === form.category) || CATEGORIES[0];
        const resCount = (responses[form.id] || []).length;
        return (
          <div key={link.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
            borderRadius:10, border:`1px solid ${C.border}`, marginBottom:8, background:C.surface }}>
            <div style={{ width:32, height:32, borderRadius:8, background:`${cat.color}15`,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Ic n="form" s={14} c={cat.color}/>
            </div>
            <div style={{ flex:1, cursor:'pointer' }} onClick={() => openLink(link)}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{form.name}</div>
              <div style={{ fontSize:11, color:C.text3 }}>
                {cat.label}
                {link.context_record_title && <span style={{ color:C.accent }}> · {link.context_record_title}</span>}
                {resCount > 0 && ` · ${resCount} response${resCount !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div style={{ display:'flex', gap:4 }}>
              {resCount > 0 && (
                <button onClick={() => { setActiveLink(link); setShowHistory(true); }}
                  style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, cursor:'pointer',
                    padding:'4px 8px', fontSize:10, fontWeight:700, color:C.text3, fontFamily:F }}>{resCount}</button>
              )}
              <button onClick={() => openLink(link)}
                style={{ background:cat.color, border:'none', borderRadius:6, cursor:'pointer',
                  padding:'5px 10px', fontSize:11, fontWeight:700, color:'#fff', fontFamily:F }}>Fill in</button>
              <button onClick={() => handleUnlink(link.id)}
                style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, cursor:'pointer',
                  padding:'5px 8px', fontSize:11, color:C.text3, fontFamily:F }}>×</button>
            </div>
          </div>
        );
      })}
      <button onClick={() => setShowPicker(true)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          padding:'8px', borderRadius:10, border:`1.5px dashed ${C.border}`, background:'transparent',
          fontSize:12, fontWeight:600, color:C.text3, cursor:'pointer', fontFamily:F, marginTop:4,
          transition:'all .12s' }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text3;}}>
        <Ic n="plus" s={13} c="currentColor"/> Link a form
      </button>
      {showPicker && (
        <LinkFormModal
          record={record}
          objectSlug={objectSlug}
          environment={environment}
          currentUser={currentUser}
          existingLinkIds={existingLinkIds}
          linkedRecords={linkedRecords}
          onLinked={() => { loadLinks(); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );

  // ── ACTIVE FORM — fill in or view history ──
  const form = activeLink.form;
  const cat  = CATEGORIES.find(c => c.id === form.category) || CATEGORIES[0];
  const existingResponses = responses[form.id] || [];

  return (
    <div>
      {/* Form header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <button onClick={() => setActiveLink(null)}
          style={{ background:'none', border:'none', cursor:'pointer', color:C.text3, fontSize:16 }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.text1 }}>{form.name}</div>
          {activeLink.context_record_title && (
            <div style={{ fontSize:11, color:C.accent }}>Context: {activeLink.context_record_title}</div>
          )}
        </div>
        {existingResponses.length > 0 && (
          <button onClick={() => setShowHistory(h => !h)}
            style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:6, cursor:'pointer',
              padding:'4px 8px', fontSize:11, fontWeight:700, color:C.text2, fontFamily:F }}>
            {showHistory ? 'Fill in' : `History (${existingResponses.length})`}
          </button>
        )}
      </div>

      {showHistory ? (
        <div>
          {existingResponses.map(r => (
            <ResponseViewer key={r.id} response={r} form={form}
              onDelete={id => handleDeleteResponse(form.id, id)}/>
          ))}
        </div>
      ) : submitted ? (
        <div style={{ textAlign:'center', padding:'20px 0' }}>
          <div style={{ fontSize:22, marginBottom:8, color:C.green }}>✓</div>
          <div style={{ fontSize:14, fontWeight:700, color:C.green }}>Submitted</div>
          <div style={{ fontSize:12, color:C.text3, marginTop:4, marginBottom:12 }}>Response saved</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            {form.allow_multiple && <Btn v='secondary' sz='sm' onClick={() => { setFormData({}); setSubmitted(false); }}>Submit another</Btn>}
            <Btn v='secondary' sz='sm' onClick={() => setActiveLink(null)}>Back</Btn>
          </div>
        </div>
      ) : (
        <div>
          <FormRenderer form={form} formData={formData} setFormData={setFormData}/>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:14 }}>
            <Btn v='ghost' sz='sm' onClick={() => setActiveLink(null)}>Cancel</Btn>
            <Btn sz='sm' onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Submit'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormsList;
