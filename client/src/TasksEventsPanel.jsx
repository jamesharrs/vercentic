// client/src/TasksEventsPanel.jsx — tasks & events panel with type-aware completion
import { tFetch } from "./apiClient.js";
import { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { useRecordSync } from "./hooks/useRecordSync.js";
import { COMPLETION_TYPES } from "./TaskModal.jsx";
import TaskModal from "./TaskModal.jsx";

const PRIORITY = {
  urgent: { label:"Urgent", color:"#ef4444", bg:"#fef2f2" },
  high:   { label:"High",   color:"#f97316", bg:"#fff7ed" },
  medium: { label:"Medium", color:"#eab308", bg:"#fefce8" },
  low:    { label:"Low",    color:"#22c55e", bg:"#f0fdf4" },
};
const STATUS = {
  todo:        { label:"To Do",       color:"#6b7280", bg:"#f3f4f6" },
  in_progress: { label:"In Progress", color:"#3b5bdb", bg:"#eef1ff" },
  blocked:     { label:"Blocked",     color:"#ef4444", bg:"#fef2f2" },
  done:        { label:"Done",        color:"#22c55e", bg:"#f0fdf4" },
};
const EVENT_TYPES = {
  general:   { label:"General",   color:"#6366f1" },
  meeting:   { label:"Meeting",   color:"#0ea5e9" },
  deadline:  { label:"Deadline",  color:"#ef4444" },
  interview: { label:"Interview", color:"#8b5cf6" },
  campus:    { label:"Campus",    color:"#f59e0b" },
};
const F = "'Plus Jakarta Sans', -apple-system, sans-serif";
const C = { accent:"#4361EE", green:"#10b981", red:"#ef4444", amber:"#f59f00", purple:"#7c3aed",
  text1:"#111827", text2:"#374151", text3:"#9ca3af", border:"#f3f4f6", white:"#ffffff" };

function safeJson(v, fallback) {
  try {
    const parsed = typeof v === 'string' ? JSON.parse(v) : v;
    if (parsed === null || parsed === undefined) return fallback;
    // If caller expects an array, ensure we return one
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed;
  } catch { return fallback; }
}

function Badge({ children, color, bg }) {
  return <span style={{display:"inline-flex",alignItems:"center",padding:"1px 6px",borderRadius:99,
    fontSize:11,fontWeight:600,color,background:bg||`${color}18`,whiteSpace:"nowrap"}}>{children}</span>;
}

// ── Inline SVG icon ───────────────────────────────────────────────────────────
const ICON_PATHS = {
  upload:    'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  form:      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  read:      'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  signature: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
  video:     'M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
  link:      'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  approval:  'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  check:     'M20 6L9 17l-5-5',
  clock:     'M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v5l3 3',
};
const Ic = ({ n, s=14, c='currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={ICON_PATHS[n]||''}/>
  </svg>
);

// ── Signature pad modal ───────────────────────────────────────────────────────
function SignaturePad({ onSave, onClose }) {
  const canvasRef = useRef();
  const drawing   = useRef(false);
  const draw = (e) => {
    if (!drawing.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0D0D0F';
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
  };
  const start = (e) => {
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d'); ctx.beginPath();
  };
  const stop = () => { drawing.current = false; const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); };
  const clear = () => { const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height); };
  const save  = () => onSave(canvasRef.current.toDataURL('image/png'));
  return ReactDOM.createPortal(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1400,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:480,boxShadow:'0 16px 48px rgba(0,0,0,0.2)'}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:12,fontFamily:F}}>Sign here</div>
        <canvas ref={canvasRef} width={432} height={180} style={{border:'1.5px solid #e5e7eb',borderRadius:10,cursor:'crosshair',width:'100%',touchAction:'none'}}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}/>
        <div style={{fontSize:11,color:'#9ca3af',textAlign:'center',margin:'6px 0 16px'}}>Draw your signature above</div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={clear} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>Clear</button>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>Cancel</button>
          <button onClick={save} style={{padding:'8px 20px',borderRadius:8,border:'none',background:C.accent,color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>Save Signature</button>
        </div>
      </div>
    </div>
  , document.body);
}

// ── Acknowledge modal (read & accept) ─────────────────────────────────────────
function AcknowledgeModal({ config, onConfirm, onClose }) {
  const [accepted, setAccepted] = useState(false);
  const statement = config.ack_statement || 'I confirm I have read and understood this document';
  return ReactDOM.createPortal(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1400,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'white',borderRadius:16,padding:24,width:'100%',maxWidth:520,boxShadow:'0 16px 48px rgba(0,0,0,0.2)'}}>
        <div style={{fontSize:15,fontWeight:700,marginBottom:4,fontFamily:F}}>{config.document_title||'Document'}</div>
        <div style={{fontSize:12,color:'#9ca3af',marginBottom:16}}>Read & Acknowledge</div>
        {config.document_url && (
          <a href={config.document_url} target="_blank" rel="noreferrer"
            style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px',background:'#f8fafc',borderRadius:10,
              border:'1.5px solid #e2e8f0',marginBottom:16,textDecoration:'none',color:'#1e293b',fontSize:13,fontWeight:600}}>
            <Ic n="read" s={16} c={C.accent}/>
            Open document in new tab ↗
          </a>
        )}
        <label style={{display:'flex',gap:10,alignItems:'flex-start',cursor:'pointer',padding:'12px',borderRadius:10,
          border:`1.5px solid ${accepted?C.green:C.accent+'40'}`,background:accepted?'#f0fdf4':'#f8f9ff'}}>
          <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} style={{marginTop:2,accentColor:C.green,width:15,height:15}}/>
          <span style={{fontSize:13,fontStyle:'italic',color:'#374151',lineHeight:1.5}}>{statement}</span>
        </label>
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>Cancel</button>
          <button onClick={()=>accepted&&onConfirm()} disabled={!accepted}
            style={{flex:2,padding:'9px',borderRadius:8,border:'none',fontSize:13,fontWeight:700,cursor:accepted?'pointer':'default',fontFamily:F,
              background:accepted?C.green:'#e5e7eb',color:accepted?'white':'#9ca3af'}}>
            Confirm & Mark Done
          </button>
        </div>
      </div>
    </div>
  , document.body);
}

// ── Quick task edit modal ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function QuickTaskModal({ task, defaultDate, envId, recId, recName, onDone }) {
  const [title,    setTitle]    = useState(task?.title    || "");
  const [due,      setDue]      = useState(task?.due_date || defaultDate || "");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [status,   setStatus]   = useState(task?.status   || "todo");
  const [saving,   setSaving]   = useState(false);
  const handleSave = async () => {
    if (!title.trim()) return; setSaving(true);
    const body = { title, due_date:due||null, priority, status, environment_id:envId, record_id:recId, record_name:recName };
    if (task) await tFetch(`/api/calendar/tasks/${task.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    else      await tFetch("/api/calendar/tasks",            {method:"POST", headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    setSaving(false); onDone();
  };
  const handleDelete = async () => { await tFetch(`/api/calendar/tasks/${task.id}`,{method:"DELETE"}); onDone(); };
  return ReactDOM.createPortal(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onMouseDown={e=>e.target===e.currentTarget&&onDone()}>
      <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:400,padding:24,boxShadow:"0 16px 48px rgba(0,0,0,0.15)"}}
        onMouseDown={e=>e.stopPropagation()}>
        <h4 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,fontFamily:F}}>{task?"Edit Task":"New Task"}</h4>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task title *" autoFocus
          style={{width:"100%",padding:"8px 10px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:8,fontFamily:F,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <input type="date" value={due} onChange={e=>setDue(e.target.value)}
            style={{padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:8,fontFamily:F,boxSizing:"border-box"}}/>
          <select value={priority} onChange={e=>setPriority(e.target.value)}
            style={{padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:8,fontFamily:F}}>
            {Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <select value={status} onChange={e=>setStatus(e.target.value)}
          style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:8,fontFamily:F,marginBottom:14,boxSizing:"border-box"}}>
          {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
          <div>{task&&<button onClick={handleDelete} style={{padding:"7px 14px",borderRadius:8,border:"1px solid #fecaca",background:"#fef2f2",color:"#ef4444",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Delete</button>}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onDone} style={{padding:"7px 14px",borderRadius:8,border:"1px solid #e5e7eb",background:"white",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Cancel</button>
            <button onClick={handleSave} disabled={!title.trim()||saving}
              style={{padding:"7px 14px",borderRadius:8,border:"none",background:"#3b5bdb",color:"white",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F,opacity:!title.trim()||saving?0.5:1}}>
              {saving?"Saving…":task?"Save":"Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  , document.body);
}

// ── Inline form completion modal ──────────────────────────────────────────────
function TaskFormModal({ task, config, onComplete, onClose }) {
  const [form,     setForm]     = useState(null);
  const [formData, setFormData] = useState({});
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!config.form_id) return;
    tFetch(`/api/forms/${config.form_id}`).then(r=>r.json())
      .then(d => { if (d.id) setForm(d); })
      .catch(() => setError('Could not load form.'));
  }, [config.form_id]);

  const requiredFields = (form?.fields || []).filter(f => f.required);
  const allFilled = requiredFields.every(f => {
    const v = formData[f.api_key];
    return v !== undefined && v !== '' && v !== null;
  });

  const handleSubmit = async () => {
    if (!allFilled) { setError('Please fill in all required fields.'); return; }
    setSaving(true);
    try {
      await tFetch(`/api/forms/${config.form_id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id:      task.record_id,
          environment_id: task.environment_id,
          data:           formData,
          submitted_by:   'task_completion',
        }),
      });
      onComplete({ form_submitted: true, form_id: config.form_id, form_name: config.form_name || form?.name, submitted_at: new Date().toISOString() });
    } catch(e) {
      setError('Submission failed — please try again.');
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1400,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
      onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:540,maxHeight:'85vh',
        display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',fontFamily:F}}
        onMouseDown={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:'18px 24px 14px',borderBottom:'1px solid #f0f0f0',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:32,height:32,borderRadius:8,background:'#f5f3ff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Ic n="form" s={16} c="#7c3aed"/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:'#111827'}}>{config.form_name || form?.name || 'Complete Form'}</div>
            {config.instructions && <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>{config.instructions}</div>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:20,padding:0,lineHeight:1}}>×</button>
        </div>

        {/* Body */}
        <div style={{padding:'20px 24px',overflowY:'auto',flex:1}}>
          {!form && !error && <div style={{textAlign:'center',color:'#9ca3af',padding:32}}>Loading form…</div>}
          {error  && <div style={{padding:'10px 14px',borderRadius:8,background:'#fef2f2',border:'1px solid #fecaca',color:'#ef4444',fontSize:13}}>{error}</div>}
          {form && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {(form.fields||[]).map((field,i) => (
                <TaskFormField key={field.id||i} field={field}
                  value={formData[field.api_key] ?? ''}
                  onChange={v => setFormData(prev => ({...prev, [field.api_key]: v}))}/>
              ))}
              {form.fields?.length === 0 && (
                <div style={{textAlign:'center',color:'#9ca3af',padding:20,fontSize:13}}>This form has no fields configured.</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'14px 24px',borderTop:'1px solid #f0f0f0',display:'flex',gap:8,alignItems:'center'}}>
          {requiredFields.length > 0 && (
            <span style={{fontSize:11,color:'#9ca3af',flex:1}}>{requiredFields.length} required field{requiredFields.length!==1?'s':''}</span>
          )}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'8px 18px',borderRadius:9,border:'1px solid #e5e7eb',background:'white',color:'#374151',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving||!form}
            style={{padding:'8px 22px',borderRadius:9,border:'none',fontSize:13,fontWeight:700,cursor:form?'pointer':'default',fontFamily:F,
              background:allFilled&&form?'#7c3aed':'#e5e7eb',color:allFilled&&form?'white':'#9ca3af'}}>
            {saving?'Submitting…':'Submit & Complete'}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}

// ── Form field renderer (for TaskFormModal) ───────────────────────────────────
function TaskFormField({ field, value, onChange }) {
  const base = { width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid #e5e7eb',
    fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box', color:'#111827' };
  const lbl = (
    <div style={{fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:5}}>
      {field.label||field.name} {field.required&&<span style={{color:'#ef4444'}}>*</span>}
    </div>
  );
  switch (field.field_type) {
    case 'text':     return <div>{lbl}<input value={value} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||''} style={base}/></div>;
    case 'textarea': return <div>{lbl}<textarea value={value} onChange={e=>onChange(e.target.value)} rows={3} placeholder={field.placeholder||''} style={{...base,resize:'vertical'}}/></div>;
    case 'number':   return <div>{lbl}<input type="number" value={value} onChange={e=>onChange(e.target.value)} style={base}/></div>;
    case 'date':     return <div>{lbl}<input type="date" value={value} onChange={e=>onChange(e.target.value)} style={base}/></div>;
    case 'email':    return <div>{lbl}<input type="email" value={value} onChange={e=>onChange(e.target.value)} style={base}/></div>;
    case 'boolean':  return (
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)} style={{width:16,height:16,accentColor:'#7c3aed',cursor:'pointer'}}/>
        <span style={{fontSize:13,color:'#374151'}}>{field.label||field.name} {field.required&&<span style={{color:'#ef4444'}}>*</span>}</span>
      </div>
    );
    case 'select': return (
      <div>{lbl}
        <select value={value} onChange={e=>onChange(e.target.value)} style={base}>
          <option value="">Select…</option>
          {(field.options||[]).map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
    default: return <div>{lbl}<input value={value} onChange={e=>onChange(e.target.value)} style={base}/></div>;
  }
}

// ── Type-aware TaskRow ────────────────────────────────────────────────────────
function TaskRow({ task, onRefresh }) {
  const [acting,    setActing]    = useState(false);  // uploading / submitting
  const [showSign,  setShowSign]  = useState(false);
  const [showAck,   setShowAck]   = useState(false);
  const [showEdit,  setShowEdit]  = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const fileRef = useRef();

  const ct       = task.completion_type || 'checkbox';
  const config   = safeJson(task.completion_config, {});
  const ctMeta   = COMPLETION_TYPES.find(c=>c.value===ct) || COMPLETION_TYPES[0];
  const isDone   = task.status === 'done';
  const todayStr = new Date().toISOString().slice(0,10);
  const overdue  = task.due_date && task.due_date < todayStr && !isDone;
  const checklist = safeJson(task.checklist, []);
  const doneCount = checklist.filter(i=>i.done).length;

  // Complete the task with optional completion_data payload
  const complete = async (completionData={}) => {
    setActing(true);
    await tFetch(`/api/calendar/tasks/${task.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ status:'done', completed_at:new Date().toISOString(),
        completion_data: JSON.stringify(completionData) })
    });
    setActing(false); onRefresh();
  };

  const uncomplete = async () => {
    await tFetch(`/api/calendar/tasks/${task.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ status:'todo', completed_at:null })
    });
    onRefresh();
  };

  // Handle file upload completion
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setActing(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('record_id',      task.record_id  || '');
    fd.append('file_type_id',   config.file_type_id   || '');
    fd.append('file_type_name', config.file_type_name  || 'Upload');
    fd.append('uploaded_by',    'task_completion');
    const r = await tFetch('/api/attachments/upload', { method:'POST', body:fd });
    const att = await r.json();
    await complete({ file_name:file.name, attachment_id:att?.id, uploaded_at:new Date().toISOString() });
  };

  // Render the completion action area based on type
  const renderAction = () => {
    if (isDone) {
      return (
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:18,height:18,borderRadius:'50%',background:'#f0fdf4',border:'1.5px solid #86efac',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer'}} onClick={uncomplete}>
            <Ic n="check" s={11} c={C.green}/>
          </div>
        </div>
      );
    }

    if (ct === 'checkbox') {
      return (
        <input type="checkbox" checked={false} onChange={()=>complete({})}
          style={{cursor:'pointer',accentColor:C.green,width:15,height:15,flexShrink:0,marginTop:2}}/>
      );
    }

    if (ct === 'approval') {
      return (
        <div style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:6,
          background:'#fef9c3',border:'1px solid #fde047',fontSize:11,fontWeight:600,color:'#a16207',flexShrink:0}}>
          <Ic n="clock" s={11} c="#a16207"/> Awaiting
        </div>
      );
    }

    // All action-based types get an icon button
    const icons = { file_upload:'upload', form:'form', document_read:'read',
                    e_signature:'signature', video_watch:'video', external_link:'link' };
    const labels = { file_upload:'Upload', form:'Fill in', document_read:'Read & Accept',
                     e_signature:'Sign', video_watch:'Watch', external_link:'Visit' };

    return (
      <button onClick={()=>{
        if (ct==='file_upload')    fileRef.current?.click();
        else if (ct==='e_signature') setShowSign(true);
        else if (ct==='document_read') setShowAck(true);
        else if (ct==='external_link' && config.url) { window.open(config.url,'_blank'); complete({visited_at:new Date().toISOString()}); }
        else if (ct==='form' && config.form_id) { setShowForm(true); }
        else complete({});
      }} disabled={acting}
        style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:7,
          border:`1.5px solid ${ctMeta.color}40`,background:`${ctMeta.color}0c`,
          color:ctMeta.color,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:F,flexShrink:0}}>
        <Ic n={icons[ct]||'check'} s={12} c={ctMeta.color}/>
        {acting?'…':labels[ct]||'Complete'}
      </button>
    );
  };

  return (
    <>
      <div
        style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #f3f4f6",
          cursor:"pointer"}}
        className="task-row"
        onMouseEnter={e=>{e.currentTarget.querySelector('.task-meta').style.opacity='1'; e.currentTarget.querySelector('.task-action').style.opacity='1';}}
        onMouseLeave={e=>{e.currentTarget.querySelector('.task-meta').style.opacity='0'; e.currentTarget.querySelector('.task-action').style.opacity='0';}}
        onClick={()=>!isDone&&setShowEdit(true)}>

        {/* Checkbox / done indicator — always visible */}
        <div style={{flexShrink:0}} onClick={e=>e.stopPropagation()}>
          {renderAction()}
        </div>

        {/* Task title */}
        <div style={{flex:1,minWidth:0}}>
          <span style={{fontSize:13,fontWeight:600,
            color:isDone?C.text3:"#111827",
            textDecoration:isDone?"line-through":"none"}}>
            {task.title}
          </span>
          {/* Metadata row — visible on hover only */}
          <div className="task-meta" style={{display:"flex",gap:6,marginTop:2,alignItems:"center",flexWrap:"wrap",
            opacity:0,transition:"opacity .15s"}}>
            {task.due_date && (
              <span style={{fontSize:10,color:overdue?C.red:C.text3}}>
                {overdue?"⚠ ":""}{task.due_date}
              </span>
            )}
            {task.priority && task.priority !== 'medium' && (
              <Badge color={PRIORITY[task.priority]?.color} bg={PRIORITY[task.priority]?.bg}>
                {PRIORITY[task.priority]?.label}
              </Badge>
            )}
            {ct!=='checkbox'&&(
              <Badge color={ctMeta.color} bg={`${ctMeta.color}10`}>
                {ctMeta.label}
              </Badge>
            )}
            {checklist.length>0&&(
              <span style={{fontSize:10,color:C.text3}}>☑ {doneCount}/{checklist.length}</span>
            )}
          </div>
        </div>

        {/* Action button — right-aligned, hover only (hidden when done) */}
        {!isDone && ct !== 'checkbox' && ct !== 'approval' && (
          <div className="task-action" style={{flexShrink:0,opacity:0,transition:"opacity .15s"}}
            onClick={e=>e.stopPropagation()}>
            {renderAction()}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleFileUpload}
        accept={config.file_type_id ? '*' : '.pdf,.doc,.docx,.jpg,.png'}/>

      {/* Signature pad */}
      {showSign && <SignaturePad onSave={sig=>{ setShowSign(false); complete({signature_data_url:sig,signed_at:new Date().toISOString()}); }} onClose={()=>setShowSign(false)}/>}

      {/* Read & Acknowledge modal */}
      {showAck && <AcknowledgeModal config={config} onConfirm={()=>{ setShowAck(false); complete({acknowledged_at:new Date().toISOString()}); }} onClose={()=>setShowAck(false)}/>}

      {/* Form completion modal */}
      {showForm && <TaskFormModal task={task} config={config}
        onComplete={data=>{ setShowForm(false); complete(data); }}
        onClose={()=>setShowForm(false)}/>}

      {/* Quick edit */}
      {showEdit && <TaskModal task={task} environmentId={task.environment_id}
        defaultValues={{ record_id:task.record_id, record_name:task.record_name, object_id:task.object_id, object_name:task.object_name }}
        onSave={()=>{ setShowEdit(false); onRefresh(); }}
        onClose={()=>setShowEdit(false)}/>}
    </>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────
function EventRow({ event, onDelete }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:EVENT_TYPES[event.type]?.color||"#6366f1",flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{event.title}</div>
        <div style={{fontSize:11,color:"#9ca3af"}}>{event.start_date}{event.start_time?` · ${event.start_time}`:""}{event.location?` · ${event.location}`:""}</div>
      </div>
      <button onClick={()=>onDelete(event.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#d1d5db",fontSize:14,padding:0}}>×</button>
    </div>
  );
}

// ── Main panel export ─────────────────────────────────────────────────────────
export function TasksEventsPanel({ record, environment, linkedJobRecords=[], jobFilter="all" }) {
  const [tasks,     setTasks]     = useState([]);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [taskModal, setTaskModal] = useState(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [activeJob, setActiveJob] = useState(jobFilter || "all");

  // Sync when parent changes jobFilter (e.g. clicking a linked job)
  useEffect(() => { setActiveJob(jobFilter || "all"); }, [jobFilter]);

  const envId   = environment?.id;
  const recId   = record?.id;
  const recName = (() => {
    const d = record?.data || {};
    return [d.first_name, d.last_name].filter(Boolean).join(" ") || d.name || d.job_title || d.pool_name || "This record";
  })();

  const load = useCallback(async () => {
    if (!recId) return;
    setLoading(true);
    const [t, e] = await Promise.all([
      tFetch(`/api/calendar/tasks?record_id=${recId}`).then(r=>r.json()),
      tFetch(`/api/calendar/events?record_id=${recId}`).then(r=>r.json()),
    ]);
    setTasks(Array.isArray(t)?t:[]); setEvents(Array.isArray(e)?e:[]); setLoading(false);
  }, [recId]);

  useEffect(()=>{ load(); }, [load]);
  useRecordSync(recId, ()=>load());
  useEffect(()=>{
    const h = ()=>load();
    window.addEventListener('talentos:tasks-updated', h);
    return ()=>window.removeEventListener('talentos:tasks-updated', h);
  }, [load]);

  const handleDeleteEvent = async id => { await tFetch(`/api/calendar/events/${id}`,{method:"DELETE"}); load(); };

  // Apply job filter — "all" = everything, "general" = no object_id, jobId = that specific job
  const filteredTasks = tasks.filter(t => {
    if (activeJob === "all")     return true;
    if (activeJob === "general") return !t.object_id;
    return t.object_id === activeJob;
  });

  const tasksDue  = filteredTasks.filter(t=>t.status!=="done");
  const tasksDone = filteredTasks.filter(t=>t.status==="done");

  // Count tasks that need a specific action (non-checkbox)
  const actionableCount = tasksDue.filter(t=>(t.completion_type||'checkbox')!=='checkbox').length;

  return (
    <div style={{fontFamily:F}}>
      {/* Tab bar */}
      <div style={{display:"flex",gap:2,marginBottom:12,borderBottom:"1px solid #f0f0f0",paddingBottom:8,alignItems:"center"}}>
        {["tasks","events","all"].map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{padding:"4px 12px",fontSize:11,fontWeight:activeTab===tab?700:500,
              color:activeTab===tab?"#3b5bdb":"#9ca3af",background:"none",border:"none",
              borderBottom:activeTab===tab?"2px solid #3b5bdb":"2px solid transparent",
              cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>
            {tab} ({tab==="tasks"?tasks.length:tab==="events"?events.length:tasks.length+events.length})
          </button>
        ))}
        <div style={{flex:1}}/>
        {/* Actionable badge */}
        {activeTab==="tasks"&&actionableCount>0&&(
          <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,
            background:'#fef9c3',color:'#a16207',border:'1px solid #fde047'}}>
            {actionableCount} need action
          </span>
        )}
        {(activeTab==="tasks"||activeTab==="all")&&(
          <button onClick={()=>setTaskModal({})}
            style={{display:"flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:6,
              border:"1px solid #e5e7eb",background:"white",color:"#374151",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            + Task
          </button>
        )}
      </div>

      {/* Job filter pills — only shown on Person records with linked jobs */}
      {linkedJobRecords.length > 0 && activeTab === "tasks" && (
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
          {[{id:"all",label:`All (${tasks.length})`},{id:"general",label:"General"},...linkedJobRecords.map(j=>({id:j.id,label:j.title||j.data?.job_title||"Job"}))].map(opt=>(
            <button key={opt.id} onClick={()=>setActiveJob(opt.id)}
              style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:activeJob===opt.id?700:500,
                border:`1.5px solid ${activeJob===opt.id?"#4361EE":"#e5e7eb"}`,
                background:activeJob===opt.id?"#EEF2FF":"transparent",
                color:activeJob===opt.id?"#4361EE":"#6b7280",cursor:"pointer",fontFamily:"inherit"}}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:20}}>Loading…</div>
      ) : (
        <div>
          {(activeTab==="tasks"||activeTab==="all")&&(
            <>
              {tasksDue.length===0&&activeTab==="tasks"&&(
                <div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:"16px 0"}}>
                  No open tasks — click "+ Task" to add one
                </div>
              )}
              {tasksDue.map((t,i)=>(
                <TaskRow key={t.id||`due-${i}`} task={t} onRefresh={load}/>
              ))}
              {tasksDone.length>0&&(
                <details style={{marginTop:8}}>
                  <summary style={{fontSize:11,fontWeight:600,color:"#9ca3af",cursor:"pointer",userSelect:"none",padding:"4px 0"}}>
                    ✓ Completed ({tasksDone.length})
                  </summary>
                  {tasksDone.map((t,i)=>(
                    <TaskRow key={t.id||`done-${i}`} task={t} onRefresh={load}/>
                  ))}
                </details>
              )}
            </>
          )}
          {(activeTab==="events"||activeTab==="all")&&(
            <>
              {activeTab==="all"&&events.length>0&&tasksDue.length>0&&(
                <div style={{height:1,background:"#f0f0f0",margin:"10px 0"}}/>
              )}
              {events.length===0&&activeTab==="events"&&(
                <div style={{textAlign:"center",color:"#9ca3af",fontSize:13,padding:"16px 0"}}>
                  No events for this record
                </div>
              )}
              {events.map((e,i)=>(
                <EventRow key={e.id||`ev-${i}`} event={e} onDelete={handleDeleteEvent}/>
              ))}
            </>
          )}
        </div>
      )}

      {taskModal!==null&&(
        <TaskModal
          task={taskModal.task||null}
          environmentId={envId}
          defaultValues={{ record_id:recId, record_name:recName }}
          onSave={()=>{ setTaskModal(null); load(); }}
          onClose={()=>setTaskModal(null)}/>
      )}
    </div>
  );
}
