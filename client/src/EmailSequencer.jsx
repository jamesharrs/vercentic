import { useState, useEffect, useCallback } from "react";

const API = (path, opts={}) => fetch(`/api/sequencer${path}`, { credentials:'include', headers:{'Content-Type':'application/json',...(opts.headers||{})}, ...opts }).then(r=>r.json());

const C = { bg:"#F8F7FF", surface:"white", border:"rgba(0,0,0,0.07)", accent:"#5B21B6", accentL:"#EDE9FE", text1:"#111827", text2:"#374151", text3:"#9CA3AF", green:"#059669", greenL:"#ECFDF5", amber:"#D97706", amberL:"#FFFBEB", red:"#DC2626", redL:"#FEF2F2" };
const F = "'DM Sans',-apple-system,sans-serif";

const PATHS = {
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 8 8-8",
  plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12", edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6", check:"M20 6L9 17l-5-5", zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  list:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  arrow:"M5 12h14M12 5l7 7-7 7", chart:"M18 20V10M12 20V4M6 20v-6", loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4",
  copy:"M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
};
const Ic = ({n,s=16,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[n]||""}/></svg>;

const Badge = ({children,color=C.accent,bg}) => <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,color,background:bg||color+"18",whiteSpace:"nowrap"}}>{children}</span>;
const Btn = ({onClick,children,v="primary",s="sm",icon,disabled,style={}}) => {
  const pad={sm:"6px 14px",md:"9px 18px"};
  const styles = v==="primary" ? {background:C.accent,color:"white",border:"none"} : v==="danger" ? {background:C.red,color:"white",border:"none"} : {background:"transparent",color:C.text2,border:`1.5px solid ${C.border}`};
  return <button onClick={onClick} disabled={disabled} style={{display:"flex",alignItems:"center",gap:6,padding:pad[s],borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontSize:13,fontWeight:600,fontFamily:F,transition:"opacity .15s",opacity:disabled?.5:1,...styles,...style}}>{icon&&<Ic n={icon} s={13}/>}{children}</button>;
};
const Inp = ({label,value,onChange,placeholder,type="text",multiline,rows=5}) => (
  <div style={{marginBottom:14}}>
    {label&&<div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:5,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</div>}
    {multiline
      ? <textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,background:C.surface,resize:"vertical",boxSizing:"border-box"}}/>
      : <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,background:C.surface,boxSizing:"border-box"}}/>}
  </div>
);
const Sel = ({label,value,onChange,options}) => (
  <div style={{marginBottom:14}}>
    {label&&<div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:5,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</div>}
    <select value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,background:C.surface}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ── MERGE TAG HELP ────────────────────────────────────────────────────────────
const MERGE_TAGS = ['{{client_name}}','{{admin_first_name}}','{{admin_email}}','{{environment_name}}','{{login_url}}','{{days_since_signup}}','{{unsubscribe_url}}'];

// ── TEMPLATE EDITOR ───────────────────────────────────────────────────────────
function TemplateEditor({ template, onSave, onClose, testEmail }) {
  const isNew = !template?.id;
  const [form, setForm] = useState({ name:'', subject:'', body_html:'', body_text:'', from_name:'Vercentic', from_email:'hello@vercentic.com', ...template });
  const [tab, setTab] = useState('edit'); // edit | preview | merge
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testAddr, setTestAddr] = useState(testEmail||'');
  const [testResult, setTestResult] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const save = async () => {
    if(!form.name||!form.subject||!form.body_html) return alert('Name, subject and body required');
    setSaving(true);
    const result = isNew ? await API('/templates',{method:'POST',body:JSON.stringify(form)}) : await API(`/templates/${template.id}`,{method:'PATCH',body:JSON.stringify(form)});
    setSaving(false);
    if(result.error) return alert(result.error);
    onSave(result);
  };

  const sendTest = async () => {
    if(!testAddr) return;
    setTestSending(true); setTestResult(null);
    const r = await API(`/templates/${template?.id}/test-send`,{method:'POST',body:JSON.stringify({to_email:testAddr})});
    setTestSending(false);
    setTestResult(r.ok ? '✓ Sent!' : `Error: ${r.error}`);
  };

  const preview = (form.body_html||'').replace(/\{\{(\w+)\}\}/g, (_,k)=>({client_name:'Acme Corp',admin_first_name:'James',environment_name:'Acme Production',login_url:'https://app.vercentic.com',days_since_signup:'3',unsubscribe_url:'#'})[k]||`[${k}]`);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.surface,borderRadius:16,width:"min(900px,96vw)",height:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.2)"}}>
        {/* Header */}
        <div style={{padding:"16px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{fontSize:16,fontWeight:700,color:C.text1}}>{isNew?"New Template":"Edit Template"}</div>
          <div style={{display:"flex",gap:8}}>
            <Btn v="secondary" icon="x" onClick={onClose}>Cancel</Btn>
            <Btn icon="check" disabled={saving} onClick={save}>{saving?"Saving…":"Save Template"}</Btn>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          {[{id:'edit',label:'Edit'},{id:'preview',label:'Preview'},{id:'merge',label:'Merge Tags'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 18px",border:"none",background:"transparent",fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?C.accent:C.text3,borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",cursor:"pointer",fontFamily:F,marginBottom:-1}}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          {tab==='edit' && <>
            <Inp label="Template Name" value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Welcome Email"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="From Name" value={form.from_name} onChange={v=>set('from_name',v)}/>
              <Inp label="From Email" value={form.from_email} onChange={v=>set('from_email',v)} type="email"/>
            </div>
            <Inp label="Subject Line" value={form.subject} onChange={v=>set('subject',v)} placeholder="Welcome to Vercentic, {{admin_first_name}}!"/>
            <Inp label="Email Body (HTML)" value={form.body_html} onChange={v=>set('body_html',v)} multiline rows={16} placeholder="<p>Hi {{admin_first_name}},</p>..."/>
            <Inp label="Plain Text Fallback" value={form.body_text} onChange={v=>set('body_text',v)} multiline rows={4} placeholder="Plain text version for email clients that don't render HTML"/>

            {!isNew && (
              <div style={{marginTop:8,padding:"14px 16px",background:C.bg,borderRadius:10,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:8}}>Test send</div>
                <div style={{display:"flex",gap:8}}>
                  <input value={testAddr} onChange={e=>setTestAddr(e.target.value)} placeholder="your@email.com" style={{flex:1,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F}}/>
                  <Btn icon="send" disabled={testSending||!testAddr} onClick={sendTest}>{testSending?"Sending…":"Send test"}</Btn>
                </div>
                {testResult && <div style={{marginTop:8,fontSize:12,color:testResult.startsWith('✓')?C.green:C.red}}>{testResult}</div>}
              </div>
            )}
          </>}

          {tab==='preview' && (
            <div>
              <div style={{marginBottom:12,padding:"10px 14px",background:C.bg,borderRadius:8,fontSize:12,color:C.text3}}>
                Preview using sample data: <strong>James @ Acme Corp</strong>
              </div>
              <div style={{border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                <div style={{padding:"14px 20px",background:"#f9fafb",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                  <div><strong>Subject:</strong> {(form.subject||'').replace(/\{\{(\w+)\}\}/g,(_,k)=>({admin_first_name:'James',client_name:'Acme Corp'})[k]||k)}</div>
                  <div style={{marginTop:4,color:C.text3}}><strong>From:</strong> {form.from_name} &lt;{form.from_email}&gt;</div>
                </div>
                <iframe srcDoc={preview} style={{width:"100%",height:500,border:"none"}} title="Email preview"/>
              </div>
            </div>
          )}

          {tab==='merge' && (
            <div>
              <div style={{marginBottom:16,fontSize:13,color:C.text2,lineHeight:1.6}}>Copy these tags into your subject or body — they'll be replaced with real client data when the email sends.</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                {MERGE_TAGS.map(tag=>(
                  <div key={tag} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
                    <code style={{fontSize:13,color:C.accent,fontWeight:600}}>{tag}</code>
                    <button onClick={()=>navigator.clipboard.writeText(tag)} style={{border:"none",background:"none",cursor:"pointer",color:C.text3}}>
                      <Ic n="copy" s={13}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SEQUENCE BUILDER ──────────────────────────────────────────────────────────
function SequenceBuilder({ sequence, templates, milestones, goals, onSave, onClose }) {
  const isNew = !sequence?.id;
  const [form, setForm] = useState({ name:'', description:'', trigger:'client_provisioned', goal:'none', active:true, ...sequence });
  const [steps, setSteps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStep, setNewStep] = useState({ template_id:'', delay_days:0, delay_hours:0, condition:'goal_not_met' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    if(sequence?.id) API(`/sequences/${sequence.id}/steps`).then(setSteps);
  },[sequence?.id]);

  const save = async () => {
    if(!form.name||!form.trigger) return alert('Name and trigger required');
    setSaving(true);
    const result = isNew
      ? await API('/sequences',{method:'POST',body:JSON.stringify(form)})
      : await API(`/sequences/${sequence.id}`,{method:'PATCH',body:JSON.stringify(form)});
    setSaving(false);
    if(result.error) return alert(result.error);
    onSave(result);
  };

  const addStep = async () => {
    if(!newStep.template_id) return;
    const seqId = sequence?.id;
    if(!seqId) return alert('Save the sequence first, then add steps');
    const result = await API(`/sequences/${seqId}/steps`,{method:'POST',body:JSON.stringify(newStep)});
    if(result.error) return alert(result.error);
    setSteps(s=>[...s,result]);
    setNewStep({template_id:'',delay_days:0,delay_hours:0,condition:'goal_not_met'});
    setShowAddStep(false);
  };

  const removeStep = async (stepId, seqId) => {
    await API(`/sequences/${seqId}/steps/${stepId}`,{method:'DELETE'});
    setSteps(s=>s.filter(x=>x.id!==stepId));
  };

  const CONDITION_OPTS = [
    {value:'goal_not_met',label:'Send if goal not yet met'},
    {value:'always',label:'Always send'},
    {value:'email_opened',label:'Send if previous email was opened'},
    {value:'email_not_opened',label:'Send if previous email was NOT opened'},
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.surface,borderRadius:16,width:"min(760px,96vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.2)"}}>
        <div style={{padding:"16px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{fontSize:16,fontWeight:700,color:C.text1}}>{isNew?"New Sequence":"Edit Sequence"}</div>
          <div style={{display:"flex",gap:8}}>
            <Btn v="secondary" icon="x" onClick={onClose}>Cancel</Btn>
            <Btn icon="check" disabled={saving} onClick={save}>{saving?"Saving…":"Save"}</Btn>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          <Inp label="Sequence Name" value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Welcome Onboarding"/>
          <Inp label="Description" value={form.description} onChange={v=>set('description',v)} placeholder="Optional description"/>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Sel label="Trigger (when to enrol)" value={form.trigger} onChange={v=>set('trigger',v)}
              options={milestones.map(m=>({value:m.id,label:m.label}))}/>
            <Sel label="Goal (stops the sequence when met)" value={form.goal} onChange={v=>set('goal',v)}
              options={goals.map(g=>({value:g.id,label:g.label}))}/>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,padding:"12px 16px",background:form.active?C.greenL:C.bg,borderRadius:10,border:`1px solid ${form.active?C.green+"40":C.border}`}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:600,color:form.active?C.green:C.text3}}>
              <input type="checkbox" checked={!!form.active} onChange={e=>set('active',e.target.checked)} style={{width:16,height:16,accentColor:C.green}}/>
              {form.active?"Active — will enrol clients automatically":"Inactive — enrolments paused"}
            </label>
          </div>

          {/* Steps */}
          {!isNew && (
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text2}}>Email Steps ({steps.length})</div>
                <Btn icon="plus" s="sm" onClick={()=>setShowAddStep(true)}>Add Step</Btn>
              </div>

              {steps.length === 0 && (
                <div style={{textAlign:"center",padding:"32px 0",color:C.text3,fontSize:13,background:C.bg,borderRadius:10,border:`1px dashed ${C.border}`}}>
                  No steps yet — add an email step above
                </div>
              )}

              {steps.map((step,i)=>{
                const tmpl = templates.find(t=>t.id===step.template_id);
                const cond = CONDITION_OPTS.find(o=>o.value===step.condition);
                return (
                  <div key={step.id} style={{display:"flex",gap:12,marginBottom:10,alignItems:"flex-start"}}>
                    {/* Step number */}
                    <div style={{width:28,height:28,borderRadius:"50%",background:C.accent,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0,marginTop:12}}>
                      {i+1}
                    </div>
                    <div style={{flex:1,padding:"12px 16px",background:C.bg,borderRadius:10,border:`1px solid ${C.border}`}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{tmpl?.name||"Unknown template"}</div>
                        <button onClick={()=>removeStep(step.id,sequence.id)} style={{border:"none",background:"none",cursor:"pointer",color:C.text3}}>
                          <Ic n="trash" s={13}/>
                        </button>
                      </div>
                      <div style={{marginTop:4,display:"flex",flexWrap:"wrap",gap:8}}>
                        <Badge color={C.text3}>{step.delay_days>0?`${step.delay_days}d `:""}{ step.delay_hours>0?`${step.delay_hours}h `:""}{ (step.delay_days||0)+(step.delay_hours||0)===0?"Immediately":"delay"}</Badge>
                        <Badge color={C.accent}>{cond?.label||step.condition}</Badge>
                        {tmpl?.subject && <span style={{fontSize:11,color:C.text3}}>Subject: {tmpl.subject.slice(0,40)}{tmpl.subject.length>40?"…":""}</span>}
                      </div>
                    </div>
                    {/* Arrow to next */}
                    {i<steps.length-1 && <div style={{display:"flex",alignItems:"center",height:28,marginTop:12,color:C.text3}}><Ic n="arrow" s={14}/></div>}
                  </div>
                );
              })}

              {showAddStep && (
                <div style={{marginTop:12,padding:"16px",background:C.accentL,borderRadius:12,border:`1.5px solid ${C.accent}40`}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:12}}>Add Email Step</div>
                  <Sel label="Template" value={newStep.template_id} onChange={v=>setNewStep(s=>({...s,template_id:v}))}
                    options={[{value:'',label:'Select a template…'},...templates.map(t=>({value:t.id,label:t.name}))]}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <Inp label="Delay (days)" type="number" value={newStep.delay_days} onChange={v=>setNewStep(s=>({...s,delay_days:Number(v)}))}/>
                    <Inp label="Delay (hours)" type="number" value={newStep.delay_hours} onChange={v=>setNewStep(s=>({...s,delay_hours:Number(v)}))}/>
                  </div>
                  <Sel label="Condition" value={newStep.condition} onChange={v=>setNewStep(s=>({...s,condition:v}))} options={CONDITION_OPTS}/>
                  <div style={{display:"flex",gap:8,marginTop:4}}>
                    <Btn onClick={addStep} disabled={!newStep.template_id}>Add Step</Btn>
                    <Btn v="secondary" onClick={()=>setShowAddStep(false)}>Cancel</Btn>
                  </div>
                </div>
              )}
            </div>
          )}
          {isNew && <div style={{padding:"12px 16px",background:C.amberL,borderRadius:8,fontSize:12,color:C.amber,marginTop:8}}>Save the sequence first, then you can add email steps.</div>}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function EmailSequencer() {
  const [tab, setTab] = useState('sequences'); // sequences | templates | activity
  const [templates, setTemplates] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [sendLog, setSendLog] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState(null); // null=closed, {}=new, {id,...}=edit
  const [editSequence, setEditSequence] = useState(null);
  const [statsFor, setStatsFor] = useState(null);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [tmpl,seqs,log,meta] = await Promise.all([
      API('/templates'), API('/sequences'), API('/send-log'), API('/milestones'),
    ]);
    setTemplates(Array.isArray(tmpl)?tmpl:[]);
    setSequences(Array.isArray(seqs)?seqs:[]);
    setSendLog(Array.isArray(log)?log:[]);
    setMilestones(meta.milestones||[]);
    setGoals(meta.goals||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const loadStats = async (seqId) => {
    setStatsFor(seqId);
    const s = await API(`/sequences/${seqId}/stats`);
    setStats(s);
  };

  const deleteTemplate = async (id) => {
    if(!window.confirm('Delete this template?')) return;
    await API(`/templates/${id}`,{method:'DELETE'});
    setTemplates(t=>t.filter(x=>x.id!==id));
  };

  const deleteSequence = async (id) => {
    if(!window.confirm('Delete this sequence? Active enrolments will not receive further emails.')) return;
    await API(`/sequences/${id}`,{method:'DELETE'});
    setSequences(s=>s.filter(x=>x.id!==id));
  };

  const toggleActive = async (seq) => {
    const result = await API(`/sequences/${seq.id}`,{method:'PATCH',body:JSON.stringify({active:!seq.active})});
    if(!result.error) setSequences(s=>s.map(x=>x.id===seq.id?{...x,active:!seq.active}:x));
  };

  const fmtDate = s => s ? new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:400,fontFamily:F,color:C.text3}}>Loading…</div>;

  return (
    <div style={{fontFamily:F,color:C.text1}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Email Sequencer</h2>
          <div style={{fontSize:13,color:C.text3,marginTop:3}}>Client onboarding &amp; marketing automation</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {tab==='templates' && <Btn icon="plus" onClick={()=>setEditTemplate({})}>New Template</Btn>}
          {tab==='sequences' && <Btn icon="plus" onClick={()=>setEditSequence({})}>New Sequence</Btn>}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        {[
          {label:"Templates",value:templates.length,icon:"mail",color:C.accent},
          {label:"Sequences",value:sequences.length,icon:"list",color:"#0891b2"},
          {label:"Emails Sent",value:sendLog.length,icon:"send",color:C.green},
          {label:"Open Rate",value:sendLog.length?`${Math.round(sendLog.filter(l=>l.opened).length/sendLog.length*100)}%`:"—",icon:"eye",color:C.amber},
        ].map(card=>(
          <div key={card.label} style={{background:C.surface,borderRadius:12,padding:"16px 18px",border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:9,background:card.color+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Ic n={card.icon} s={15} c={card.color}/>
              </div>
              <span style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".05em"}}>{card.label}</span>
            </div>
            <div style={{fontSize:26,fontWeight:800,color:card.color}}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,marginBottom:20}}>
        {[{id:'sequences',label:'Sequences'},{id:'templates',label:'Email Templates'},{id:'activity',label:'Send Activity'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 18px",border:"none",background:"transparent",fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?C.accent:C.text3,borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",cursor:"pointer",fontFamily:F,marginBottom:-1}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SEQUENCES ── */}
      {tab==='sequences' && (
        <div>
          {sequences.length===0 && (
            <div style={{textAlign:"center",padding:"60px 0",color:C.text3}}>
              <div style={{marginBottom:16}}><Ic n="zap" s={36} c={C.border}/></div>
              <div style={{fontSize:15,fontWeight:700,color:C.text2,marginBottom:8}}>No sequences yet</div>
              <div style={{fontSize:13,marginBottom:20}}>Create a sequence to start automatically onboarding clients</div>
              <Btn icon="plus" onClick={()=>setEditSequence({})}>Create first sequence</Btn>
            </div>
          )}
          {sequences.map(seq=>(
            <div key={seq.id} style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:"16px 20px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{seq.name}</span>
                    <Badge color={seq.active?C.green:C.text3}>{seq.active?"Active":"Paused"}</Badge>
                    <Badge color={C.accent}>{seq.step_count||0} step{seq.step_count!==1?"s":""}</Badge>
                  </div>
                  {seq.description && <div style={{fontSize:12,color:C.text3,marginBottom:8}}>{seq.description}</div>}
                  <div style={{display:"flex",gap:12,fontSize:11,color:C.text3}}>
                    <span>Trigger: <strong style={{color:C.text2}}>{milestones.find(m=>m.id===seq.trigger)?.label||seq.trigger}</strong></span>
                    {seq.goal!=='none'&&<span>Goal: <strong style={{color:C.text2}}>{goals.find(g=>g.id===seq.goal)?.label||seq.goal}</strong></span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>loadStats(seq.id)} title="View stats" style={{border:"none",background:"none",cursor:"pointer",color:C.text3,padding:6}}><Ic n="chart" s={14}/></button>
                  <button onClick={()=>toggleActive(seq)} title={seq.active?"Pause":"Activate"} style={{border:"none",background:"none",cursor:"pointer",color:seq.active?C.amber:C.green,padding:6}}><Ic n={seq.active?"zap":"zap"} s={14}/></button>
                  <button onClick={()=>setEditSequence(seq)} title="Edit" style={{border:"none",background:"none",cursor:"pointer",color:C.accent,padding:6}}><Ic n="edit" s={14}/></button>
                  <button onClick={()=>deleteSequence(seq.id)} title="Delete" style={{border:"none",background:"none",cursor:"pointer",color:C.red,padding:6}}><Ic n="trash" s={14}/></button>
                </div>
              </div>

              {/* Stats inline if selected */}
              {statsFor===seq.id && stats && (
                <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:12}}>
                    {[{l:"Enrolled",v:stats.total_enrolled,c:C.accent},{l:"Active",v:stats.active,c:C.green},{l:"Completed",v:stats.completed,c:"#0891b2"},{l:"Goal met",v:stats.goal_met,c:C.green},{l:"Unsub'd",v:stats.unsubscribed,c:C.red},{l:"Sent",v:stats.total_sent,c:C.text2},{l:"Opened",v:stats.total_opened,c:C.amber}].map(s=>(
                      <div key={s.l} style={{textAlign:"center"}}>
                        <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:10,color:C.text3,fontWeight:600}}>{s.l}</div>
                      </div>
                    ))}
                    <button onClick={()=>setStatsFor(null)} style={{marginLeft:"auto",border:"none",background:"none",cursor:"pointer",color:C.text3,alignSelf:"flex-start"}}><Ic n="x" s={13}/></button>
                  </div>
                  {stats.step_stats?.map((s,i)=>(
                    <div key={s.step_id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,fontSize:12}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:C.accent,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>{i+1}</div>
                      <div style={{flex:1,height:6,borderRadius:99,background:"#f3f4f6",overflow:"hidden"}}>
                        <div style={{height:"100%",background:C.green,width:`${s.open_rate}%`}}/>
                      </div>
                      <span style={{color:C.text3,minWidth:80}}>{s.sent} sent · {s.open_rate}% open</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TEMPLATES ── */}
      {tab==='templates' && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
          {templates.length===0 && (
            <div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 0",color:C.text3}}>
              <div style={{marginBottom:16}}><Ic n="mail" s={36} c={C.border}/></div>
              <div style={{fontSize:15,fontWeight:700,color:C.text2,marginBottom:8}}>No templates yet</div>
              <Btn icon="plus" onClick={()=>setEditTemplate({})}>Create first template</Btn>
            </div>
          )}
          {templates.map(t=>(
            <div key={t.id} style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:"16px 18px"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                <div style={{width:36,height:36,borderRadius:9,background:C.accentL,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Ic n="mail" s={16} c={C.accent}/>
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setEditTemplate(t)} style={{border:"none",background:"none",cursor:"pointer",color:C.accent,padding:4}}><Ic n="edit" s={13}/></button>
                  <button onClick={()=>deleteTemplate(t.id)} style={{border:"none",background:"none",cursor:"pointer",color:C.red,padding:4}}><Ic n="trash" s={13}/></button>
                </div>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:C.text1,marginBottom:4}}>{t.name}</div>
              <div style={{fontSize:12,color:C.text3,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.subject}</div>
              <div style={{fontSize:11,color:C.text3}}>From: {t.from_name}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── ACTIVITY ── */}
      {tab==='activity' && (
        <div>
          {sendLog.length===0 && <div style={{textAlign:"center",padding:"60px 0",color:C.text3,fontSize:13}}>No emails sent yet</div>}
          <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            {sendLog.slice(0,50).map((log,i)=>(
              <div key={log.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderBottom:i<sendLog.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:log.opened?C.green:log.clicked?C.amber:C.text3,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{log.subject}</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}>To: {log.to_email} · {fmtDate(log.sent_at)}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {log.opened && <Badge color={C.green}>Opened</Badge>}
                  {log.clicked && <Badge color={C.amber}>Clicked</Badge>}
                  {!log.opened && !log.clicked && <Badge color={C.text3}>Sent</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {editTemplate !== null && (
        <TemplateEditor
          template={editTemplate?.id ? editTemplate : null}
          onSave={t=>{ setTemplates(prev=>editTemplate?.id ? prev.map(x=>x.id===t.id?t:x) : [...prev,t]); setEditTemplate(null); }}
          onClose={()=>setEditTemplate(null)}
        />
      )}
      {editSequence !== null && (
        <SequenceBuilder
          sequence={editSequence?.id ? editSequence : null}
          templates={templates}
          milestones={milestones}
          goals={goals}
          onSave={s=>{ setSequences(prev=>editSequence?.id ? prev.map(x=>x.id===s.id?{...x,...s}:x) : [...prev,s]); setEditSequence(null); load(); }}
          onClose={()=>setEditSequence(null)}
        />
      )}
    </div>
  );
}
