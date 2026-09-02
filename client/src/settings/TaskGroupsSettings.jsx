// client/src/settings/TaskGroupsSettings.jsx — Task Group Template builder
import { useState, useEffect, useCallback } from 'react';
import { tFetch } from '../apiClient.js';
import { COMPLETION_TYPES } from '../TaskModal.jsx';

const C = {
  accent:'#4361EE', accentL:'#EEF2FF', text1:'#0D0D0F', text2:'#374151',
  text3:'#6b7280', border:'#e5e7eb', bg:'#f9fafb', white:'#ffffff',
  purple:'#7c3aed', purpleL:'#faf5ff', green:'#10b981', red:'#ef4444',
};
const F = "'DM Sans', -apple-system, sans-serif";

const CATEGORIES = [
  { value:'general',     label:'General',     color:'#6b7280' },
  { value:'pre-boarding',label:'Pre-boarding', color:'#0891b2' },
  { value:'onboarding',  label:'Onboarding',  color:'#7c3aed' },
  { value:'compliance',  label:'Compliance',  color:'#f59f00' },
  { value:'offboarding', label:'Offboarding', color:'#ef4444' },
];
const PRIORITIES = ['low','medium','high','urgent'];
const TASK_TYPES = ['follow_up','email','call','review','send_docs','meeting','other'];

const Inp = ({ value, onChange, placeholder, type='text', style={} }) => (
  <input type={type} value={value??''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{width:'100%',padding:'7px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,background:C.white,
      fontSize:13,color:C.text1,fontFamily:F,outline:'none',boxSizing:'border-box',...style}}/>
);
const Sel = ({ value, onChange, options, style={} }) => (
  <select value={value??''} onChange={e=>onChange(e.target.value)}
    style={{width:'100%',padding:'7px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,background:C.white,
      fontSize:13,color:C.text1,fontFamily:F,cursor:'pointer',outline:'none',...style}}>
    {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
  </select>
);
const Lbl = ({ children }) => (
  <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>{children}</div>
);
const Btn = ({ children, onClick, variant='secondary', disabled, style={} }) => {
  const styles = {
    primary:   { background:C.accent,  color:'white',  border:'none' },
    secondary: { background:C.white,   color:C.text2,  border:`1.5px solid ${C.border}` },
    danger:    { background:'#fef2f2', color:C.red,    border:`1.5px solid #fecaca` },
    purple:    { background:C.purpleL, color:C.purple, border:`1.5px solid #e9d5ff` },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{padding:'7px 16px',borderRadius:9,fontSize:13,fontWeight:600,cursor:disabled?'default':'pointer',
        fontFamily:F,opacity:disabled?0.5:1,...styles[variant],...style}}>
      {children}
    </button>
  );
};

// ── Task definition editor (one task within a template) ───────────────────────
function TaskDefEditor({ def, index, onChange, onDelete, forms, fileTypes }) {
  const [open, setOpen] = useState(index === 0);
  const ct = def.completion_type || 'checkbox';
  const ctMeta = COMPLETION_TYPES.find(c=>c.value===ct) || COMPLETION_TYPES[0];
  const cfg = def.completion_config || {};
  const setConf = (k,v) => onChange({ ...def, completion_config: { ...cfg, [k]: v } });

  return (
    <div style={{border:`1.5px solid ${open?C.accent:C.border}`,borderRadius:12,overflow:'hidden',background:C.white}}>
      {/* Header row */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',background:open?C.accentL:C.white}}
        onClick={()=>setOpen(o=>!o)}>
        <div style={{width:22,height:22,borderRadius:6,background:`${ctMeta.color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{fontSize:11,color:ctMeta.color,fontWeight:700}}>{index+1}</span>
        </div>
        <div style={{flex:1,fontSize:13,fontWeight:600,color:C.text1}}>{def.title||`Task ${index+1}`}</div>
        <span style={{fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:99,background:`${ctMeta.color}12`,color:ctMeta.color}}>{ctMeta.label}</span>
        {def.due_offset_days!=null&&<span style={{fontSize:11,color:C.text3}}>+{def.due_offset_days}d</span>}
        <button onClick={e=>{e.stopPropagation();onDelete();}} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:16,padding:0,lineHeight:1}}>×</button>
        <span style={{fontSize:14,color:C.text3}}>{open?'▲':'▼'}</span>
      </div>

      {open && (
        <div style={{padding:'14px 16px',borderTop:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:12}}>
          {/* Title + type */}
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:10}}>
            <div><Lbl>Task title *</Lbl>
              <Inp value={def.title||''} onChange={v=>onChange({...def,title:v})} placeholder="What needs to be done?"/>
            </div>
            <div><Lbl>Task type</Lbl>
              <Sel value={def.task_type||'other'} onChange={v=>onChange({...def,task_type:v})} options={TASK_TYPES.map(t=>({value:t,label:t.replace('_',' ')}))}/>
            </div>
          </div>

          {/* Description */}
          <div><Lbl>Description / instructions</Lbl>
            <textarea value={def.description||''} onChange={e=>onChange({...def,description:e.target.value})} rows={2} placeholder="Optional context for the person…"
              style={{width:'100%',padding:'7px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:'none',resize:'vertical',boxSizing:'border-box'}}/>
          </div>

          {/* Priority + due offset + estimated time */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            <div><Lbl>Priority</Lbl>
              <Sel value={def.priority||'medium'} onChange={v=>onChange({...def,priority:v})} options={PRIORITIES.map(p=>({value:p,label:p.charAt(0).toUpperCase()+p.slice(1)}))}/>
            </div>
            <div><Lbl>Due (+days from anchor)</Lbl>
              <Inp type="number" value={def.due_offset_days??''} onChange={v=>onChange({...def,due_offset_days:v===''?null:Number(v)})} placeholder="e.g. 3"/>
            </div>
            <div><Lbl>Est. minutes</Lbl>
              <Inp type="number" value={def.estimated_minutes||''} onChange={v=>onChange({...def,estimated_minutes:v?Number(v):null})} placeholder="e.g. 15"/>
            </div>
          </div>

          {/* Completion type */}
          <div>
            <Lbl>Completion method</Lbl>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginTop:4}}>
              {COMPLETION_TYPES.map(ct2=>{
                const active = ct===ct2.value;
                return (
                  <button key={ct2.value} onClick={()=>onChange({...def,completion_type:ct2.value,completion_config:{}})}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,textAlign:'left',
                      border:`1.5px solid ${active?ct2.color:C.border}`,background:active?`${ct2.color}0f`:C.white,
                      cursor:'pointer',fontFamily:F}}>
                    <div style={{fontSize:12,fontWeight:700,color:active?ct2.color:C.text2}}>{ct2.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Completion config */}
          {ct==='file_upload'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><Lbl>Expected file type</Lbl>
                <Sel value={cfg.file_type_id||''} onChange={v=>{const ft=fileTypes.find(f=>f.id===v);setConf('file_type_id',v);onChange({...def,completion_config:{...cfg,file_type_id:v,file_type_name:ft?.name||''}});}}
                  options={[{value:'',label:'Any file type'},...fileTypes.map(f=>({value:f.id,label:f.name}))]}/>
              </div>
              <div><Lbl>Instructions</Lbl><Inp value={cfg.instructions||''} onChange={v=>setConf('instructions',v)} placeholder="e.g. Upload a clear scan"/></div>
            </div>
          )}
          {ct==='form'&&(
            <div><Lbl>Form to complete</Lbl>
              <Sel value={cfg.form_id||''} onChange={v=>{const f=forms.find(fm=>fm.id===v);onChange({...def,completion_config:{...cfg,form_id:v,form_name:f?.name||''}});}}
                options={[{value:'',label:'Select a form…'},...forms.map(f=>({value:f.id,label:f.name}))]}/>
            </div>
          )}
          {ct==='document_read'&&(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div><Lbl>Document title</Lbl><Inp value={cfg.document_title||''} onChange={v=>setConf('document_title',v)} placeholder="e.g. Employee Handbook 2026"/></div>
              <div><Lbl>Document URL</Lbl><Inp value={cfg.document_url||''} onChange={v=>setConf('document_url',v)} placeholder="https://…"/></div>
              <div><Lbl>Acknowledgement statement</Lbl><Inp value={cfg.ack_statement||''} onChange={v=>setConf('ack_statement',v)} placeholder="I confirm I have read and understood this document"/></div>
            </div>
          )}
          {ct==='e_signature'&&(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div><Lbl>Document title</Lbl><Inp value={cfg.document_title||''} onChange={v=>setConf('document_title',v)} placeholder="e.g. Employment Contract"/></div>
              <div><Lbl>Document URL</Lbl><Inp value={cfg.document_url||''} onChange={v=>setConf('document_url',v)} placeholder="https://…"/></div>
            </div>
          )}
          {ct==='video_watch'&&(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div><Lbl>Video URL</Lbl><Inp value={cfg.video_url||''} onChange={v=>setConf('video_url',v)} placeholder="https://youtube.com/…"/></div>
              <div><Lbl>Video title</Lbl><Inp value={cfg.video_title||''} onChange={v=>setConf('video_title',v)} placeholder="e.g. Welcome to the team"/></div>
            </div>
          )}
          {ct==='external_link'&&(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div><Lbl>URL</Lbl><Inp value={cfg.url||''} onChange={v=>setConf('url',v)} placeholder="https://…"/></div>
              <div><Lbl>Button label</Lbl><Inp value={cfg.link_label||''} onChange={v=>setConf('link_label',v)} placeholder="e.g. Book your desk"/></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Template editor modal ─────────────────────────────────────────────────────
function TemplateEditorModal({ template, environment, onSave, onClose }) {
  const isEdit = !!template?.id;
  const [forms,     setForms]     = useState([]);
  const [fileTypes, setFileTypes] = useState([]);
  const [saving,    setSaving]    = useState(false);

  const [form, setForm] = useState({
    name:             template?.name             || '',
    description:      template?.description      || '',
    category:         template?.category         || 'general',
    color:            template?.color            || '#7c3aed',
    applies_to:       template?.applies_to       || 'people',
    task_definitions: template?.task_definitions || [],
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(() => {
    const envId = environment?.id;
    if (!envId) return;
    tFetch(`/api/forms?environment_id=${envId}`).then(d=>setForms(Array.isArray(d)?d:[])).catch(()=>{});
    tFetch('/api/file-types').then(d=>setFileTypes(Array.isArray(d)?d:[])).catch(()=>{});
  }, [environment?.id]);

  const addTask = () => set('task_definitions', [...form.task_definitions, {
    title:'', task_type:'other', priority:'medium', completion_type:'checkbox', completion_config:{}, due_offset_days:null, estimated_minutes:null, description:'',
  }]);

  const updateTask = (idx, val) => set('task_definitions', form.task_definitions.map((d,i)=>i===idx?val:d));
  const deleteTask = (idx) => set('task_definitions', form.task_definitions.filter((_,i)=>i!==idx));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const url    = isEdit ? `/api/task-groups/templates/${template.id}` : '/api/task-groups/templates';
    const method = isEdit ? 'PATCH' : 'POST';
    await tFetch(url, { method, headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, environment_id: environment?.id }) });
    setSaving(false); onSave();
  };

  const totalTime = form.task_definitions.reduce((s,d)=>s+(d.estimated_minutes||0),0);
  const cat = CATEGORIES.find(c=>c.value===form.category);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,41,0.55)',zIndex:1300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.white,borderRadius:20,width:'100%',maxWidth:680,maxHeight:'92vh',overflow:'hidden',
        display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',fontFamily:F}}
        onMouseDown={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:'18px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${cat?.color||C.purple}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontSize:16}}>📋</span>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:800,color:C.text1}}>{isEdit?'Edit Task Group':'New Task Group'}</div>
            <div style={{fontSize:12,color:C.text3}}>{form.task_definitions.length} task{form.task_definitions.length!==1?'s':''}{totalTime>0?` · ~${totalTime} min total`:''}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:20,padding:0}}>×</button>
        </div>

        <div style={{overflowY:'auto',flex:1}}>
          {/* Group meta */}
          <div style={{padding:'20px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12}}>
              <div><Lbl>Group name *</Lbl>
                <Inp value={form.name} onChange={v=>set('name',v)} placeholder="e.g. New Starter Onboarding"/>
              </div>
              <div><Lbl>Category</Lbl>
                <Sel value={form.category} onChange={v=>set('category',v)} options={CATEGORIES}/>
              </div>
              <div><Lbl>Colour</Lbl>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                  {['#7c3aed','#4361EE','#0891b2','#0ca678','#f59f00','#e03131','#6b7280'].map(c=>(
                    <button key={c} onClick={()=>set('color',c)}
                      style={{width:24,height:24,borderRadius:'50%',background:c,border:form.color===c?`3px solid ${C.text1}`:'3px solid transparent',cursor:'pointer',padding:0}}/>
                  ))}
                </div>
              </div>
            </div>
            <div><Lbl>Description (optional)</Lbl>
              <Inp value={form.description} onChange={v=>set('description',v)} placeholder="When is this group used? e.g. For all new engineering hires"/>
            </div>
          </div>

          {/* Task definitions */}
          <div style={{padding:'20px 24px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Tasks in this group</div>
              <Btn onClick={addTask} variant="purple">+ Add task</Btn>
            </div>

            {form.task_definitions.length===0&&(
              <div style={{textAlign:'center',padding:'32px 20px',color:C.text3,background:C.bg,borderRadius:12,border:`1.5px dashed ${C.border}`}}>
                <div style={{fontSize:24,marginBottom:8}}>📋</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>No tasks yet</div>
                <div style={{fontSize:13}}>Click "+ Add task" to start building this group</div>
              </div>
            )}

            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {form.task_definitions.map((def,idx)=>(
                <TaskDefEditor key={idx} def={def} index={idx}
                  onChange={v=>updateTask(idx,v)}
                  onDelete={()=>deleteTask(idx)}
                  forms={forms} fileTypes={fileTypes}/>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'14px 24px',borderTop:`1px solid ${C.border}`,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={saving||!form.name.trim()}>
            {saving?'Saving…':isEdit?'Save changes':'Create group'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Main TaskGroupsSettings export ────────────────────────────────────────────
export default function TaskGroupsSettings({ environment }) {
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(null);  // null | template object | {}

  const load = useCallback(() => {
    if (!environment?.id) return;
    setLoading(true);
    tFetch(`/api/task-groups/templates?environment_id=${environment.id}`)
      .then(d=>{ setTemplates(Array.isArray(d)?d:[]); setLoading(false); })
      .catch(()=>setLoading(false));
  }, [environment?.id]);

  useEffect(()=>{ load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task group template? Tasks already assigned from it will not be affected.')) return;
    await tFetch(`/api/task-groups/templates/${id}`, { method:'DELETE' });
    load();
  };

  const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c=>[c.value,c]));

  return (
    <div style={{fontFamily:F}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text1}}>Task Group Templates</div>
          <div style={{fontSize:13,color:C.text3,marginTop:3}}>Build reusable groups of tasks that can be assigned to people manually or via workflows</div>
        </div>
        <Btn onClick={()=>setEditing({})} variant="primary">+ New group</Btn>
      </div>

      {/* Info banner */}
      <div style={{padding:'10px 16px',borderRadius:10,background:'#f0f9ff',border:'1px solid #bae6fd',fontSize:13,color:'#0369a1',marginBottom:20,lineHeight:1.6}}>
        <strong>How it works:</strong> Create a template with tasks → assign it to a person manually from their Tasks panel, or automatically via a workflow step (<em>Assign Task Group</em>) when they reach a certain stage. Each task in the group can have its own completion type (file upload, form, e-signature, etc.).
      </div>

      {loading && <div style={{textAlign:'center',color:C.text3,padding:40}}>Loading…</div>}

      {!loading && templates.length===0 && (
        <div style={{textAlign:'center',padding:'48px 20px',background:C.bg,borderRadius:16,border:`1.5px dashed ${C.border}`}}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <div style={{fontSize:16,fontWeight:700,color:C.text1,marginBottom:6}}>No task group templates yet</div>
          <div style={{fontSize:13,color:C.text3,marginBottom:20}}>Create your first group — e.g. "New Starter Onboarding" with Right to Work upload, contract signing, and form completion</div>
          <Btn onClick={()=>setEditing({})} variant="primary">Create first group</Btn>
        </div>
      )}

      {/* Template cards */}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {templates.map(tpl=>{
          const cat = CATEGORY_MAP[tpl.category] || CATEGORY_MAP.general;
          const taskCount = (tpl.task_definitions||[]).length;
          const totalTime = (tpl.task_definitions||[]).reduce((s,d)=>s+(d.estimated_minutes||0),0);
          const ctCounts  = {};
          (tpl.task_definitions||[]).forEach(d=>{ const ct=d.completion_type||'checkbox'; ctCounts[ct]=(ctCounts[ct]||0)+1; });
          return (
            <div key={tpl.id} style={{background:C.white,borderRadius:14,border:`1.5px solid ${C.border}`,padding:'16px 20px',
              display:'flex',alignItems:'flex-start',gap:14,transition:'box-shadow .15s'}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
              {/* Colour strip */}
              <div style={{width:4,alignSelf:'stretch',borderRadius:4,background:tpl.color||C.purple,flexShrink:0}}/>
              {/* Body */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <div style={{fontSize:15,fontWeight:700,color:C.text1}}>{tpl.name}</div>
                  <span style={{padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:600,background:`${cat.color}12`,color:cat.color}}>{cat.label}</span>
                </div>
                {tpl.description&&<div style={{fontSize:12,color:C.text3,marginBottom:8,lineHeight:1.5}}>{tpl.description}</div>}
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:12,color:C.text3}}>📋 {taskCount} task{taskCount!==1?'s':''}</span>
                  {totalTime>0&&<span style={{fontSize:12,color:C.text3}}>⏱ ~{totalTime} min</span>}
                  {Object.entries(ctCounts).map(([ct,n])=>{
                    const ctMeta = COMPLETION_TYPES.find(c=>c.value===ct);
                    return ctMeta ? (
                      <span key={ct} style={{fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:99,
                        background:`${ctMeta.color}12`,color:ctMeta.color}}>
                        {n}× {ctMeta.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
              {/* Actions */}
              <div style={{display:'flex',gap:8,flexShrink:0}}>
                <Btn onClick={()=>setEditing(tpl)}>Edit</Btn>
                <Btn onClick={()=>handleDelete(tpl.id)} variant="danger">Delete</Btn>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor modal */}
      {editing!==null && (
        <TemplateEditorModal
          template={editing?.id ? editing : null}
          environment={environment}
          onSave={()=>{ setEditing(null); load(); }}
          onClose={()=>setEditing(null)}/>
      )}
    </div>
  );
}
