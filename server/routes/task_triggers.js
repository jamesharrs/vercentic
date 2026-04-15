// server/routes/task_triggers.js
// Inactivity detection, time-based task triggers, and reminder firing.
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, findOne, insert, update, getStore, saveStore } = require('../db/init');

const TASK_TYPES = {
  call:       { label:'Call',        icon:'phone' },
  email:      { label:'Email',       icon:'mail'  },
  follow_up:  { label:'Follow-up',   icon:'refresh-cw' },
  review:     { label:'Review',      icon:'eye'   },
  interview:  { label:'Interview',   icon:'calendar' },
  meeting:    { label:'Meeting',     icon:'users' },
  send_docs:  { label:'Send Docs',   icon:'file-text' },
  chase:      { label:'Chase',       icon:'alert-circle' },
  other:      { label:'Other',       icon:'circle' },
};

function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
}
function today() { return new Date().toISOString().slice(0,10); }
function addDays(d, n) {
  const dt = new Date(d); dt.setDate(dt.getDate()+n);
  return dt.toISOString().slice(0,10);
}
function buildTitle(template, record) {
  const d = record.data || {};
  const name = [d.first_name,d.last_name].filter(Boolean).join(' ')
    || d.job_title || d.pool_name || d.name || 'Record';
  return template
    .replace(/{{name}}/gi, name)
    .replace(/{{first_name}}/gi, d.first_name||name)
    .replace(/{{job_title}}/gi, d.job_title||'')
    .replace(/{{status}}/gi, d.status||'');
}
function alreadyHasTask(store, triggerId, recordId) {
  const recent = new Date(Date.now()-7*86400000).toISOString();
  return (store.calendar_tasks||[]).some(t=>
    t.trigger_id===triggerId && t.record_id===recordId && !t.deleted_at && t.created_at>recent
  );
}
function getLastCommDate(store, recordId) {
  return (store.communications||[])
    .filter(c=>c.record_id===recordId&&!c.deleted_at)
    .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]?.created_at||null;
}

function createTriggeredTask(store, trigger, record, objectName) {
  const d = record.data||{};
  const recordName = [d.first_name,d.last_name].filter(Boolean).join(' ')
    || d.job_title || d.pool_name || 'Record';
  const dueDate = trigger.due_in_days!=null ? addDays(today(),trigger.due_in_days) : addDays(today(),1);
  const task = {
    id:uuidv4(), environment_id:record.environment_id,
    title:buildTitle(trigger.task_title||'Follow up with {{name}}', record),
    description:trigger.task_description||`Auto-created by: ${trigger.name}`,
    due_date:dueDate, due_time:null,
    priority:trigger.priority||'medium', status:'todo',
    task_type:trigger.task_type||'follow_up',
    assignee_id:trigger.assignee_id||null,
    record_id:record.id, object_id:record.object_id,
    record_name:recordName, object_name:objectName||null,
    checklist:'[]', tags:JSON.stringify(['auto-triggered']),
    estimated_minutes:null, completed_at:null,
    trigger_id:trigger.id, created_by:'trigger',
    created_at:new Date().toISOString(), updated_at:new Date().toISOString(), deleted_at:null,
  };
  if(!store.calendar_tasks) store.calendar_tasks=[];
  store.calendar_tasks.push(task);
  if(!store.notifications) store.notifications=[];
  store.notifications.push({
    id:uuidv4(), type:'task_reminder',
    title:`New task: ${task.title}`,
    body:`Due ${dueDate} — triggered by "${trigger.name}"`,
    record_id:record.id, user_id:trigger.assignee_id||null,
    environment_id:record.environment_id, action_url:null,
    read_at:null, created_at:new Date().toISOString(),
  });
  return task;
}

async function runTriggerCheck(environmentId) {
  const store = getStore();
  const triggers = (store.task_triggers||[]).filter(t=>
    t.active && !t.deleted_at && (!environmentId||t.environment_id===environmentId)
  );
  const results = { checked:triggers.length, tasks_created:0, skipped:0 };
  const now = today();
  for (const trigger of triggers) {
    const objects = (store.objects||[]).filter(o=>
      !o.deleted_at &&
      (!trigger.object_id||o.id===trigger.object_id) &&
      (!trigger.environment_id||o.environment_id===trigger.environment_id)
    );
    for (const obj of objects) {
      const records = (store.records||[]).filter(r=>
        r.object_id===obj.id && !r.deleted_at &&
        (!trigger.filter_status||r.data?.status===trigger.filter_status)
      );
      for (const record of records) {
        if(alreadyHasTask(store, trigger.id, record.id)){results.skipped++;continue;}
        let should = false;
        if(trigger.type==='inactivity'){
          should = daysBetween(record.updated_at||record.created_at, now) >= (trigger.days||7);
        } else if(trigger.type==='stage_stale'){
          const links=(store.people_links||[]).filter(l=>l.person_record_id===record.id&&!l.deleted_at);
          for(const l of links){ if(daysBetween(l.updated_at||l.created_at,now)>=(trigger.days||5)){should=true;break;} }
        } else if(trigger.type==='due_approach'){
          const val=record.data?.[trigger.date_field||'due_date'];
          if(val){const daysUntil=daysBetween(now,val);should=daysUntil>=0&&daysUntil<=(trigger.days||3);}
        } else if(trigger.type==='time_since'){
          const anchor=trigger.anchor==='last_comm'?getLastCommDate(store,record.id):record.created_at;
          if(anchor) should=daysBetween(anchor,now)>=(trigger.days||14);
        } else if(trigger.type==='no_comms'){
          const last=getLastCommDate(store,record.id);
          const base=last||record.created_at;
          should=daysBetween(base,now)>=(trigger.days||14);
        }
        if(should){
          createTriggeredTask(store, trigger, record, obj.name);
          results.tasks_created++;
          trigger.last_triggered_at=new Date().toISOString();
          trigger.tasks_created_total=(trigger.tasks_created_total||0)+1;
        }
      }
    }
  }
  if(results.tasks_created>0) saveStore();
  return results;
}

function ensure() { const s=getStore(); if(!s.task_triggers) s.task_triggers=[]; }

router.get('/types', (_,res)=>res.json(TASK_TYPES));

router.get('/', (req,res)=>{
  ensure();
  const { environment_id } = req.query;
  res.json(query('task_triggers',t=>!t.deleted_at&&(!environment_id||t.environment_id===environment_id)));
});

router.post('/', (req,res)=>{
  ensure();
  const { environment_id,name,type,object_id,days,date_field,anchor,filter_status,
    task_title,task_description,task_type,priority,assignee_id,due_in_days,active } = req.body;
  if(!name||!type) return res.status(400).json({error:'name and type required'});
  res.status(201).json(insert('task_triggers',{
    id:uuidv4(), environment_id, name, type,
    object_id:object_id||null, days:days||7,
    date_field:date_field||null, anchor:anchor||'created',
    filter_status:filter_status||null,
    task_title:task_title||'Follow up with {{name}}',
    task_description:task_description||'',
    task_type:task_type||'follow_up', priority:priority||'medium',
    assignee_id:assignee_id||null, due_in_days:due_in_days??1,
    active:active!==false,
    last_triggered_at:null, tasks_created_total:0,
    created_at:new Date().toISOString(), updated_at:new Date().toISOString(), deleted_at:null,
  }));
});

router.patch('/:id',(req,res)=>{
  ensure();
  const allowed=['name','type','object_id','days','date_field','anchor','filter_status',
    'task_title','task_description','task_type','priority','assignee_id','due_in_days','active'];
  const updates={updated_at:new Date().toISOString()};
  allowed.forEach(k=>{if(req.body[k]!==undefined) updates[k]=req.body[k];});
  const t=update('task_triggers',t=>t.id===req.params.id,updates);
  if(!t) return res.status(404).json({error:'Not found'});
  res.json(t);
});

router.delete('/:id',(req,res)=>{
  ensure();
  update('task_triggers',t=>t.id===req.params.id,{deleted_at:new Date().toISOString()});
  res.json({deleted:true});
});

router.post('/check',async(req,res)=>{
  try {
    const results=await runTriggerCheck(req.body?.environment_id);
    res.json({ok:true,...results,checked_at:new Date().toISOString()});
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.post('/fire-reminders',(req,res)=>{
  try {
    const store=getStore(); const now=new Date(); let fired=0;
    (store.calendar_tasks||[]).forEach(task=>{
      if(!task.reminder_at||task.deleted_at||task.status==='done'||task.reminder_sent) return;
      const mins=(now-new Date(task.reminder_at))/60000;
      if(mins>=0&&mins<15){
        task.reminder_sent=true; task.updated_at=new Date().toISOString();
        if(!store.notifications) store.notifications=[];
        store.notifications.push({
          id:uuidv4(), type:'task_reminder', title:`Reminder: ${task.title}`,
          body:task.record_name?`Regarding ${task.record_name}`:'',
          record_id:task.record_id||null, user_id:task.assignee_id||null,
          environment_id:task.environment_id, action_url:null,
          read_at:null, created_at:new Date().toISOString(),
        });
        fired++;
      }
    });
    if(fired>0) saveStore();
    res.json({ok:true,fired});
  } catch(e){ res.status(500).json({error:e.message}); }
});

module.exports = { router, runTriggerCheck, TASK_TYPES };
