// client/src/Cohorts.jsx — Cohort Community Portal admin UI
import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";

const C = { accent:'#8B7EC8', accentLight:'#F3F0FF', bg:'#F8F7FF', text1:'#0D0D0F', text2:'#374151', text3:'#6B7280', border:'#E5E7EB', green:'#10B981', red:'#EF4444' };
const F = "'Space Grotesk','DM Sans',sans-serif";
const fmt = iso => iso ? new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';

const Badge = ({label,color=C.accent}) => <span style={{padding:'2px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:`${color}18`,color,border:`1px solid ${color}28`}}>{label}</span>;
const Btn = ({onClick,children,variant='primary',small,disabled,color}) => {
  const bg = variant==='primary'?(color||C.accent):variant==='danger'?C.red:'white';
  const col = variant==='primary'||variant==='danger' ? 'white' : C.text2;
  return <button onClick={onClick} disabled={disabled} style={{padding:small?'6px 14px':'9px 18px',borderRadius:9,border:`1.5px solid ${variant==='ghost'?C.border:bg}`,background:bg,color:col,fontSize:small?12:13,fontWeight:700,cursor:disabled?'not-allowed':'pointer',fontFamily:F,display:'inline-flex',alignItems:'center',gap:6,opacity:disabled?0.5:1}}>{children}</button>;
};
const Inp = ({label,value,onChange,placeholder,type='text',...rest}) => (
  <div style={{marginBottom:16}}>
    {label&&<label style={{fontSize:12,fontWeight:700,color:C.text2,display:'block',marginBottom:5}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:'100%',padding:'9px 12px',borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,boxSizing:'border-box',outline:'none'}} {...rest}/>
  </div>
);
const Sel = ({label,value,onChange,options}) => (
  <div style={{marginBottom:16}}>
    {label&&<label style={{fontSize:12,fontWeight:700,color:C.text2,display:'block',marginBottom:5}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,background:'white'}}>
      {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>
);
const Toggle = ({label,value,onChange,hint}) => (
  <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text1}}>{label}</div>{hint&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{hint}</div>}</div>
    <button onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:99,border:'none',cursor:'pointer',background:value?C.accent:C.border,position:'relative',flexShrink:0}}>
      <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:value?23:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
    </button>
  </div>
);

// ── Cohort form modal ─────────────────────────────────────────────────────────
function CohortModal({cohort,onClose,onSave}) {
  const [form,setForm] = useState({
    name:cohort?.name||'', description:cohort?.description||'',
    programme_type:cohort?.programme_type||'Graduate Scheme',
    cohort_year:cohort?.cohort_year||new Date().getFullYear(),
    start_date:cohort?.start_date||'', intake_size:cohort?.intake_size||'',
    primary_color:cohort?.primary_color||'#8B7EC8',
    auth_mode:cohort?.auth_mode||'magic_link',
    allow_dm:cohort?.allow_dm??true, allow_member_posts:cohort?.allow_member_posts??true,
    show_member_directory:cohort?.show_member_directory??true, tasks_enabled:cohort?.tasks_enabled??true,
    status:cohort?.status||'draft',
  });
  const [saving,setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const save = async () => { if(!form.name.trim()) return; setSaving(true); await onSave(form); setSaving(false); };
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:18,padding:28,width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'auto',boxShadow:'0 8px 40px rgba(0,0,0,0.16)'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:22}}>
          <div style={{fontSize:17,fontWeight:800,color:C.text1}}>{cohort?'Edit Cohort':'New Cohort'}</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:C.text3}}>×</button>
        </div>
        <Inp label="Cohort Name *" value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Technology Graduate Scheme 2026"/>
        <div style={{marginBottom:16}}><label style={{fontSize:12,fontWeight:700,color:C.text2,display:'block',marginBottom:5}}>Description</label>
          <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={2} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,resize:'none',boxSizing:'border-box'}} placeholder="Brief description…"/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
          <Sel label="Programme Type" value={form.programme_type} onChange={v=>set('programme_type',v)} options={['Graduate Scheme','Summer Internship','Year in Industry','Placement Year','Apprenticeship','Spring Insight','Campus Hire']}/>
          <Inp label="Cohort Year" type="number" value={form.cohort_year} onChange={v=>set('cohort_year',Number(v))}/>
          <Inp label="Start Date" type="date" value={form.start_date} onChange={v=>set('start_date',v)}/>
          <Inp label="Intake Size" type="number" value={form.intake_size} onChange={v=>set('intake_size',Number(v))} placeholder="e.g. 25"/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <label style={{fontSize:12,fontWeight:700,color:C.text2}}>Brand Colour</label>
          <input type="color" value={form.primary_color} onChange={e=>set('primary_color',e.target.value)} style={{width:36,height:28,borderRadius:6,border:`1.5px solid ${C.border}`,cursor:'pointer'}}/>
          <span style={{fontSize:12,color:C.text3}}>{form.primary_color}</span>
        </div>
        <div style={{fontSize:13,fontWeight:700,color:C.text2,marginBottom:6}}>Authentication Mode</div>
        <div style={{display:'flex',gap:10,marginBottom:20}}>
          {[['magic_link','✉️ Magic Link','Passwordless — login link by email (recommended)'],['password','🔐 Password','Members set a password on first visit']].map(([val,label,desc])=>(
            <div key={val} onClick={()=>set('auth_mode',val)} style={{flex:1,padding:'10px 14px',borderRadius:10,cursor:'pointer',border:`2px solid ${form.auth_mode===val?C.accent:C.border}`,background:form.auth_mode===val?C.accentLight:'white'}}>
              <div style={{fontWeight:700,fontSize:13,color:C.text1,marginBottom:3}}>{label}</div>
              <div style={{fontSize:11,color:C.text3}}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:13,fontWeight:700,color:C.text2,marginBottom:6}}>Portal Features</div>
        <div style={{borderRadius:10,border:`1px solid ${C.border}`,padding:'0 14px',marginBottom:20}}>
          <Toggle label="Allow 1:1 Direct Messages" value={form.allow_dm} onChange={v=>set('allow_dm',v)} hint="Members can message each other privately"/>
          <Toggle label="Member Posts" value={form.allow_member_posts} onChange={v=>set('allow_member_posts',v)} hint="Members can post to the feed (admins always can)"/>
          <Toggle label="Member Directory" value={form.show_member_directory} onChange={v=>set('show_member_directory',v)} hint="Members can see who else is in the cohort"/>
          <Toggle label="Pre-joining Tasks" value={form.tasks_enabled} onChange={v=>set('tasks_enabled',v)} hint="Show a task checklist for members to complete"/>
        </div>
        <Sel label="Status" value={form.status} onChange={v=>set('status',v)} options={[{value:'draft',label:'Draft'},{value:'active',label:'Active'},{value:'archived',label:'Archived'}]}/>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
          <Btn onClick={save} disabled={saving||!form.name.trim()}>{saving?'Saving…':cohort?'Save Changes':'Create Cohort'}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Members tab ───────────────────────────────────────────────────────────────
function MembersTab({cohortId,environment}) {
  const [members,setMembers] = useState([]);
  const [loading,setLoading] = useState(true);
  const [stats,setStats] = useState(null);
  const [allPeople,setAllPeople] = useState([]);
  const [search,setSearch] = useState('');
  const [showAdd,setShowAdd] = useState(false);
  const [selected,setSelected] = useState([]);
  const load = useCallback(async()=>{
    setLoading(true);
    const [m,s] = await Promise.all([api.get(`/cohorts/${cohortId}/members`),api.get(`/cohorts/${cohortId}/stats`)]);
    setMembers(Array.isArray(m)?m:[]); setStats(s); setLoading(false);
  },[cohortId]);
  useEffect(()=>{load();},[load]);
  const loadPeople = async()=>{
    const objs = await api.get(`/objects?environment_id=${environment.id}`);
    const people = (Array.isArray(objs)?objs:[]).find(o=>o.slug==='people');
    if(!people) return;
    const r = await api.get(`/records?object_id=${people.id}&environment_id=${environment.id}&limit=200`);
    setAllPeople(Array.isArray(r.records)?r.records:[]); setShowAdd(true);
  };
  const addMembers = async()=>{ await api.post(`/cohorts/${cohortId}/members`,{person_record_ids:selected}); setShowAdd(false); setSelected([]); load(); };
  const existingIds = members.map(m=>m.person_record_id);
  const filtered = allPeople.filter(p=>!existingIds.includes(p.id)).filter(p=>{ const d=p.data||{}; const name=`${d.first_name||''} ${d.last_name||''}`.toLowerCase(); return !search||name.includes(search.toLowerCase())||(d.email||'').toLowerCase().includes(search.toLowerCase()); });
  return (
    <div>
      {stats&&<div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        {[['Members',stats.member_count],['Active Today',stats.active_today],['Posts',stats.post_count],['Intros',stats.intros_posted],['Never Logged In',stats.never_logged_in],['Task Completion',`${stats.task_completion_pct}%`]].map(([l,v])=>(
          <div key={l} style={{padding:'10px 16px',background:'white',borderRadius:10,border:`1px solid ${C.border}`,minWidth:100}}>
            <div style={{fontSize:18,fontWeight:800,color:C.accent}}>{v}</div>
            <div style={{fontSize:11,color:C.text3,fontWeight:600}}>{l}</div>
          </div>
        ))}
      </div>}
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}><Btn onClick={loadPeople} small>+ Add Members</Btn></div>
      {loading?<div style={{padding:40,textAlign:'center',color:C.text3}}>Loading…</div>:members.map(m=>{
        const d=m.person_data||{}; const name=`${d.first_name||''} ${d.last_name||''}`.trim()||'Unknown';
        const ini=name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
        return <div key={m.id} style={{display:'flex',gap:14,alignItems:'center',padding:'12px 16px',background:'white',borderRadius:10,marginBottom:8,border:`1px solid ${C.border}`}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:C.accent,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13,fontWeight:700,flexShrink:0}}>{ini}</div>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:C.text1}}>{name}</div><div style={{fontSize:12,color:C.text3}}>{d.email}{d.university?` · ${d.university}`:''}</div></div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {m.role==='admin'&&<Badge label="Admin"/>}
            <Badge label={m.last_seen?`Seen ${new Date(m.last_seen).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`:'Never logged in'} color={m.last_seen?C.green:C.text3}/>
            <button onClick={async()=>{if(window.confirm(`Remove ${name}?`)){await api.delete(`/cohorts/${cohortId}/members/${m.id}`);load();}}} style={{background:'none',border:'none',color:C.text3,cursor:'pointer',fontSize:16}}>×</button>
          </div>
        </div>;
      })}
      {showAdd&&<div onClick={()=>setShowAdd(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,padding:24,width:480,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 8px 40px rgba(0,0,0,0.16)'}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:14,color:C.text1}}>Add Members to Cohort</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people…" style={{padding:'9px 12px',borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,marginBottom:12,outline:'none'}}/>
          <div style={{flex:1,overflow:'auto',marginBottom:14}}>
            {filtered.map(p=>{ const d=p.data||{}; const name=`${d.first_name||''} ${d.last_name||''}`.trim()||d.email||'Unknown'; const isSel=selected.includes(p.id);
              return <div key={p.id} onClick={()=>setSelected(s=>isSel?s.filter(id=>id!==p.id):[...s,p.id])} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,cursor:'pointer',background:isSel?C.accentLight:'transparent',marginBottom:4}}>
                <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${isSel?C.accent:C.border}`,background:isSel?C.accent:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {isSel&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div><div style={{fontSize:13,fontWeight:600,color:C.text1}}>{name}</div>{d.email&&<div style={{fontSize:11,color:C.text3}}>{d.email}</div>}</div>
              </div>;
            })}
            {filtered.length===0&&<div style={{textAlign:'center',padding:30,color:C.text3}}>No more people to add</div>}
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <Btn onClick={()=>setShowAdd(false)} variant="ghost" small>Cancel</Btn>
            <Btn onClick={addMembers} disabled={!selected.length} small>Add {selected.length||''} Member{selected.length!==1?'s':''}</Btn>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ── Tasks tab ─────────────────────────────────────────────────────────────────
function TasksTab({cohortId}) {
  const [tasks,setTasks] = useState([]); const [adding,setAdding] = useState(false);
  const [form,setForm] = useState({title:'',description:'',task_type:'checkbox',required:false});
  const load = useCallback(async()=>{ const r=await api.get(`/cohorts/${cohortId}/tasks`); setTasks(Array.isArray(r)?r:[]); },[cohortId]);
  useEffect(()=>{load();},[load]);
  const add = async()=>{ if(!form.title.trim()) return; await api.post(`/cohorts/${cohortId}/tasks`,form); setForm({title:'',description:'',task_type:'checkbox',required:false}); setAdding(false); load(); };
  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}><Btn onClick={()=>setAdding(true)} small>+ Add Task</Btn></div>
      {adding&&<div style={{background:C.accentLight,borderRadius:12,padding:16,marginBottom:16,border:`1.5px solid ${C.accent}30`}}>
        <Inp label="Title *" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="e.g. Upload Right to Work documents"/>
        <Inp label="Description" value={form.description} onChange={v=>setForm(f=>({...f,description:v}))} placeholder="Optional details"/>
        <Sel label="Type" value={form.task_type} onChange={v=>setForm(f=>({...f,task_type:v}))} options={[{value:'checkbox',label:'☑️ Checkbox'},{value:'upload',label:'📎 File Upload'},{value:'link',label:'🔗 External Link'}]}/>
        <Toggle label="Required" value={form.required} onChange={v=>setForm(f=>({...f,required:v}))} hint="Members must complete before joining"/>
        <div style={{display:'flex',gap:8,marginTop:12}}><Btn onClick={()=>setAdding(false)} variant="ghost" small>Cancel</Btn><Btn onClick={add} small>Add Task</Btn></div>
      </div>}
      {tasks.length===0?<div style={{padding:40,textAlign:'center',color:C.text3}}>No tasks yet. Add pre-joining tasks for members to complete.</div>
        :tasks.map(t=><div key={t.id} style={{display:'flex',gap:14,alignItems:'flex-start',padding:'12px 16px',background:'white',borderRadius:10,marginBottom:8,border:`1px solid ${C.border}`}}>
          <div style={{width:28,height:28,borderRadius:7,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{t.task_type==='upload'?'📎':t.task_type==='link'?'🔗':'☑️'}</div>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:C.text1}}>{t.title}</div>{t.description&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>{t.description}</div>}
            <div style={{display:'flex',gap:8,marginTop:6}}>{t.required&&<Badge label="Required" color={C.red}/>}<Badge label={`${t.completion_count||0} completed`}/></div>
          </div>
          <button onClick={async()=>{await api.delete(`/cohorts/${cohortId}/tasks/${t.id}`);load();}} style={{background:'none',border:'none',color:C.text3,cursor:'pointer',fontSize:16}}>×</button>
        </div>)
      }
    </div>
  );
}

// ── Resources tab ─────────────────────────────────────────────────────────────
function ResourcesTab({cohortId}) {
  const [resources,setResources] = useState([]); const [adding,setAdding] = useState(false);
  const [form,setForm] = useState({title:'',description:'',resource_type:'link',url:'',category:'General'});
  const load = useCallback(async()=>{ const r=await api.get(`/cohorts/${cohortId}/resources`); setResources(Array.isArray(r)?r:[]); },[cohortId]);
  useEffect(()=>{load();},[load]);
  const add = async()=>{ if(!form.title.trim()) return; await api.post(`/cohorts/${cohortId}/resources`,form); setForm({title:'',description:'',resource_type:'link',url:'',category:'General'}); setAdding(false); load(); };
  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}><Btn onClick={()=>setAdding(true)} small>+ Add Resource</Btn></div>
      {adding&&<div style={{background:C.accentLight,borderRadius:12,padding:16,marginBottom:16,border:`1.5px solid ${C.accent}30`}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
          <div style={{gridColumn:'1/-1'}}><Inp label="Title *" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="e.g. Welcome Pack"/></div>
          <Sel label="Type" value={form.resource_type} onChange={v=>setForm(f=>({...f,resource_type:v}))} options={[{value:'link',label:'🔗 Link'},{value:'document',label:'📄 Document'},{value:'video',label:'🎬 Video'}]}/>
          <Inp label="Category" value={form.category} onChange={v=>setForm(f=>({...f,category:v}))} placeholder="e.g. Getting Started"/>
          <div style={{gridColumn:'1/-1'}}><Inp label="URL" value={form.url} onChange={v=>setForm(f=>({...f,url:v}))} placeholder="https://…"/></div>
        </div>
        <div style={{display:'flex',gap:8}}><Btn onClick={()=>setAdding(false)} variant="ghost" small>Cancel</Btn><Btn onClick={add} small>Add Resource</Btn></div>
      </div>}
      {resources.map(r=><div key={r.id} style={{display:'flex',gap:14,padding:'12px 16px',background:'white',borderRadius:10,marginBottom:8,border:`1px solid ${C.border}`,alignItems:'center'}}>
        <div style={{fontSize:20}}>{r.resource_type==='video'?'🎬':r.resource_type==='document'?'📄':'🔗'}</div>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:C.text1}}>{r.title}</div>{r.url&&<a href={r.url} target="_blank" rel="noreferrer" style={{fontSize:11,color:C.accent}}>{r.url.slice(0,60)}</a>}<div style={{marginTop:4}}><Badge label={r.category||'General'}/></div></div>
        <button onClick={async()=>{await api.delete(`/cohorts/${cohortId}/resources/${r.id}`);load();}} style={{background:'none',border:'none',color:C.text3,cursor:'pointer',fontSize:16}}>×</button>
      </div>)}
    </div>
  );
}

// ── Cohort detail ─────────────────────────────────────────────────────────────
function CohortDetail({cohort,onBack,onEdit,environment}) {
  const [tab,setTab] = useState('members');
  const portalUrl = `${window.location.origin.replace(':3000',':5173')}?portal=cohort&cohort=${cohort.portal_token}`;
  return (
    <div>
      <div style={{display:'flex',gap:16,alignItems:'flex-start',marginBottom:24}}>
        <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:C.accent,fontSize:22,padding:0,marginTop:2}}>←</button>
        <div style={{flex:1}}>
          <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:4}}>
            <div style={{width:44,height:44,borderRadius:12,background:cohort.primary_color||C.accent,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:C.text1}}>{cohort.name}</div>
              <div style={{fontSize:13,color:C.text3}}>{cohort.programme_type} · {cohort.cohort_year} · {cohort.member_count||0} members</div>
            </div>
            <Badge label={cohort.status} color={cohort.status==='active'?C.green:cohort.status==='archived'?C.text3:C.accent}/>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',marginTop:10,padding:'8px 12px',background:'#F9FAFB',borderRadius:8,border:`1px solid ${C.border}`}}>
            <span style={{fontSize:12,color:C.accent,fontFamily:'monospace',flex:1}}>{portalUrl}</span>
            <button onClick={()=>navigator.clipboard?.writeText(portalUrl)} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:C.text3,fontFamily:F}}>Copy</button>
          </div>
        </div>
        <Btn onClick={onEdit} variant="ghost" small>Edit Cohort</Btn>
      </div>
      <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:`1.5px solid ${C.border}`,paddingBottom:0}}>
        {['members','tasks','resources','settings'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'9px 18px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:700,textTransform:'capitalize',color:tab===t?C.accent:C.text3,borderBottom:tab===t?`2px solid ${C.accent}`:'2px solid transparent',marginBottom:-2,fontFamily:F}}>{t}</button>
        ))}
      </div>
      {tab==='members'&&<MembersTab cohortId={cohort.id} environment={environment}/>}
      {tab==='tasks'&&<TasksTab cohortId={cohort.id}/>}
      {tab==='resources'&&<ResourcesTab cohortId={cohort.id}/>}
      {tab==='settings'&&<div style={{padding:'20px 0',maxWidth:500}}>
        <div style={{fontSize:13,color:C.text3,marginBottom:8}}>Auth mode: <strong>{cohort.auth_mode==='magic_link'?'Magic Link (passwordless)':'Password'}</strong></div>
        <div style={{fontSize:13,color:C.text3,marginBottom:16}}>DMs: <strong>{cohort.allow_dm?'Enabled':'Disabled'}</strong> · Posts: <strong>{cohort.allow_member_posts?'Enabled':'Disabled'}</strong></div>
        <div style={{fontSize:13,color:C.text3}}>Portal token: <code style={{fontSize:11}}>{cohort.portal_token}</code></div>
        <div style={{marginTop:24,display:'flex',gap:10}}>
          <Btn onClick={onEdit} variant="ghost" small>Edit Settings</Btn>
          <Btn onClick={async()=>{if(window.confirm('Archive this cohort?')){await api.patch(`/cohorts/${cohort.id}`,{status:'archived'});onBack();}}} variant="ghost" small>Archive</Btn>
        </div>
      </div>}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CohortsModule({environment}) {
  const [cohorts,setCohorts] = useState([]);
  const [loading,setLoading] = useState(true);
  const [selected,setSelected] = useState(null);
  const [modal,setModal] = useState(null);
  const load = useCallback(async()=>{
    if(!environment?.id) return;
    setLoading(true);
    const r = await api.get(`/cohorts?environment_id=${environment.id}`);
    setCohorts(Array.isArray(r)?r:[]); setLoading(false);
  },[environment?.id]);
  useEffect(()=>{load();},[load]);
  const handleSave = async(form)=>{
    if(modal?.id) await api.patch(`/cohorts/${modal.id}`,form);
    else await api.post('/cohorts',{...form,environment_id:environment.id});
    setModal(null); load();
    if(modal?.id){ const updated=await api.get(`/cohorts/${modal.id}`); setSelected(updated); }
  };
  if(selected) return (
    <div style={{padding:'28px 32px',fontFamily:F,minHeight:'100vh',background:C.bg}}>
      <CohortDetail cohort={selected} environment={environment} onBack={()=>{setSelected(null);load();}} onEdit={()=>setModal(selected)}/>
      {modal&&<CohortModal cohort={modal.id?modal:null} onClose={()=>setModal(null)} onSave={handleSave}/>}
    </div>
  );
  return (
    <div style={{padding:'28px 32px',fontFamily:F,minHeight:'100vh',background:C.bg}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:C.text1,marginBottom:4}}>Cohort Portals</div>
          <div style={{fontSize:14,color:C.text3}}>Private community spaces for accepted candidates to connect before their start date.</div>
        </div>
        <Btn onClick={()=>setModal({})}>+ New Cohort</Btn>
      </div>
      {loading?<div style={{padding:60,textAlign:'center',color:C.text3}}>Loading…</div>
        :cohorts.length===0?<div style={{textAlign:'center',padding:80}}>
          <div style={{width:64,height:64,borderRadius:18,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div style={{fontSize:17,fontWeight:700,color:C.text1,marginBottom:8}}>No cohorts yet</div>
          <div style={{fontSize:14,color:C.text3,marginBottom:20}}>Create your first cohort portal for accepted candidates.</div>
          <Btn onClick={()=>setModal({})}>Create First Cohort</Btn>
        </div>
        :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
          {cohorts.map(c=>(
            <div key={c.id} onClick={()=>setSelected(c)} style={{background:'white',borderRadius:16,padding:20,cursor:'pointer',border:`1.5px solid ${C.border}`,boxShadow:'0 2px 12px rgba(0,0,0,0.05)',transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.10)';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.05)';e.currentTarget.style.transform='none';}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:c.primary_color||C.accent,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:15,color:C.text1,marginBottom:2}}>{c.name}</div>
                  <div style={{fontSize:12,color:C.text3}}>{c.programme_type} · {c.cohort_year}</div>
                </div>
                <Badge label={c.status} color={c.status==='active'?C.green:c.status==='archived'?C.text3:C.accent}/>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <Badge label={`${c.member_count||0} members`}/>
                {c.start_date&&<Badge label={`Starts ${fmt(c.start_date)}`} color={C.text3}/>}
                <Badge label={c.auth_mode==='magic_link'?'✉️ Magic Link':'🔐 Password'} color={C.text3}/>
                {c.allow_dm&&<Badge label="DMs on" color={C.green}/>}
              </div>
              {c.description&&<div style={{fontSize:12,color:C.text3,marginTop:12,lineHeight:1.5}}>{c.description.slice(0,100)}{c.description.length>100?'…':''}</div>}
            </div>
          ))}
        </div>
      }
      {modal!==null&&<CohortModal cohort={modal?.id?modal:null} onClose={()=>setModal(null)} onSave={handleSave}/>}
    </div>
  );
}
