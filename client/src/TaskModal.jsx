// client/src/TaskModal.jsx — rich task creation/editing modal
import { useState, useEffect, useRef } from 'react';
import { tFetch } from './apiClient.js';

const C = { accent:'#4361EE', accentL:'#EEF2FF', text1:'#0D0D0F', text2:'#374151', text3:'#6b7280', border:'#e5e7eb', bg:'#f9fafb', white:'#ffffff', red:'#ef4444', green:'#10b981' };
const F = "'DM Sans', -apple-system, sans-serif";

const TASK_TYPES = [
  {value:'call',label:'📞 Call'},{value:'email',label:'✉️ Email'},{value:'follow_up',label:'🔄 Follow-up'},
  {value:'review',label:'👁 Review'},{value:'interview',label:'🗓 Interview'},{value:'meeting',label:'👥 Meeting'},
  {value:'send_docs',label:'📄 Send Docs'},{value:'chase',label:'⚡ Chase'},{value:'other',label:'○ Other'},
];
const PRIORITIES = [
  {value:'urgent',label:'Urgent',color:'#ef4444'},{value:'high',label:'High',color:'#f97316'},
  {value:'medium',label:'Medium',color:'#eab308'},{value:'low',label:'Low',color:'#22c55e'},
];
const STATUSES = [
  {value:'todo',label:'To Do'},{value:'in_progress',label:'In Progress'},
  {value:'blocked',label:'Blocked'},{value:'done',label:'Done'},
];
const REMINDERS = [
  {value:'',label:'No reminder'},{value:'15m',label:'15 min before'},{value:'30m',label:'30 min before'},
  {value:'1h',label:'1 hour before'},{value:'3h',label:'3 hours before'},
  {value:'1d',label:'1 day before'},{value:'2d',label:'2 days before'},
];
const ORIGIN_STYLES = {
  manual:{label:'Manual',bg:'#f3f4f6',color:'#374151'}, copilot:{label:'Copilot',bg:'#EEF2FF',color:'#4361EE'},
  workflow:{label:'Workflow',bg:'#f0fdf4',color:'#10b981'}, trigger:{label:'Trigger',bg:'#FEF3C7',color:'#d97706'},
};

function computeReminderAt(dueDate,dueTime,val){
  if(!dueDate||!val) return null;
  const base=new Date(`${dueDate}T${dueTime||'09:00'}:00`);
  const mins={15:15,30:30,'1h':60,'3h':180,'1d':1440,'2d':2880}[val];
  return mins?new Date(base.getTime()-mins*60000).toISOString():null;
}

const Inp=({value,onChange,placeholder,type='text',style={}})=>(
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{width:'100%',padding:'8px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,background:C.white,
      fontSize:13,color:C.text1,fontFamily:F,outline:'none',boxSizing:'border-box',...style}}/>
);
const Sel=({value,onChange,options,style={}})=>(
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{width:'100%',padding:'8px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,background:C.white,
      fontSize:13,color:C.text1,fontFamily:F,cursor:'pointer',outline:'none',...style}}>
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
const Lbl=({children})=>(
  <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>{children}</div>
);

function PriorityPicker({value,onChange}){
  return(
    <div style={{display:'flex',gap:6}}>
      {PRIORITIES.map(p=>(
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

function ChecklistEditor({items,onChange}){
  const [newItem,setNewItem]=useState('');
  const ref=useRef();
  const add=()=>{
    const t=newItem.trim(); if(!t) return;
    onChange([...items,{id:Date.now().toString(),text:t,done:false}]);
    setNewItem(''); setTimeout(()=>ref.current?.focus(),50);
  };
  return(
    <div>
      {items.map(item=>(
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

export default function TaskModal({task,defaultValues={},environmentId,onSave,onClose}){
  const isEdit=!!task;
  const [tab,setTab]=useState('main');
  const [saving,setSaving]=useState(false);
  const [users,setUsers]=useState([]);
  const [form,setForm]=useState({
    title:task?.title||'', task_type:task?.task_type||'follow_up',
    priority:task?.priority||'medium', status:task?.status||'todo',
    due_date:task?.due_date||'', due_time:task?.due_time||'', reminder:'',
    description:task?.description||'', assignee_id:task?.assignee_id||'',
    record_id:task?.record_id||defaultValues.record_id||'',
    record_name:task?.record_name||defaultValues.record_name||'',
    object_id:task?.object_id||defaultValues.object_id||'',
    object_name:task?.object_name||defaultValues.object_name||'',
    checklist:(()=>{try{return typeof task?.checklist==='string'?JSON.parse(task.checklist):(task?.checklist||[]);}catch{return[];}})(),
    created_by:task?.created_by||'manual',
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    if(!environmentId) return;
    tFetch(`/api/users?environment_id=${environmentId}`).then(r=>r.json()).then(d=>setUsers(Array.isArray(d)?d:[])).catch(()=>{});
  },[environmentId]);

  const handleSave=async()=>{
    if(!form.title.trim()) return;
    setSaving(true);
    const reminderAt=form.reminder?computeReminderAt(form.due_date,form.due_time,form.reminder):null;
    const payload={...form,reminder_at:reminderAt,environment_id:environmentId,checklist:JSON.stringify(form.checklist)};
    delete payload.reminder;
    try{
      const url=isEdit?`/api/calendar/tasks/${task.id}`:'/api/calendar/tasks';
      const method=isEdit?'PATCH':'POST';
      const r=await tFetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      onSave?.(await r.json()); onClose?.();
    }catch(e){console.error(e);}finally{setSaving(false);}
  };
  const handleDelete=async()=>{
    if(!window.confirm('Delete this task?')) return;
    await tFetch(`/api/calendar/tasks/${task.id}`,{method:'DELETE'});
    onSave?.(null); onClose?.();
  };

  const origin=ORIGIN_STYLES[form.created_by]||ORIGIN_STYLES.manual;
  const tabs=[['main','Details'],['checklist',`Checklist${form.checklist.length>0?` (${form.checklist.length})`:''}`],['more','More']];

  return(
    <div onMouseDown={e=>e.target===e.currentTarget&&onClose?.()}
      style={{position:'fixed',inset:0,background:'rgba(15,23,41,0.55)',zIndex:1300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onMouseDown={e=>e.stopPropagation()}
        style={{background:C.white,borderRadius:20,width:'100%',maxWidth:500,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',fontFamily:F}}>

        {/* Header */}
        <div style={{padding:'18px 24px 0',borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <div style={{flex:1,fontSize:15,fontWeight:800,color:C.text1}}>{isEdit?'Edit Task':'New Task'}</div>
            <span style={{padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:700,background:origin.bg,color:origin.color}}>{origin.label}</span>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,fontSize:20,padding:0,lineHeight:1}}>×</button>
          </div>
          <div style={{display:'flex'}}>
            {tabs.map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)}
                style={{padding:'6px 14px',fontSize:12,fontWeight:tab===id?700:500,color:tab===id?C.accent:C.text3,
                  background:'none',border:'none',borderBottom:`2px solid ${tab===id?C.accent:'transparent'}`,cursor:'pointer',fontFamily:F}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{padding:'20px 24px',overflowY:'auto',flex:1}}>
          {tab==='main'&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div><Lbl>Task</Lbl><Inp value={form.title} onChange={v=>set('title',v)} placeholder="What needs to be done?" style={{fontSize:15,fontWeight:600,padding:'10px 12px'}}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><Lbl>Type</Lbl><Sel value={form.task_type} onChange={v=>set('task_type',v)} options={TASK_TYPES}/></div>
                <div><Lbl>Status</Lbl><Sel value={form.status} onChange={v=>set('status',v)} options={STATUSES}/></div>
              </div>
              <div><Lbl>Priority</Lbl><PriorityPicker value={form.priority} onChange={v=>set('priority',v)}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><Lbl>Due date</Lbl><Inp type="date" value={form.due_date} onChange={v=>set('due_date',v)}/></div>
                <div><Lbl>Due time</Lbl><Inp type="time" value={form.due_time} onChange={v=>set('due_time',v)}/></div>
              </div>
              {form.due_date&&<div><Lbl>Reminder</Lbl><Sel value={form.reminder} onChange={v=>set('reminder',v)} options={REMINDERS}/></div>}
              <div><Lbl>Notes</Lbl>
                <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Add notes or context…" rows={3}
                  style={{width:'100%',padding:'8px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,resize:'vertical',outline:'none',boxSizing:'border-box',color:C.text1}}/>
              </div>
            </div>
          )}
          {tab==='checklist'&&(
            <div><Lbl>Checklist items</Lbl><ChecklistEditor items={form.checklist} onChange={v=>set('checklist',v)}/></div>
          )}
          {tab==='more'&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div><Lbl>Assigned to</Lbl>
                <Sel value={form.assignee_id} onChange={v=>set('assignee_id',v)}
                  options={[{value:'',label:'Unassigned'},...users.map(u=>({value:u.id,label:`${u.first_name} ${u.last_name}`.trim()||u.email}))]}/>
              </div>
              {form.record_name&&(
                <div><Lbl>Linked to</Lbl>
                  <div style={{padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,background:C.bg,color:C.text2,display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:12,color:C.text3}}>{form.object_name}</span>
                    <span style={{color:C.text3}}>·</span>
                    <span style={{fontWeight:600}}>{form.record_name}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'14px 24px',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
          {isEdit&&<button onClick={handleDelete} style={{padding:'8px 14px',borderRadius:9,border:`1.5px solid ${C.border}`,background:C.white,color:C.red,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>Delete</button>}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'8px 18px',borderRadius:9,border:`1.5px solid ${C.border}`,background:C.white,color:C.text2,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>Cancel</button>
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
