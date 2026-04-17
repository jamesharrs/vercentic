import { tFetch } from "./apiClient.js";
import { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { useRecordSync } from "./hooks/useRecordSync.js";

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

function Badge({ children, color, bg }) {
  return <span style={{ display:"inline-flex",alignItems:"center",padding:"1px 6px",borderRadius:99,fontSize:11,fontWeight:600,color,background:bg||`${color}18`,whiteSpace:"nowrap" }}>{children}</span>;
}

// Minimal inline modals for the panel context
function QuickTaskModal({ task, defaultDate, envId, recId, recName, onDone }) {
  const [title,setTitle]=useState(task?.title||"");
  const [due,setDue]=useState(task?.due_date||defaultDate||"");
  const [priority,setPriority]=useState(task?.priority||"medium");
  const [status,setStatus]=useState(task?.status||"todo");
  const [saving,setSaving]=useState(false);

  const handleSave = async () => {
    if(!title.trim()) return;
    setSaving(true);
    const body={title,due_date:due||null,priority,status,environment_id:envId,record_id:recId,record_name:recName};
    if(task) await tFetch(`/api/calendar/tasks/${task.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    else await tFetch("/api/calendar/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    setSaving(false); onDone();
  };
  const handleDelete = async () => {
    await tFetch(`/api/calendar/tasks/${task.id}`,{method:"DELETE"});
    onDone();
  };

  return ReactDOM.createPortal(
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onMouseDown={e=>e.target===e.currentTarget&&onDone()}>
      <div style={{ background:"white",borderRadius:16,width:"100%",maxWidth:400,padding:24,boxShadow:"0 16px 48px rgba(0,0,0,0.15)" }} onMouseDown={e=>e.stopPropagation()}>
        <h4 style={{ margin:"0 0 14px",fontSize:14,fontWeight:700,fontFamily:F }}>{task?"Edit Task":"New Task"}</h4>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task title *" autoFocus style={{ width:"100%",padding:"8px 10px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:8,fontFamily:F,marginBottom:10,boxSizing:"border-box",outline:"none" }}/>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10 }}>
          <input type="date" value={due} onChange={e=>setDue(e.target.value)} style={{ padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:8,fontFamily:F,boxSizing:"border-box" }}/>
          <select value={priority} onChange={e=>setPriority(e.target.value)} style={{ padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:8,fontFamily:F }}>
            {Object.entries(PRIORITY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{ width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:8,fontFamily:F,marginBottom:14,boxSizing:"border-box" }}>
          {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ display:"flex",justifyContent:"space-between",gap:8 }}>
          <div>{task&&<button onClick={handleDelete} style={{ padding:"7px 14px",borderRadius:8,border:"1px solid #fecaca",background:"#fef2f2",color:"#ef4444",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F }}>Delete</button>}</div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={onDone} style={{ padding:"7px 14px",borderRadius:8,border:"1px solid #e5e7eb",background:"white",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F }}>Cancel</button>
            <button onClick={handleSave} disabled={!title.trim()||saving} style={{ padding:"7px 14px",borderRadius:8,border:"none",background:"#3b5bdb",color:"white",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F,opacity:!title.trim()||saving?0.5:1 }}>{saving?"Saving…":task?"Save":"Create"}</button>
          </div>
        </div>
      </div>
    </div>
  , document.body);
}

export function TasksEventsPanel({ record, environment }) {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(null); // null | { task? }
  const [activeTab, setActiveTab] = useState("tasks");

  const envId = environment?.id;
  const recId = record?.id;
  const recName = (() => {
    const d=record?.data||{};
    return [d.first_name,d.last_name].filter(Boolean).join(" ")||d.name||d.job_title||d.pool_name||"This record";
  })();

  const load = useCallback(async () => {
    if(!recId) return;
    setLoading(true);
    const [t,e] = await Promise.all([
      tFetch(`/api/calendar/tasks?record_id=${recId}`).then(r=>r.json()),
      tFetch(`/api/calendar/events?record_id=${recId}`).then(r=>r.json()),
    ]);
    setTasks(Array.isArray(t)?t:[]); setEvents(Array.isArray(e)?e:[]); setLoading(false);
  }, [recId]);

  useEffect(()=>{load();}, [load]);

  // Real-time push: reload when the server broadcasts a task/event change for this record
  useRecordSync(recId, () => load());

  // Reload when Copilot creates a task
  useEffect(()=>{
    const handler = () => load();
    window.addEventListener('talentos:tasks-updated', handler);
    return () => window.removeEventListener('talentos:tasks-updated', handler);
  }, [load]);

  const handleToggle = async task => {
    await tFetch(`/api/calendar/tasks/${task.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:task.status==="done"?"todo":"done"})});
    load();
  };
  const handleDeleteEvent = async id => { await tFetch(`/api/calendar/events/${id}`,{method:"DELETE"}); load(); };

  const todayStr = new Date().toISOString().slice(0,10);
  const tasksDue = tasks.filter(t=>t.status!=="done");
  const tasksDone = tasks.filter(t=>t.status==="done");

  const TaskRow = ({task}) => {
    const checklist = (()=>{ try{return typeof task.checklist==="string"?JSON.parse(task.checklist):(task.checklist||[]);}catch{return [];} })();
    const done = checklist.filter(i=>i.done).length;
    return (
      <div style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",borderBottom:"1px solid #f3f4f6" }}>
        <input type="checkbox" checked={task.status==="done"} onChange={()=>handleToggle(task)} style={{ marginTop:3,cursor:"pointer",accentColor:"#22c55e",width:14,height:14,flexShrink:0 }}/>
        <div style={{ flex:1,minWidth:0,cursor:"pointer" }} onClick={()=>setTaskModal({task})}>
          <div style={{ fontSize:13,fontWeight:600,color:task.status==="done"?"#9ca3af":"#111827",textDecoration:task.status==="done"?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{task.title}</div>
          <div style={{ display:"flex",gap:6,marginTop:2,alignItems:"center",flexWrap:"wrap" }}>
            {task.due_date&&<span style={{ fontSize:11,color:task.due_date<todayStr&&task.status!=="done"?"#ef4444":"#9ca3af" }}>{task.due_date<todayStr&&task.status!=="done"?"⚠ ":""}{task.due_date}</span>}
            <Badge color={PRIORITY[task.priority]?.color} bg={PRIORITY[task.priority]?.bg}>{PRIORITY[task.priority]?.label}</Badge>
            {checklist.length>0&&<span style={{ fontSize:11,color:"#9ca3af" }}>☑ {done}/{checklist.length}</span>}
          </div>
        </div>
      </div>
    );
  };

  const EventRow = ({event}) => (
    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #f3f4f6" }}>
      <div style={{ width:8,height:8,borderRadius:"50%",background:EVENT_TYPES[event.type]?.color||"#6366f1",flexShrink:0 }}/>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{event.title}</div>
        <div style={{ fontSize:11,color:"#9ca3af" }}>{event.start_date}{event.start_time?` · ${event.start_time}`:""}{event.location?` · ${event.location}`:""}</div>
      </div>
      <button onClick={()=>handleDeleteEvent(event.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#d1d5db",fontSize:14,padding:0 }}>×</button>
    </div>
  );

  return (
    <div style={{ fontFamily:F }}>
      <div style={{ display:"flex",gap:2,marginBottom:12,borderBottom:"1px solid #f0f0f0",paddingBottom:8,alignItems:"center" }}>
        {["tasks","events","all"].map(tab=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{ padding:"4px 12px",fontSize:11,fontWeight:activeTab===tab?700:500,color:activeTab===tab?"#3b5bdb":"#9ca3af",background:"none",border:"none",borderBottom:activeTab===tab?"2px solid #3b5bdb":"2px solid transparent",cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize" }}>
            {tab} ({tab==="tasks"?tasks.length:tab==="events"?events.length:tasks.length+events.length})
          </button>
        ))}
        <div style={{ flex:1 }}/>
        {(activeTab==="tasks"||activeTab==="all")&&(
          <button onClick={()=>setTaskModal({})} style={{ display:"flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:6,border:"1px solid #e5e7eb",background:"white",color:"#374151",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>+ Task</button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:"center",color:"#9ca3af",fontSize:13,padding:20 }}>Loading…</div>
      ) : (
        <div>
          {(activeTab==="tasks"||activeTab==="all")&&(
            <>
              {tasksDue.length===0&&activeTab==="tasks"&&(
                <div style={{ textAlign:"center",color:"#9ca3af",fontSize:13,padding:"16px 0" }}>No open tasks — click "+ Task" to add one</div>
              )}
              {tasksDue.map((t,i)=><TaskRow key={t.id||`due-${i}`} task={t}/>)}
              {tasksDone.length>0&&(
                <details style={{ marginTop:8 }}>
                  <summary style={{ fontSize:11,fontWeight:600,color:"#9ca3af",cursor:"pointer",userSelect:"none",padding:"4px 0" }}>✓ Completed ({tasksDone.length})</summary>
                  {tasksDone.map((t,i)=><TaskRow key={t.id||`done-${i}`} task={t}/>)}
                </details>
              )}
            </>
          )}
          {(activeTab==="events"||activeTab==="all")&&(
            <>
              {activeTab==="all"&&events.length>0&&tasksDue.length>0&&<div style={{ height:1,background:"#f0f0f0",margin:"10px 0" }}/>}
              {events.length===0&&activeTab==="events"&&(
                <div style={{ textAlign:"center",color:"#9ca3af",fontSize:13,padding:"16px 0" }}>No events for this record</div>
              )}
              {events.map((e,i)=><EventRow key={e.id||`ev-${i}`} event={e}/>)}
            </>
          )}
        </div>
      )}

      {taskModal!==null&&(
        <QuickTaskModal task={taskModal.task||null} defaultDate={new Date().toISOString().slice(0,10)} envId={envId} recId={recId} recName={recName} onDone={()=>{setTaskModal(null);load();}}/>
      )}
    </div>
  );
}
