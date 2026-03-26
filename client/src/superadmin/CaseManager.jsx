import { useState, useEffect, useCallback } from "react";

const api = {
  get:   url => fetch(url).then(r => r.json()),
  post:  (url,b) => fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch: (url,b) => fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
};

const TYPES = [
  {id:'bug',label:'Bug',color:'#ef4444'},{id:'feature',label:'Feature Request',color:'#8b5cf6'},
  {id:'support',label:'Support Query',color:'#3b82f6'},{id:'account',label:'Account Issue',color:'#f59e0b'},
  {id:'billing',label:'Billing',color:'#10b981'},{id:'other',label:'Other',color:'#6b7280'},
];
const PRIORITIES = [
  {id:'critical',label:'Critical',color:'#ef4444'},{id:'high',label:'High',color:'#f97316'},
  {id:'medium',label:'Medium',color:'#f59e0b'},{id:'low',label:'Low',color:'#10b981'},
];
const STATUSES = [
  {id:'open',label:'Open',color:'#3b82f6'},{id:'in_progress',label:'In Progress',color:'#8b5cf6'},
  {id:'awaiting_client',label:'Awaiting Client',color:'#f59e0b'},
  {id:'resolved',label:'Resolved',color:'#10b981'},{id:'closed',label:'Closed',color:'#6b7280'},
];
const SLA_COLORS = {ok:'#10b981',at_risk:'#f59e0b',breached:'#ef4444',met:'#6b7280'};
const F = "'Inter',-apple-system,sans-serif";
const BG='#0f1117',CARD='#1a1d27',BORDER='#2a2d3e',TEXT1='#f1f5f9',TEXT2='#94a3b8',ACCENT='#7c3aed';

const Badge=({color,children,sm})=><span style={{display:'inline-flex',alignItems:'center',padding:sm?'2px 7px':'3px 10px',borderRadius:99,fontSize:sm?10:11,fontWeight:700,background:color+'22',color,border:`1px solid ${color}44`,whiteSpace:'nowrap'}}>{children}</span>;
const Btn=({onClick,children,variant='ghost',small,disabled})=>{
  const s={primary:{background:ACCENT,color:'#fff',border:'none'},danger:{background:'#ef444422',color:'#ef4444',border:'1px solid #ef444444'},ghost:{background:'transparent',color:TEXT2,border:`1px solid ${BORDER}`}};
  return <button onClick={onClick} disabled={disabled} style={{...s[variant],fontFamily:F,fontSize:small?11:12,fontWeight:600,padding:small?'4px 10px':'7px 14px',borderRadius:8,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,whiteSpace:'nowrap'}}>{children}</button>;
};
const timeAgo=iso=>{if(!iso)return'—';const d=(Date.now()-new Date(iso))/1000;if(d<60)return'just now';if(d<3600)return`${Math.floor(d/60)}m ago`;if(d<86400)return`${Math.floor(d/3600)}h ago`;return`${Math.floor(d/86400)}d ago`;};

function StatsRow({stats}){
  const cards=[{label:'Total',value:stats.total,color:'#7c3aed'},{label:'Open',value:stats.open,color:'#3b82f6'},{label:'In Progress',value:stats.in_progress,color:'#8b5cf6'},{label:'SLA Breached',value:stats.breached,color:'#ef4444'},{label:'At Risk',value:stats.at_risk,color:'#f59e0b'},{label:'Resolved',value:stats.resolved,color:'#10b981'}];
  return <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:16}}>{cards.map(c=><div key={c.label} style={{background:BG,borderRadius:10,padding:'12px 14px',border:`1px solid ${BORDER}`}}><div style={{fontSize:20,fontWeight:800,color:c.color}}>{c.value??'—'}</div><div style={{fontSize:10,color:TEXT2,marginTop:2,fontWeight:600}}>{c.label}</div></div>)}</div>;
}

function NewCaseModal({clients,onSave,onClose}){
  const[form,setForm]=useState({subject:'',type:'support',priority:'medium',description:'',client_id:'',reporter_name:'',reporter_email:''});
  const[saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const client=clients.find(c=>c.id===form.client_id);
  const handleSave=async()=>{if(!form.subject)return;setSaving(true);try{const res=await api.post('/cases',{...form,client_name:client?.name,plan_tier:client?.plan_tier});onSave(res);}finally{setSaving(false);}};
  const inp={width:'100%',background:BG,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT1,padding:'8px 10px',fontSize:13,boxSizing:'border-box',fontFamily:F};
  const lbl={fontSize:11,color:TEXT2,fontWeight:700};
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,width:540,maxHeight:'90vh',overflow:'auto',padding:28,fontFamily:F}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:800,color:TEXT1}}>New Support Case</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:TEXT2,cursor:'pointer',fontSize:20}}>×</button>
        </div>
        <label style={lbl}>CLIENT</label>
        <select value={form.client_id} onChange={e=>set('client_id',e.target.value)} style={{...inp,marginBottom:14}}>
          <option value=''>— Select client —</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name} ({c.plan_tier})</option>)}
        </select>
        <label style={lbl}>SUBJECT *</label>
        <input value={form.subject} onChange={e=>set('subject',e.target.value)} placeholder="Brief description" style={{...inp,marginBottom:14}}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div><label style={lbl}>TYPE</label><select value={form.type} onChange={e=>set('type',e.target.value)} style={{...inp,marginTop:4}}>{TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
          <div><label style={lbl}>PRIORITY</label><select value={form.priority} onChange={e=>set('priority',e.target.value)} style={{...inp,marginTop:4}}>{PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div><label style={lbl}>REPORTER NAME</label><input value={form.reporter_name} onChange={e=>set('reporter_name',e.target.value)} style={{...inp,marginTop:4}}/></div>
          <div><label style={lbl}>REPORTER EMAIL</label><input value={form.reporter_email} onChange={e=>set('reporter_email',e.target.value)} style={{...inp,marginTop:4}}/></div>
        </div>
        <label style={lbl}>DESCRIPTION</label>
        <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={4} placeholder="Detailed description…" style={{...inp,marginBottom:20,resize:'vertical'}}/>
        {form.client_id&&<div style={{background:'#7c3aed22',border:'1px solid #7c3aed44',borderRadius:8,padding:'8px 12px',marginBottom:16,fontSize:12,color:'#c4b5fd'}}>SLA: {PRIORITIES.find(p=>p.id===form.priority)?.label} priority for {client?.plan_tier} plan</div>}
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} variant='primary' disabled={!form.subject||saving}>{saving?'Creating…':'Create Case'}</Btn>
        </div>
      </div>
    </div>
  );
}

// KEY FIX: prop renamed from 'case' (JS reserved keyword) to 'caseData'
function CaseDetail({caseData,onUpdate,onClose}){
  const[tab,setTab]=useState('thread');
  const[reply,setReply]=useState('');
  const[visibility,setVis]=useState('internal');
  const[sending,setSending]=useState(false);
  const[statusModal,setStatusModal]=useState(false);
  const[newStatus,setNewStatus]=useState('');
  const[reason,setReason]=useState('');
  if(!caseData)return null;
  const type=TYPES.find(t=>t.id===caseData.type)||TYPES[5];
  const priority=PRIORITIES.find(p=>p.id===caseData.priority)||PRIORITIES[2];
  const status=STATUSES.find(s=>s.id===caseData.status)||STATUSES[0];
  const sendReply=async()=>{if(!reply.trim())return;setSending(true);try{const thread=await api.post(`/cases/${caseData.id}/thread`,{body:reply,visibility,author_name:'Vercentic Support',type:'comment'});onUpdate({...caseData,threads:[...(caseData.threads||[]),thread]});setReply('');}finally{setSending(false);}};
  const changeStatus=async()=>{const updated=await api.patch(`/cases/${caseData.id}/status`,{status:newStatus,reason});onUpdate({...updated,threads:caseData.threads});setStatusModal(false);setReason('');};
  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',fontFamily:F}}>
      <div style={{padding:'14px 18px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'flex-start',gap:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5,flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:TEXT2,fontWeight:700}}>{caseData.case_number}</span>
            <Badge color={type.color} sm>{type.label}</Badge>
            <Badge color={priority.color} sm>{priority.label}</Badge>
            <Badge color={status.color} sm>{status.label}</Badge>
            {caseData.sla_status&&caseData.sla_status!=='met'&&<Badge color={SLA_COLORS[caseData.sla_status]} sm>SLA {caseData.sla_status==='ok'?'On Track':caseData.sla_status==='at_risk'?'At Risk':'Breached'}</Badge>}
          </div>
          <div style={{fontSize:14,fontWeight:700,color:TEXT1,lineHeight:1.3}}>{caseData.subject}</div>
          <div style={{fontSize:11,color:TEXT2,marginTop:3}}>
            {caseData.client_name&&<span style={{color:'#a78bfa',marginRight:8}}>{caseData.client_name}</span>}
            {caseData.reporter_name&&<span>Reporter: {caseData.reporter_name}</span>}
            {caseData.reporter_email&&<span style={{marginLeft:6}}>· {caseData.reporter_email}</span>}
          </div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',color:TEXT2,cursor:'pointer',fontSize:20,padding:2,flexShrink:0}}>×</button>
      </div>
      <div style={{padding:'8px 18px',borderBottom:`1px solid ${BORDER}`,display:'flex',gap:6,flexWrap:'wrap'}}>
        {caseData.status!=='in_progress'&&!['resolved','closed'].includes(caseData.status)&&<Btn small onClick={()=>{setNewStatus('in_progress');setStatusModal(true);}}>Mark In Progress</Btn>}
        {caseData.status!=='awaiting_client'&&!['resolved','closed'].includes(caseData.status)&&<Btn small onClick={()=>{setNewStatus('awaiting_client');setStatusModal(true);}}>Awaiting Client</Btn>}
        {!['resolved','closed'].includes(caseData.status)&&<Btn small onClick={()=>{setNewStatus('resolved');setStatusModal(true);}}>Resolve</Btn>}
        {caseData.status==='resolved'&&<Btn small onClick={()=>{setNewStatus('closed');setStatusModal(true);}}>Close</Btn>}
        {['resolved','closed'].includes(caseData.status)&&<Btn small onClick={()=>{setNewStatus('open');setStatusModal(true);}}>Re-open</Btn>}
      </div>
      <div style={{display:'flex',borderBottom:`1px solid ${BORDER}`}}>
        {[['thread','Thread'],['details','Details'],['sla','SLA']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{background:'none',border:'none',color:tab===id?TEXT1:TEXT2,borderBottom:tab===id?`2px solid ${ACCENT}`:'2px solid transparent',padding:'10px 16px',fontSize:12,fontWeight:tab===id?700:500,cursor:'pointer',fontFamily:F}}>{label}</button>
        ))}
      </div>
      <div style={{flex:1,overflow:'auto',padding:16}}>
        {tab==='thread'&&<>
          {(caseData.threads||[]).length===0&&<div style={{textAlign:'center',color:TEXT2,fontSize:12,padding:40}}>No messages yet — add a note below.</div>}
          {(caseData.threads||[]).map((t,i)=>(
            <div key={t.id||i} style={{marginBottom:10,padding:'11px 13px',borderRadius:10,background:t.visibility==='internal'?'#1e1b4b':'#0f2d1a',border:`1px solid ${t.visibility==='internal'?'#3730a333':'#16653333'}`}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                <span style={{fontSize:10,fontWeight:700,color:t.visibility==='internal'?'#a78bfa':'#4ade80'}}>{t.visibility==='internal'?'🔒 Internal':'👤 Client visible'}</span>
                <span style={{fontSize:11,color:TEXT2}}>{t.author_name}</span>
                <span style={{marginLeft:'auto',fontSize:11,color:TEXT2}}>{timeAgo(t.created_at)}</span>
              </div>
              <div style={{fontSize:13,color:TEXT1,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{t.body}</div>
            </div>
          ))}
        </>}
        {tab==='details'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[['Case #',caseData.case_number||'—'],['Client',caseData.client_name||'—'],['Plan',caseData.plan_tier||'—'],['Reporter',caseData.reporter_name||'—'],['Email',caseData.reporter_email||'—'],['Assignee',caseData.assignee_name||'Unassigned'],['Created',caseData.created_at?new Date(caseData.created_at).toLocaleString():'—'],['Updated',caseData.updated_at?new Date(caseData.updated_at).toLocaleString():'—'],['First Response',caseData.first_response_at?new Date(caseData.first_response_at).toLocaleString():'Pending'],['Resolved',caseData.resolved_at?new Date(caseData.resolved_at).toLocaleString():'—']].map(([k,v])=>(
            <div key={k} style={{background:BG,borderRadius:8,padding:'10px 12px',border:`1px solid ${BORDER}`}}><div style={{fontSize:10,color:TEXT2,fontWeight:700,marginBottom:3}}>{k}</div><div style={{fontSize:13,color:TEXT1}}>{v}</div></div>
          ))}
        </div>}
        {tab==='sla'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
          {[{label:'Response SLA',due:caseData.response_due,hours:caseData.response_hours,done:!!caseData.first_response_at,doneAt:caseData.first_response_at},{label:'Resolution SLA',due:caseData.resolve_due,hours:caseData.resolve_hours,done:!!caseData.resolved_at,doneAt:caseData.resolved_at}].map(item=>{
            const pct=item.done?100:Math.min(100,((Date.now()-new Date(caseData.created_at))/((item.hours||72)*3600000))*100);
            const color=item.done?'#10b981':pct>80?'#ef4444':pct>60?'#f59e0b':'#7c3aed';
            return(<div key={item.label} style={{background:BG,borderRadius:12,padding:14,border:`1px solid ${BORDER}`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:TEXT1}}>{item.label}</span><Badge color={color} sm>{item.done?`✓ Met ${timeAgo(item.doneAt)}`:`Due ${timeAgo(item.due)}`}</Badge></div>
              <div style={{background:'#1a1d27',borderRadius:99,height:7,overflow:'hidden'}}><div style={{height:7,width:`${pct}%`,background:color,borderRadius:99,transition:'width .3s'}}/></div>
              <div style={{fontSize:11,color:TEXT2,marginTop:5}}>Target: {item.hours}h · Due: {item.due?new Date(item.due).toLocaleString():'—'}</div>
            </div>);
          })}
        </div>}
      </div>
      {!['closed'].includes(caseData.status)&&<div style={{padding:'10px 16px',borderTop:`1px solid ${BORDER}`,background:CARD}}>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          {[['internal','🔒 Internal'],['client','👤 Client visible']].map(([v,l])=>(
            <button key={v} onClick={()=>setVis(v)} style={{background:visibility===v?(v==='internal'?'#3730a3':'#15532e'):'transparent',border:`1px solid ${visibility===v?(v==='internal'?'#6366f1':'#4ade80'):BORDER}`,borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:700,color:visibility===v?'#fff':TEXT2,cursor:'pointer',fontFamily:F}}>{l}</button>
          ))}
        </div>
        <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3} placeholder={visibility==='internal'?'Internal note — not visible to client…':'Reply visible to client…'} style={{width:'100%',background:BG,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT1,padding:'8px 10px',fontSize:13,resize:'none',boxSizing:'border-box',fontFamily:F}}/>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:6}}><Btn onClick={sendReply} variant='primary' small disabled={!reply.trim()||sending}>{sending?'Sending…':visibility==='internal'?'Add Note':'Send Reply'}</Btn></div>
      </div>}
      {statusModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:24,width:360,fontFamily:F}}>
          <div style={{fontSize:14,fontWeight:700,color:TEXT1,marginBottom:14}}>Change to: {STATUSES.find(s=>s.id===newStatus)?.label}</div>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="Reason (optional)…" style={{width:'100%',background:BG,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT1,padding:'8px 10px',fontSize:13,resize:'none',boxSizing:'border-box',fontFamily:F,marginBottom:14}}/>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><Btn small onClick={()=>setStatusModal(false)}>Cancel</Btn><Btn small variant='primary' onClick={changeStatus}>Confirm</Btn></div>
        </div>
      </div>}
    </div>
  );
}

// KEY FIX: CaseRow also uses 'caseData' not 'case'
function CaseRow({caseData,onClick,selected}){
  const type=TYPES.find(t=>t.id===caseData.type)||TYPES[5];
  const priority=PRIORITIES.find(p=>p.id===caseData.priority)||PRIORITIES[2];
  const status=STATUSES.find(s=>s.id===caseData.status)||STATUSES[0];
  return(<tr onClick={onClick} style={{cursor:'pointer',borderBottom:`1px solid ${BORDER}`,background:selected?'#7c3aed22':'transparent',transition:'background .1s'}} onMouseEnter={e=>!selected&&(e.currentTarget.style.background='#ffffff08')} onMouseLeave={e=>!selected&&(e.currentTarget.style.background='transparent')}>
    <td style={{padding:'9px 12px',fontSize:11,fontWeight:700,color:TEXT2}}>{caseData.case_number}</td>
    <td style={{padding:'9px 12px'}}><div style={{fontSize:13,fontWeight:600,color:TEXT1,maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{caseData.subject}</div>{caseData.client_name&&<div style={{fontSize:11,color:'#a78bfa',marginTop:1}}>{caseData.client_name}</div>}</td>
    <td style={{padding:'9px 12px'}}><Badge color={type.color} sm>{type.label}</Badge></td>
    <td style={{padding:'9px 12px'}}><Badge color={priority.color} sm>{priority.label}</Badge></td>
    <td style={{padding:'9px 12px'}}><Badge color={status.color} sm>{status.label}</Badge></td>
    <td style={{padding:'9px 12px'}}>{caseData.sla_status&&caseData.sla_status!=='met'?<Badge color={SLA_COLORS[caseData.sla_status]} sm>{caseData.sla_status==='ok'?'On Track':caseData.sla_status==='at_risk'?'At Risk':'Breached'}</Badge>:<span style={{fontSize:11,color:TEXT2}}>—</span>}</td>
    <td style={{padding:'9px 12px',fontSize:12,color:caseData.assignee_name?TEXT2:'#ef444488'}}>{caseData.assignee_name||'Unassigned'}</td>
    <td style={{padding:'9px 12px',fontSize:11,color:TEXT2}}>{timeAgo(caseData.created_at)}</td>
  </tr>);
}

export default function CaseManager(){
  const[cases,setCases]=useState([]);
  const[stats,setStats]=useState({});
  const[clients,setClients]=useState([]);
  const[selected,setSelected]=useState(null);
  const[loading,setLoading]=useState(true);
  const[showNew,setShowNew]=useState(false);
  const[search,setSearch]=useState('');
  const[filters,setFilters]=useState({status:'',type:'',priority:''});
  const[total,setTotal]=useState(0);
  const load=useCallback(async()=>{setLoading(true);try{const params=new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>v)));if(search)params.set('search',search);const[cRes,sRes,clRes]=await Promise.all([api.get(`/cases?${params}`),api.get('/cases/stats'),api.get('/superadmin/clients')]);setCases(Array.isArray(cRes.cases)?cRes.cases:[]);setTotal(cRes.total||0);setStats(sRes||{});setClients(Array.isArray(clRes)?clRes:[]);}finally{setLoading(false);}},[filters,search]);
  useEffect(()=>{load();},[load]);
  const openCase=async(c)=>{try{const full=await api.get(`/cases/${c.id}`);if(full&&!full.error)setSelected(full);}catch(e){console.error(e);}};
  const handleUpdate=updated=>{setCases(cs=>cs.map(c=>c.id===updated.id?{...c,...updated}:c));setSelected(updated);};
  const handleNewCase=async(c)=>{setShowNew(false);await load();if(c?.id)openCase(c);};
  return(<div style={{display:'flex',height:'100%',fontFamily:F,color:TEXT1,overflow:'hidden'}}>
    <div style={{flex:selected?'0 0 58%':'1',borderRight:selected?`1px solid ${BORDER}`:'none',display:'flex',flexDirection:'column',overflow:'hidden',transition:'flex .2s'}}>
      <div style={{padding:'16px 18px',borderBottom:`1px solid ${BORDER}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}><div style={{fontSize:16,fontWeight:800}}>Support Cases</div><Btn onClick={()=>setShowNew(true)} variant='primary'>+ New Case</Btn></div>
        <StatsRow stats={stats}/>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cases…" style={{flex:1,minWidth:140,background:BG,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT1,padding:'7px 12px',fontSize:12,fontFamily:F}}/>
          {[{key:'status',opts:STATUSES,label:'All Statuses'},{key:'type',opts:TYPES,label:'All Types'},{key:'priority',opts:PRIORITIES,label:'All Priorities'}].map(({key,opts,label})=>(
            <select key={key} value={filters[key]} onChange={e=>setFilters(f=>({...f,[key]:e.target.value}))} style={{background:BG,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT1,padding:'7px 10px',fontSize:12,fontFamily:F}}><option value=''>{label}</option>{opts.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select>
          ))}
          <Btn small onClick={load}>Refresh</Btn>
        </div>
      </div>
      <div style={{flex:1,overflow:'auto'}}>
        {loading?<div style={{textAlign:'center',padding:60,color:TEXT2}}>Loading…</div>:cases.length===0?<div style={{textAlign:'center',padding:60,color:TEXT2}}><div style={{fontSize:28,marginBottom:10}}>📋</div><div style={{fontSize:14,fontWeight:700,marginBottom:6}}>No cases yet</div><div style={{fontSize:12}}>Create your first support case to get started</div></div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>{['#','Subject','Type','Priority','Status','SLA','Assignee','Created'].map(h=><th key={h} style={{padding:'7px 12px',fontSize:10,fontWeight:700,color:TEXT2,textAlign:'left',textTransform:'uppercase',letterSpacing:'.05em'}}>{h}</th>)}</tr></thead>
            <tbody>{cases.map(c=><CaseRow key={c.id} caseData={c} selected={selected?.id===c.id} onClick={()=>selected?.id===c.id?setSelected(null):openCase(c)}/>)}</tbody>
          </table>
        )}
        {total>cases.length&&<div style={{textAlign:'center',padding:'10px 0',fontSize:12,color:TEXT2}}>Showing {cases.length} of {total} cases</div>}
      </div>
    </div>
    {selected&&<div style={{flex:'0 0 42%',display:'flex',flexDirection:'column',overflow:'hidden'}}><CaseDetail caseData={selected} onUpdate={handleUpdate} onClose={()=>setSelected(null)}/></div>}
    {showNew&&<NewCaseModal clients={clients} onSave={handleNewCase} onClose={()=>setShowNew(false)}/>}
  </div>);
}
