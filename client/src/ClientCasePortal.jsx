import { useState, useEffect, useCallback } from "react";

const F = "'DM Sans',-apple-system,sans-serif";
const ACCENT = "#4361EE";
const api = {
  get:  url => fetch(url).then(r => r.json()),
  post: (url,b) => fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
};
const TYPES=[{id:'bug',label:'Bug',color:'#ef4444'},{id:'feature',label:'Feature Request',color:'#8b5cf6'},{id:'support',label:'Support Query',color:'#3b82f6'},{id:'account',label:'Account Issue',color:'#f59e0b'},{id:'billing',label:'Billing',color:'#10b981'},{id:'other',label:'Other',color:'#6b7280'}];
const PRIORITIES=[{id:'low',label:'Low'},{id:'medium',label:'Medium'},{id:'high',label:'High'},{id:'critical',label:'Critical'}];
const STATUSES=[{id:'open',label:'Open',color:'#3b82f6'},{id:'in_progress',label:'In Progress',color:'#8b5cf6'},{id:'awaiting_client',label:'Awaiting Client',color:'#f59e0b'},{id:'resolved',label:'Resolved',color:'#10b981'},{id:'closed',label:'Closed',color:'#6b7280'}];
const timeAgo=iso=>{if(!iso)return'—';const d=(Date.now()-new Date(iso))/1000;if(d<60)return'just now';if(d<3600)return`${Math.floor(d/60)}m ago`;if(d<86400)return`${Math.floor(d/3600)}h ago`;return`${Math.floor(d/86400)}d ago`;};
const Badge=({color,children})=><span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:700,background:color+'18',color,border:`1px solid ${color}30`}}>{children}</span>;

function NewCaseForm({session,onSubmit,onCancel}){
  const[form,setForm]=useState({subject:'',type:'support',priority:'medium',description:''});
  const[saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const handleSubmit=async()=>{
    if(!form.subject||!form.description)return;setSaving(true);
    try{const res=await api.post('/cases',{...form,reporter_name:`${session?.user?.first_name||''} ${session?.user?.last_name||''}`.trim()||'Client User',reporter_email:session?.user?.email||''});onSubmit(res);}
    finally{setSaving(false);}
  };
  const inp={width:'100%',border:'1.5px solid #e5e7eb',borderRadius:10,padding:'10px 12px',fontSize:14,fontFamily:F,outline:'none',boxSizing:'border-box',background:'white'};
  return(
    <div style={{background:'white',borderRadius:16,border:'1px solid #f0f0f0',padding:28,boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
      <div style={{fontSize:18,fontWeight:800,color:'#111827',marginBottom:20}}>Submit a Support Request</div>
      <label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6}}>SUBJECT *</label>
      <input value={form.subject} onChange={e=>set('subject',e.target.value)} placeholder="Brief description of your issue" style={{...inp,marginBottom:16}}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        <div><label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6}}>TYPE</label><select value={form.type} onChange={e=>set('type',e.target.value)} style={inp}>{TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
        <div><label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6}}>PRIORITY</label><select value={form.priority} onChange={e=>set('priority',e.target.value)} style={inp}>{PRIORITIES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
      </div>
      <label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6}}>DESCRIPTION *</label>
      <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={5} placeholder="Please describe your issue in detail — steps to reproduce, what you expected vs what happened, any error messages…" style={{...inp,resize:'vertical',marginBottom:20}}/>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <button onClick={onCancel} style={{padding:'9px 18px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'white',fontFamily:F,fontSize:13,fontWeight:600,cursor:'pointer',color:'#374151'}}>Cancel</button>
        <button onClick={handleSubmit} disabled={!form.subject||!form.description||saving} style={{padding:'9px 20px',borderRadius:9,border:'none',background:ACCENT,color:'white',fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',opacity:(!form.subject||!form.description||saving)?0.5:1}}>{saving?'Submitting…':'Submit Case'}</button>
      </div>
    </div>
  );
}

function CaseThreadView({caseData,session,onBack,onUpdate}){
  const[reply,setReply]=useState('');
  const[sending,setSending]=useState(false);
  const status=STATUSES.find(s=>s.id===caseData.status)||STATUSES[0];
  const type=TYPES.find(t=>t.id===caseData.type)||TYPES[5];
  // clients only see 'client' visibility threads
  const visibleThreads=(caseData.threads||[]).filter(t=>t.visibility==='client'||t.type==='status_change');
  const sendReply=async()=>{
    if(!reply.trim())return;setSending(true);
    try{const thread=await api.post(`/cases/${caseData.id}/thread`,{body:reply,visibility:'client',author_name:`${session?.user?.first_name||''} ${session?.user?.last_name||''}`.trim()||'Client',author_email:session?.user?.email,type:'comment'});onUpdate({...caseData,threads:[...(caseData.threads||[]),thread]});setReply('');}
    finally{setSending(false);}
  };
  return(
    <div style={{background:'white',borderRadius:16,border:'1px solid #f0f0f0',overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
      <div style={{padding:'20px 24px',borderBottom:'1px solid #f3f4f6'}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:ACCENT,fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',marginBottom:12,padding:0}}>← Back to cases</button>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:700,color:'#9ca3af'}}>{caseData.case_number}</span>
              <Badge color={type.color}>{type.label}</Badge>
              <Badge color={status.color}>{status.label}</Badge>
            </div>
            <div style={{fontSize:18,fontWeight:800,color:'#111827',lineHeight:1.3}}>{caseData.subject}</div>
            <div style={{fontSize:13,color:'#6b7280',marginTop:4}}>Opened {timeAgo(caseData.created_at)}</div>
          </div>
        </div>
      </div>
      <div style={{padding:'20px 24px',minHeight:200,maxHeight:440,overflow:'auto'}}>
        {visibleThreads.length===0&&<div style={{textAlign:'center',padding:'40px 0',color:'#9ca3af'}}><div style={{fontSize:24,marginBottom:8}}>💬</div><div style={{fontSize:14,fontWeight:600,marginBottom:4}}>No messages yet</div><div style={{fontSize:13}}>Our team will respond here shortly.</div></div>}
        {visibleThreads.map((t,i)=>{
          const isClient=t.author_email===session?.user?.email;
          return(<div key={t.id||i} style={{marginBottom:16,display:'flex',flexDirection:'column',alignItems:isClient?'flex-end':'flex-start'}}>
            <div style={{maxWidth:'78%',padding:'12px 16px',borderRadius:isClient?'16px 4px 16px 16px':'4px 16px 16px 16px',background:isClient?ACCENT+'18':'#f9fafb',border:`1px solid ${isClient?ACCENT+'30':'#e5e7eb'}`}}>
              <div style={{fontSize:11,fontWeight:700,color:isClient?ACCENT:'#6b7280',marginBottom:4}}>{isClient?'You':'Vercentic Support'}</div>
              <div style={{fontSize:14,color:'#111827',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{t.body}</div>
            </div>
            <div style={{fontSize:11,color:'#9ca3af',marginTop:3,paddingLeft:4,paddingRight:4}}>{timeAgo(t.created_at)}</div>
          </div>);
        })}
      </div>
      {!['closed','resolved'].includes(caseData.status)&&<div style={{padding:'16px 24px',borderTop:'1px solid #f3f4f6',background:'#fafafa'}}>
        <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3} placeholder="Add a reply…" style={{width:'100%',border:'1.5px solid #e5e7eb',borderRadius:10,padding:'10px 12px',fontSize:14,fontFamily:F,outline:'none',boxSizing:'border-box',resize:'none',background:'white'}}/>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
          <button onClick={sendReply} disabled={!reply.trim()||sending} style={{padding:'8px 18px',borderRadius:9,border:'none',background:ACCENT,color:'white',fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',opacity:(!reply.trim()||sending)?0.5:1}}>{sending?'Sending…':'Send Reply'}</button>
        </div>
      </div>}
      {['resolved','closed'].includes(caseData.status)&&<div style={{padding:'12px 24px',background:'#f0fdf4',borderTop:'1px solid #bbf7d0',textAlign:'center',fontSize:13,color:'#15803d',fontWeight:600}}>✓ This case has been {caseData.status}. Need more help? Open a new case.</div>}
    </div>
  );
}

function CaseCard({caseData,onClick}){
  const status=STATUSES.find(s=>s.id===caseData.status)||STATUSES[0];
  const type=TYPES.find(t=>t.id===caseData.type)||TYPES[5];
  const clientThreads=(caseData.threads||[]).filter(t=>t.visibility==='client');
  return(<div onClick={onClick} style={{background:'white',border:'1px solid #f0f0f0',borderRadius:14,padding:'16px 20px',cursor:'pointer',transition:'all .15s',display:'flex',alignItems:'flex-start',gap:14}} onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)';e.currentTarget.style.borderColor='#d1d5db';}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='#f0f0f0';}}>
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>{caseData.case_number}</span><Badge color={type.color}>{type.label}</Badge><Badge color={status.color}>{status.label}</Badge></div>
      <div style={{fontSize:15,fontWeight:700,color:'#111827',marginBottom:4,lineHeight:1.3}}>{caseData.subject}</div>
      <div style={{fontSize:12,color:'#9ca3af'}}>{timeAgo(caseData.created_at)} · {clientThreads.length} message{clientThreads.length!==1?'s':''}</div>
    </div>
    <div style={{color:'#d1d5db',fontSize:18,flexShrink:0,marginTop:4}}>›</div>
  </div>);
}

export default function ClientCasePortal({session}){
  const[cases,setCases]=useState([]);
  const[loading,setLoading]=useState(true);
  const[view,setView]=useState('list');
  const[selected,setSelected]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const email=session?.user?.email;
      const res=await api.get('/cases?limit=100');
      const all=Array.isArray(res.cases)?res.cases:[];
      const filtered=email?all.filter(c=>c.reporter_email===email||['super_admin','admin'].includes(session?.user?.role?.slug)):all;
      const withThreads=await Promise.all(filtered.map(async c=>{try{const full=await api.get(`/cases/${c.id}`);return full&&!full.error?full:c;}catch{return c;}}));
      setCases(withThreads);
    }finally{setLoading(false);}
  },[session?.user?.email]);

  useEffect(()=>{load();},[load]);

  const handleNewCase=async(c)=>{await load();try{const full=await api.get(`/cases/${c.id}`);if(full&&!full.error){setSelected(full);setView('thread');}}catch{setView('list');}};
  const handleSelectCase=(c)=>{setSelected(c);setView('thread');};
  const openCount=cases.filter(c=>!['closed','resolved'].includes(c.status)).length;
  const resolvedCount=cases.filter(c=>['closed','resolved'].includes(c.status)).length;

  return(
    <div style={{maxWidth:760,margin:'0 auto',padding:'32px 24px',fontFamily:F}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div>
          <div style={{fontSize:24,fontWeight:800,color:'#111827'}}>Support</div>
          <div style={{fontSize:14,color:'#6b7280',marginTop:2}}>Track your support requests and communicate with our team</div>
        </div>
        {view==='list'&&<button onClick={()=>setView('new')} style={{padding:'10px 20px',borderRadius:10,border:'none',background:ACCENT,color:'white',fontFamily:F,fontSize:14,fontWeight:700,cursor:'pointer'}}>+ New Request</button>}
      </div>

      {view==='list'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:28}}>
        {[['Total Cases',cases.length,'#7c3aed'],['Open',openCount,'#3b82f6'],['Resolved',resolvedCount,'#10b981']].map(([label,val,color])=>(
          <div key={label} style={{background:'white',border:'1px solid #f0f0f0',borderRadius:14,padding:'16px 20px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}><div style={{fontSize:22,fontWeight:800,color}}>{val}</div><div style={{fontSize:12,color:'#9ca3af',marginTop:2,fontWeight:600}}>{label}</div></div>
        ))}
      </div>}

      {view==='new'&&<NewCaseForm session={session} onSubmit={handleNewCase} onCancel={()=>setView('list')}/>}
      {view==='thread'&&selected&&<CaseThreadView caseData={selected} session={session} onBack={()=>{setView('list');setSelected(null);}} onUpdate={updated=>{setCases(cs=>cs.map(c=>c.id===updated.id?updated:c));setSelected(updated);}}/>}

      {view==='list'&&(loading?(
        <div style={{textAlign:'center',padding:60,color:'#9ca3af'}}>Loading your cases…</div>
      ):cases.length===0?(
        <div style={{textAlign:'center',padding:60,color:'#9ca3af',background:'white',borderRadius:16,border:'1px solid #f0f0f0'}}>
          <div style={{fontSize:36,marginBottom:12}}>💬</div>
          <div style={{fontSize:16,fontWeight:700,color:'#374151',marginBottom:8}}>No support cases yet</div>
          <div style={{fontSize:14,marginBottom:20}}>Need help? Submit your first support request.</div>
          <button onClick={()=>setView('new')} style={{padding:'10px 20px',borderRadius:10,border:'none',background:ACCENT,color:'white',fontFamily:F,fontSize:14,fontWeight:700,cursor:'pointer'}}>+ New Request</button>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {cases.filter(c=>!['closed','resolved'].includes(c.status)).length>0&&<>
            <div style={{fontSize:11,fontWeight:800,color:'#9ca3af',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:4}}>Active Cases</div>
            {cases.filter(c=>!['closed','resolved'].includes(c.status)).map(c=><CaseCard key={c.id} caseData={c} onClick={()=>handleSelectCase(c)}/>)}
          </>}
          {cases.filter(c=>['closed','resolved'].includes(c.status)).length>0&&<>
            <div style={{fontSize:11,fontWeight:800,color:'#9ca3af',letterSpacing:'.06em',textTransform:'uppercase',marginTop:8,marginBottom:4}}>Resolved Cases</div>
            {cases.filter(c=>['closed','resolved'].includes(c.status)).map(c=><CaseCard key={c.id} caseData={c} onClick={()=>handleSelectCase(c)}/>)}
          </>}
        </div>
      ))}
    </div>
  );
}
