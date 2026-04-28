// client/src/TaskModal.jsx — rich task creation/editing modal with completion types
import { useState, useEffect, useRef } from 'react';
import { tFetch } from './apiClient.js';

const C = {
  accent:'#4361EE', accentL:'#EEF2FF', text1:'#0D0D0F', text2:'#374151',
  text3:'#6b7280', border:'#e5e7eb', bg:'#f9fafb', white:'#ffffff',
  red:'#ef4444', green:'#10b981', amber:'#f59f00', purple:'#7c3aed',
  teal:'#0d9488', blue:'#3b82f6', pink:'#ec4899',
};
const F = "'DM Sans', -apple-system, sans-serif";

// ── Icon set (inline SVG) ─────────────────────────────────────────────────────
const PATHS = {
  checkbox:      'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  upload:        'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  form:          'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  read:          'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  signature:     'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
  video:         'M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
  link:          'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  approval:      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  x:             'M18 6L6 18M6 6l12 12',
  check:         'M20 6L9 17l-5-5',
  chevDown:      'M6 9l6 6 6-6',
  file:          'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6',
};
const Ic = ({ n, s=16, c='currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]||''}/>
  </svg>
);

// ── Completion type definitions ───────────────────────────────────────────────
export const COMPLETION_TYPES = [
  {
    value: 'checkbox',
    label: 'Checkbox',
    desc:  'Simple manual tick — "I have done this"',
    icon:  'checkbox',
    color: C.text3,
  },
  {
    value: 'file_upload',
    label: 'File Upload',
    desc:  'Person must upload a specific document',
    icon:  'upload',
    color: C.blue,
  },
  {
    value: 'form',
    label: 'Form Completion',
    desc:  'Person must fill in a linked form',
    icon:  'form',
    color: C.purple,
  },
  {
    value: 'document_read',
    label: 'Read & Acknowledge',
    desc:  'Person must read a document and confirm they have',
    icon:  'read',
    color: C.teal,
  },
  {
    value: 'e_signature',
    label: 'E-Signature',
    desc:  'Person must digitally sign a document',
    icon:  'signature',
    color: C.accent,
  },
  {
    value: 'video_watch',
    label: 'Video Watch',
    desc:  'Person must watch a video to completion',
    icon:  'video',
    color: C.pink,
  },
  {
    value: 'external_link',
    label: 'External Link',
    desc:  'Person must visit a URL and confirm they have',
    icon:  'link',
    color: C.amber,
  },
  {
    value: 'approval',
    label: 'Requires Approval',
    desc:  'A manager or admin must approve this task',
    icon:  'approval',
    color: C.green,
  },
];

const TASK_TYPES = [
  {value:'call',      label:'Call'},
  {value:'email',     label:'Email'},
  {value:'follow_up', label:'Follow-up'},
  {value:'review',    label:'Review'},
  {value:'interview', label:'Interview'},
  {value:'meeting',   label:'Meeting'},
  {value:'send_docs', label:'Send Docs'},
  {value:'chase',     label:'Chase'},
  {value:'other',     label:'Other'},
];
const PRIORITIES = [
  {value:'urgent', label:'Urgent', color:'#ef4444'},
  {value:'high',   label:'High',   color:'#f97316'},
  {value:'medium', label:'Medium', color:'#eab308'},
  {value:'low',    label:'Low',    color:'#22c55e'},
];
const STATUSES = [
  {value:'todo',        label:'To Do'},
  {value:'in_progress', label:'In Progress'},
  {value:'blocked',     label:'Blocked'},
  {value:'done',        label:'Done'},
];
const REMINDERS = [
  {value:'',   label:'No reminder'},
  {value:'15m',label:'15 min before'},
  {value:'30m',label:'30 min before'},
  {value:'1h', label:'1 hour before'},
  {value:'3h', label:'3 hours before'},
  {value:'1d', label:'1 day before'},
  {value:'2d', label:'2 days before'},
];
const ORIGIN_STYLES = {
  manual:   {label:'Manual',   bg:'#f3f4f6', color:'#374151'},
  copilot:  {label:'Copilot',  bg:'#EEF2FF', color:'#4361EE'},
  workflow: {label:'Workflow', bg:'#f0fdf4', color:'#10b981'},
  trigger:  {label:'Trigger',  bg:'#FEF3C7', color:'#d97706'},
  group:    {label:'Group',    bg:'#faf5ff', color:'#7c3aed'},
};

function computeReminderAt(dueDate, dueTime, val) {
  if (!dueDate || !val) return null;
  const base = new Date(`${dueDate}T${dueTime||'09:00'}:00`);
  const mins = {15:15,30:30,'1h':60,'3h':180,'1d':1440,'2d':2880}[val];
  return mins ? new Date(base.getTime() - mins*60000).toISOString() : null;
}
function safeJson(v, fallback) {
  try { return typeof v === 'string' ? JSON.parse(v) : (v ?? fallback); }
  catch { return fallback; }
}

// ── Shared input components ───────────────────────────────────────────────────
const Inp = ({ value, onChange, placeholder, type='text', style={}, rows }) =>
  rows ? (
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,background:C.white,
        fontSize:13,color:C.text1,fontFamily:F,outline:'none',boxSizing:'border-box',resize:'vertical',...style}}/>
  ) : (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,background:C.white,
        fontSize:13,color:C.text1,fontFamily:F,outline:'none',boxSizing:'border-box',...style}}/>
  );

const Sel = ({ value, onChange, options, style={} }) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{width:'100%',padding:'8px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,background:C.white,
      fontSize:13,color:C.text1,fontFamily:F,cursor:'pointer',outline:'none',...style}}>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Lbl = ({ children, sub }) => (
  <div style={{marginBottom:5}}>
    <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.06em'}}>{children}</div>
    {sub && <div style={{fontSize:11,color:C.text3,marginTop:2}}>{sub}</div>}
  </div>
);

// ── Priority picker ───────────────────────────────────────────────────────────
function PriorityPicker({ value, onChange }) {
  return (
    <div style={{display:'flex',gap:6}}>
      {PRIORITIES.map(p => (
        <button key={p.value} onClick={()=>onChange(p.value)}
          style={{flex:1,padding:'6px 4px',borderRadius:8,
            border:`1.5px solid ${value===p.value?p.color:C.border}`,
            background:value===p.value?`${p.color}18`:C.white,
            color:value===p.value?p.color:C.text3,
            fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:F}}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Checklist editor ──────────────────────────────────────────────────────────
function ChecklistEditor({ items, onChange }) {
  const [newItem, setNewItem] = useState('');
  const ref = useRef();
  const add = () => {
    const t = newItem.trim(); if (!t) return;
    onChange([...items, {id:Date.now().toString(), text:t, done:false}]);
    setNewItem(''); setTimeout(()=>ref.current?.focus(), 50);
  };
  return (
    <div>
      {items.map(item => (
        <div key={item.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:`1px solid ${C.border}`}}>
          <input type="checkbox" checked={item.done} onChange={()=>onChange(items.map(i=>i.id===item.id?{...i,done:!i.done}:i))}
            style={{cursor:'pointer',accentColor:C.green,width:14,height:14,flexShrink:0}}/>
          <span style={{flex:1,fontSize:13,color:item.done?C.text3:C.text1,textDecoration:item.done?'line-through':'none'}}>{item.text}</span>
          <button onClick={()=>onChange(items.filter(i=>i.id!==item.id))}
            style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:16,padding:0}}>×</button>
        </div>
      ))}
      <div style={{display:'flex',gap:6,marginTop:8}}>
        <input ref={ref} value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}
          placeholder="Add checklist item…"
          style={{flex:1,padding:'6px 10px',borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,outline:'none'}}/>
        <button onClick={add}
          style={{padding:'6px 12px',borderRadius:7,border:'none',background:C.accent,color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>Add</button>
      </div>
    </div>
  );
}

// ── Completion type picker (icon grid) ────────────────────────────────────────
function CompletionTypePicker({ value, onChange }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
      {COMPLETION_TYPES.map(ct => {
        const active = value === ct.value;
        return (
          <button key={ct.value} onClick={()=>onChange(ct.value)}
            style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',borderRadius:10,textAlign:'left',
              border:`1.5px solid ${active?ct.color:C.border}`,
              background:active?`${ct.color}0f`:C.white,
              cursor:'pointer',fontFamily:F,transition:'all .12s'}}>
            <div style={{width:28,height:28,borderRadius:7,background:active?`${ct.color}20`:'#f3f4f6',
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
              <Ic n={ct.icon} s={14} c={active?ct.color:C.text3}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:active?ct.color:C.text1,marginBottom:1}}>{ct.label}</div>
              <div style={{fontSize:11,color:C.text3,lineHeight:1.4}}>{ct.desc}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Completion config editors (type-specific) ─────────────────────────────────
function CompletionConfigEditor({ type, config, onChange, environmentId }) {
  const [forms,       setForms]       = useState([]);
  const [fileTypes,   setFileTypes]   = useState([]);
  const [companyDocs, setCompanyDocs] = useState([]);
  const [users,       setUsers]       = useState([]);

  useEffect(() => {
    if (!environmentId) return;
    if (type === 'form') {
      tFetch(`/api/forms?environment_id=${environmentId}`).then(r=>r.json())
        .then(d=>setForms(Array.isArray(d)?d:[])).catch(()=>{});
    }
    if (type === 'file_upload') {
      tFetch('/api/file-types').then(r=>r.json())
        .then(d=>setFileTypes(Array.isArray(d)?d:[])).catch(()=>{});
    }
    if (type === 'document_read' || type === 'e_signature') {
      tFetch(`/api/company-documents?environment_id=${environmentId}`).then(r=>r.json())
        .then(d=>setCompanyDocs(Array.isArray(d)?d:[])).catch(()=>{});
    }
    if (type === 'approval') {
      tFetch(`/api/users?environment_id=${environmentId}`).then(r=>r.json())
        .then(d=>setUsers(Array.isArray(d)?d:[])).catch(()=>{});
    }
  }, [type, environmentId]);

  const set = (k, v) => onChange({ ...config, [k]: v });
  const infoBox = (text) => (
    <div style={{padding:'8px 12px',borderRadius:8,background:'#f0f9ff',border:'1px solid #bae6fd',fontSize:12,color:'#0369a1',lineHeight:1.5}}>{text}</div>
  );

  if (type === 'checkbox') return infoBox('No extra configuration needed — the person simply ticks this task as done.');

  if (type === 'file_upload') return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <Lbl sub="Pick the expected document type from your File Types settings">Expected file type</Lbl>
        <Sel value={config.file_type_id||''} onChange={v=>{
          const ft = fileTypes.find(f=>f.id===v);
          set('file_type_id', v); onChange({...config, file_type_id:v, file_type_name:ft?.name||''});
        }} options={[{value:'',label:'Any file type'},...fileTypes.map(f=>({value:f.id,label:f.name}))]}/>
      </div>
      <div>
        <Lbl>Instructions for the person (optional)</Lbl>
        <Inp value={config.instructions||''} onChange={v=>set('instructions',v)} rows={2}
          placeholder="e.g. Please upload a clear scan of both sides of your passport"/>
      </div>
      <div>
        <Lbl>AI extraction on upload?</Lbl>
        <div style={{display:'flex',gap:8,marginTop:4}}>
          {[['none','No — just store it'],['extract','Yes — extract fields automatically']].map(([v,l])=>(
            <button key={v} onClick={()=>set('ai_extract',v)}
              style={{flex:1,padding:'7px 10px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F,
                border:`1.5px solid ${(config.ai_extract||'none')===v?C.accent:C.border}`,
                background:(config.ai_extract||'none')===v?C.accentL:C.white,
                color:(config.ai_extract||'none')===v?C.accent:C.text2}}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (type === 'form') return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <Lbl sub="The person will be asked to complete this form to mark the task done">Form to complete</Lbl>
        <Sel value={config.form_id||''} onChange={v=>{
          const f = forms.find(fm=>fm.id===v);
          onChange({...config, form_id:v, form_name:f?.name||''});
        }} options={[{value:'',label:'Select a form…'},...forms.map(f=>({value:f.id,label:f.name}))]}/>
      </div>
      {config.form_id && (
        <div style={{padding:'8px 12px',borderRadius:8,background:'#f0fdf4',border:'1px solid #bbf7d0',fontSize:12,color:'#15803d'}}>
          ✓ The form will open inline when the person clicks this task
        </div>
      )}
      <div>
        <Lbl>Instructions (optional)</Lbl>
        <Inp value={config.instructions||''} onChange={v=>set('instructions',v)} rows={2}
          placeholder="e.g. Please complete this before your first day"/>
      </div>
    </div>
  );

  if (type === 'document_read') return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <Lbl sub="Link to a Company Document or paste a URL">Document to read</Lbl>
        <Sel value={config.company_doc_id||''} onChange={v=>{
          const d = companyDocs.find(doc=>doc.id===v);
          onChange({...config, company_doc_id:v, document_title:d?.title||d?.name||'', document_url:d?.file_url||d?.url||''});
        }} options={[{value:'',label:'Select a company document…'},...companyDocs.map(d=>({value:d.id,label:d.title||d.name}))]}/>
      </div>
      <div>
        <Lbl>Or paste a document URL directly</Lbl>
        <Inp value={config.document_url||''} onChange={v=>set('document_url',v)}
          placeholder="https://…"/>
      </div>
      <div>
        <Lbl>Document title (shown to person)</Lbl>
        <Inp value={config.document_title||''} onChange={v=>set('document_title',v)}
          placeholder="e.g. Employee Handbook 2026"/>
      </div>
      <div>
        <Lbl>Acknowledgement statement</Lbl>
        <Inp value={config.ack_statement||''} onChange={v=>set('ack_statement',v)}
          placeholder="I confirm I have read and understood this document"
          style={{fontStyle:'italic'}}/>
      </div>
    </div>
  );

  if (type === 'e_signature') return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <Lbl sub="Select a Company Document or paste a PDF URL">Document to sign</Lbl>
        <Sel value={config.company_doc_id||''} onChange={v=>{
          const d = companyDocs.find(doc=>doc.id===v);
          onChange({...config, company_doc_id:v, document_title:d?.title||d?.name||'', document_url:d?.file_url||d?.url||''});
        }} options={[{value:'',label:'Select a company document…'},...companyDocs.map(d=>({value:d.id,label:d.title||d.name}))]}/>
      </div>
      <div>
        <Lbl>Or paste a document URL</Lbl>
        <Inp value={config.document_url||''} onChange={v=>set('document_url',v)} placeholder="https://…"/>
      </div>
      <div>
        <Lbl>Document title</Lbl>
        <Inp value={config.document_title||''} onChange={v=>set('document_title',v)}
          placeholder="e.g. Employment Contract"/>
      </div>
      <div style={{padding:'8px 12px',borderRadius:8,background:'#f0f9ff',border:'1px solid #bae6fd',fontSize:12,color:'#0369a1'}}>
        The signed signature will be saved to the person's file attachments automatically.
      </div>
    </div>
  );

  if (type === 'video_watch') return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <Lbl sub="YouTube, Vimeo, or direct MP4 link">Video URL</Lbl>
        <Inp value={config.video_url||''} onChange={v=>set('video_url',v)}
          placeholder="https://youtube.com/watch?v=…"/>
      </div>
      <div>
        <Lbl>Video title</Lbl>
        <Inp value={config.video_title||''} onChange={v=>set('video_title',v)}
          placeholder="e.g. Welcome to the team"/>
      </div>
      <div>
        <Lbl sub="Person must watch this much before marking done">Minimum watch % to complete</Lbl>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <input type="range" min={10} max={100} step={5} value={config.min_watch_pct||80}
            onChange={e=>set('min_watch_pct',Number(e.target.value))}
            style={{flex:1,accentColor:C.pink}}/>
          <span style={{fontSize:13,fontWeight:700,color:C.text1,minWidth:32}}>{config.min_watch_pct||80}%</span>
        </div>
      </div>
    </div>
  );

  if (type === 'external_link') return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <Lbl>URL to visit</Lbl>
        <Inp value={config.url||''} onChange={v=>set('url',v)} placeholder="https://…"/>
      </div>
      <div>
        <Lbl>Button label</Lbl>
        <Inp value={config.link_label||''} onChange={v=>set('link_label',v)}
          placeholder="e.g. Book your desk via Condeco"/>
      </div>
      <div>
        <Lbl>Instructions (optional)</Lbl>
        <Inp value={config.instructions||''} onChange={v=>set('instructions',v)} rows={2}
          placeholder="e.g. Log in with your company email and complete your preferences"/>
      </div>
      <div style={{padding:'8px 12px',borderRadius:8,background:'#fffbeb',border:'1px solid #fde68a',fontSize:12,color:'#92400e'}}>
        The person confirms they have visited the link — this is on trust.
      </div>
    </div>
  );

  if (type === 'approval') return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <Lbl sub="Leave blank to allow any admin to approve">Specific approver (optional)</Lbl>
        <Sel value={config.approver_user_id||''} onChange={v=>{
          const u = users.find(usr=>usr.id===v);
          onChange({...config, approver_user_id:v, approver_name:[u?.first_name,u?.last_name].filter(Boolean).join(' ')||u?.email||''});
        }} options={[{value:'',label:'Any admin / manager'},...users.map(u=>({value:u.id,label:[u.first_name,u.last_name].filter(Boolean).join(' ')||u.email}))]}/>
      </div>
      <div>
        <Lbl>Approval note prompt (shown to approver)</Lbl>
        <Inp value={config.approval_note_prompt||''} onChange={v=>set('approval_note_prompt',v)}
          placeholder="e.g. Confirm Right to Work documents are valid" rows={2}/>
      </div>
      <div style={{padding:'8px 12px',borderRadius:8,background:'#f0fdf4',border:'1px solid #bbf7d0',fontSize:12,color:'#15803d'}}>
        This task shows as "Awaiting approval" to the person. The approver gets a notification and can approve or reject with a note.
      </div>
    </div>
  );

  return null;
}

// ── Main TaskModal export ─────────────────────────────────────────────────────
export default function TaskModal({ task, defaultValues={}, environmentId, onSave, onClose }) {
  const isEdit = !!task;
  const [tab, setTab]     = useState('main');
  const [saving, setSaving] = useState(false);
  const [users, setUsers]   = useState([]);

  const [form, setForm] = useState({
    title:       task?.title       || '',
    task_type:   task?.task_type   || 'follow_up',
    priority:    task?.priority    || 'medium',
    status:      task?.status      || 'todo',
    due_date:    task?.due_date    || '',
    due_time:    task?.due_time    || '',
    reminder:    '',
    description: task?.description || '',
    assignee_id: task?.assignee_id || '',
    record_id:   task?.record_id   || defaultValues.record_id   || '',
    record_name: task?.record_name || defaultValues.record_name || '',
    object_id:   task?.object_id   || defaultValues.object_id   || '',
    object_name: task?.object_name || defaultValues.object_name || '',
    checklist:   safeJson(task?.checklist, []),
    created_by:  task?.created_by  || 'manual',
    // Completion
    completion_type:   task?.completion_type   || 'checkbox',
    completion_config: safeJson(task?.completion_config, {}),
    completion_data:   safeJson(task?.completion_data, null),
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!environmentId) return;
    tFetch(`/api/users?environment_id=${environmentId}`).then(r=>r.json())
      .then(d=>setUsers(Array.isArray(d)?d:[])).catch(()=>{});
  }, [environmentId]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const reminderAt = form.reminder ? computeReminderAt(form.due_date, form.due_time, form.reminder) : null;
    const payload = {
      ...form,
      reminder_at:      reminderAt,
      environment_id:   environmentId,
      checklist:        JSON.stringify(form.checklist),
      completion_config: JSON.stringify(form.completion_config),
      completion_data:  form.completion_data ? JSON.stringify(form.completion_data) : null,
    };
    delete payload.reminder;
    try {
      const url    = isEdit ? `/api/calendar/tasks/${task.id}` : '/api/calendar/tasks';
      const method = isEdit ? 'PATCH' : 'POST';
      const r = await tFetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      onSave?.(await r.json()); onClose?.();
    } catch(e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    await tFetch(`/api/calendar/tasks/${task.id}`, { method:'DELETE' });
    onSave?.(null); onClose?.();
  };

  const origin    = ORIGIN_STYLES[form.created_by] || ORIGIN_STYLES.manual;
  const ctMeta    = COMPLETION_TYPES.find(c=>c.value===form.completion_type) || COMPLETION_TYPES[0];
  const tabs = [
    ['main',       'Details'],
    ['completion', `Completion${form.completion_type!=='checkbox'?` · ${ctMeta.label}`:''}`],
    ['checklist',  `Checklist${form.checklist.length>0?` (${form.checklist.length})`:''}`],
    ['more',       'More'],
  ];

  return (
    <div onMouseDown={e=>e.target===e.currentTarget&&onClose?.()}
      style={{position:'fixed',inset:0,background:'rgba(15,23,41,0.55)',zIndex:1300,
        display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onMouseDown={e=>e.stopPropagation()}
        style={{background:C.white,borderRadius:20,width:'100%',maxWidth:540,maxHeight:'90vh',
          overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',fontFamily:F}}>

        {/* Header */}
        <div style={{padding:'18px 24px 0',borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <div style={{flex:1,fontSize:15,fontWeight:800,color:C.text1}}>{isEdit?'Edit Task':'New Task'}</div>
            <span style={{padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:700,background:origin.bg,color:origin.color}}>{origin.label}</span>
            {/* Completion type badge */}
            <span style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:700,
              background:`${ctMeta.color}12`,color:ctMeta.color}}>
              <Ic n={ctMeta.icon} s={11} c={ctMeta.color}/> {ctMeta.label}
            </span>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:20,padding:0,lineHeight:1}}>×</button>
          </div>
          <div style={{display:'flex',overflow:'auto'}}>
            {tabs.map(([id,label]) => (
              <button key={id} onClick={()=>setTab(id)}
                style={{padding:'6px 14px',fontSize:12,fontWeight:tab===id?700:500,color:tab===id?C.accent:C.text3,
                  background:'none',border:'none',borderBottom:`2px solid ${tab===id?C.accent:'transparent'}`,
                  cursor:'pointer',fontFamily:F,whiteSpace:'nowrap'}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{padding:'20px 24px',overflowY:'auto',flex:1}}>

          {/* ── Details tab ── */}
          {tab==='main' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <Lbl>Task</Lbl>
                <Inp value={form.title} onChange={v=>set('title',v)} placeholder="What needs to be done?"
                  style={{fontSize:15,fontWeight:600,padding:'10px 12px'}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><Lbl>Type</Lbl>
                  <Sel value={form.task_type} onChange={v=>set('task_type',v)} options={TASK_TYPES}/>
                </div>
                <div><Lbl>Status</Lbl>
                  <Sel value={form.status} onChange={v=>set('status',v)} options={STATUSES}/>
                </div>
              </div>
              <div><Lbl>Priority</Lbl><PriorityPicker value={form.priority} onChange={v=>set('priority',v)}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><Lbl>Due date</Lbl><Inp type="date" value={form.due_date} onChange={v=>set('due_date',v)}/></div>
                <div><Lbl>Due time</Lbl><Inp type="time" value={form.due_time} onChange={v=>set('due_time',v)}/></div>
              </div>
              {form.due_date && (
                <div><Lbl>Reminder</Lbl>
                  <Sel value={form.reminder} onChange={v=>set('reminder',v)} options={REMINDERS}/>
                </div>
              )}
              <div><Lbl>Notes</Lbl>
                <Inp value={form.description} onChange={v=>set('description',v)} rows={3}
                  placeholder="Add notes or context…"/>
              </div>
            </div>
          )}

          {/* ── Completion tab ── */}
          {tab==='completion' && (
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div>
                <Lbl sub="How does this task get marked as done?">Completion method</Lbl>
                <CompletionTypePicker value={form.completion_type} onChange={v=>{ set('completion_type',v); set('completion_config',{}); }}/>
              </div>
              {form.completion_type !== 'checkbox' && (
                <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16}}>
                  <Lbl sub={`Configure what the person needs to do`}>{ctMeta.label} settings</Lbl>
                  <CompletionConfigEditor
                    type={form.completion_type}
                    config={form.completion_config}
                    onChange={v=>set('completion_config',v)}
                    environmentId={environmentId}/>
                </div>
              )}
            </div>
          )}

          {/* ── Checklist tab ── */}
          {tab==='checklist' && (
            <div>
              <Lbl>Sub-tasks / checklist items</Lbl>
              <ChecklistEditor items={form.checklist} onChange={v=>set('checklist',v)}/>
            </div>
          )}

          {/* ── More tab ── */}
          {tab==='more' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div><Lbl>Assigned to</Lbl>
                <Sel value={form.assignee_id} onChange={v=>set('assignee_id',v)}
                  options={[{value:'',label:'Unassigned'},...users.map(u=>({value:u.id,label:`${u.first_name||''} ${u.last_name||''}`.trim()||u.email}))]}/>
              </div>
              {form.record_name && (
                <div><Lbl>Linked record</Lbl>
                  <div style={{padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,
                    background:C.bg,color:C.text2,display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:12,color:C.text3}}>{form.object_name}</span>
                    <span style={{color:C.text3}}>·</span>
                    <span style={{fontWeight:600}}>{form.record_name}</span>
                  </div>
                </div>
              )}
              {form.task_group_id && (
                <div><Lbl>Task group</Lbl>
                  <div style={{padding:'8px 12px',borderRadius:8,border:'1.5px solid #ddd6fe',fontSize:12,
                    background:'#faf5ff',color:C.purple}}>
                    Part of a task group assignment
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'14px 24px',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
          {isEdit && (
            <button onClick={handleDelete}
              style={{padding:'8px 14px',borderRadius:9,border:`1.5px solid ${C.border}`,
                background:C.white,color:C.red,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>
              Delete
            </button>
          )}
          <div style={{flex:1}}/>
          <button onClick={onClose}
            style={{padding:'8px 18px',borderRadius:9,border:`1.5px solid ${C.border}`,
              background:C.white,color:C.text2,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving||!form.title.trim()}
            style={{padding:'8px 22px',borderRadius:9,border:'none',
              background:form.title.trim()?C.accent:C.border,
              color:form.title.trim()?'white':C.text3,
              fontSize:13,fontWeight:700,cursor:form.title.trim()?'pointer':'default',fontFamily:F}}>
            {saving?'Saving…':isEdit?'Save':'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
