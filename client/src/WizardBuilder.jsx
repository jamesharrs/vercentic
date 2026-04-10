// WizardBuilder.jsx — admin UI for building configurable portal wizards
// Embedded in the Portal Settings drawer as a "Wizard" tab
import { useState, useCallback } from 'react';

const F = "'Plus Jakarta Sans',-apple-system,sans-serif";
const C = {
  accent:'#4361EE', accentLight:'#EEF1FF', surface:'#fff', surface2:'#f8f9fc',
  border:'#E8ECF8', text1:'#111827', text2:'#4B5675', text3:'#9DA8C7',
  green:'#0CAF77', amber:'#F59F00', red:'#EF4444',
};

const uid = () => Math.random().toString(36).slice(2,10);

// ── Block palette definitions ──────────────────────────────────────────────────
export const BLOCK_TYPES = [
  { type:'entry_method',       icon:'🚪', label:'Entry Method',       desc:'CV upload, manual entry, LinkedIn or returning applicant' },
  { type:'profile_fields',     icon:'👤', label:'Profile Fields',     desc:'Configurable person fields (name, email, phone, location…)' },
  { type:'file_upload',        icon:'📎', label:'File Upload',        desc:'Upload any document — CV, right to work, portfolio' },
  { type:'screening_questions',icon:'❓', label:'Screening Questions',desc:'Pre-screen questions from the question bank with knockout support' },
  { type:'equal_opps',         icon:'⚖️', label:'Equal Opportunities',desc:'Anonymous EO monitoring form (auto-detects region)' },
  { type:'consent',            icon:'✅', label:'Consent / GDPR',     desc:'Data processing consent checkbox' },
  { type:'info_block',         icon:'ℹ️', label:'Info Block',         desc:'Instructions or rich text shown to the applicant' },
  { type:'review_summary',     icon:'📋', label:'Review Summary',     desc:'Read-only summary of all collected data before submission' },
  { type:'job_fields',         icon:'💼', label:'Job Fields',         desc:'Job creation fields for HM portal requisition wizard' },
];

// ── Default wizard configs per type ───────────────────────────────────────────
export const DEFAULT_WIZARDS = {
  candidate_apply: {
    type:'candidate_apply', target_object:'people', link_to_job:true,
    show_progress:true, allow_save_draft:true,
    pages:[
      { id:uid(), title:'Let\'s get started',     subtitle:'How would you like to apply?',    blocks:[{id:uid(),type:'entry_method',config:{allow_cv:true,allow_manual:true,allow_linkedin:true,allow_returning:true}}], navigation:{next:null} },
      { id:uid(), title:'Your details',            subtitle:'Tell us about yourself.',          blocks:[{id:uid(),type:'profile_fields',config:{fields:['first_name','last_name','email','phone','location','current_title','cover_letter']}},{id:uid(),type:'file_upload',config:{label:'Upload your CV',field_key:'cv',parse_cv:true,required:false}}], navigation:{next:null} },
      { id:uid(), title:'A few quick questions',   subtitle:'',                                  blocks:[{id:uid(),type:'screening_questions',config:{}}], navigation:{next:null,knockout_exit:true} },
      { id:uid(), title:'Equal opportunities',     subtitle:'', optional_skip:true,              blocks:[{id:uid(),type:'equal_opps',config:{region:'auto'}}], navigation:{next:null} },
      { id:uid(), title:'Review & submit',         subtitle:'Check everything before submitting.',blocks:[{id:uid(),type:'review_summary',config:{}},{id:uid(),type:'consent',config:{required:true}}], navigation:{submit:true} },
    ],
    rejection_page:{ title:'Thank you for your interest', message:"Based on your answers, we're unable to progress your application for this role at this time. We encourage you to check back for future opportunities." },
    success_page:{ title:'Application Submitted!', message:'Thank you {first_name} — your application for {job_title} is on its way.' },
  },
  hm_create_job: {
    type:'hm_create_job', target_object:'jobs', link_to_job:false,
    show_progress:true, allow_save_draft:false,
    pages:[
      { id:uid(), title:'New Requisition',  subtitle:'Tell us about the role.',  blocks:[{id:uid(),type:'job_fields',config:{fields:['job_title','department','location','work_type','employment_type','priority']}}], navigation:{next:null} },
      { id:uid(), title:'Role description', subtitle:'',                          blocks:[{id:uid(),type:'job_fields',config:{fields:['description','required_skills']}},{id:uid(),type:'info_block',config:{icon:'💡',heading:'Tip',content:'Add the key skills required for this role, separated by commas.'}}], navigation:{next:null} },
      { id:uid(), title:'Review & submit',  subtitle:'',                          blocks:[{id:uid(),type:'review_summary',config:{}}], navigation:{submit:true} },
    ],
    success_page:{ title:'Requisition Created', message:'Your requisition for {job_title} has been created and is now pending review.' },
  },
};

// ── Small UI primitives ────────────────────────────────────────────────────────
const Chip = ({children,color=C.accent}) => (
  <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:`${color}18`,color,display:'inline-block'}}>{children}</span>
);
const SmBtn = ({onClick,children,variant='outline',icon,disabled}) => (
  <button onClick={onClick} disabled={disabled} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:7,border:`1.5px solid ${variant==='primary'?C.accent:C.border}`,
    background:variant==='primary'?C.accent:variant==='danger'?'#FEE2E2':'transparent',
    color:variant==='primary'?'white':variant==='danger'?C.red:C.text2,
    fontSize:11,fontWeight:600,cursor:disabled?'not-allowed':'pointer',fontFamily:F,opacity:disabled?0.5:1}}>
    {icon&&<span>{icon}</span>}{children}
  </button>
);
const Inp = ({label,value,onChange,placeholder,type='text',rows}) => (
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:C.text3}}>{label}</label>}
    {rows
      ? <textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
          style={{padding:'7px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,outline:'none',resize:'vertical',width:'100%',boxSizing:'border-box'}}/>
      : <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{padding:'7px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,outline:'none',width:'100%',boxSizing:'border-box'}}/>
    }
  </div>
);
const Sel = ({label,value,onChange,options}) => (
  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:C.text3}}>{label}</label>}
    <select value={value||''} onChange={e=>onChange(e.target.value)}
      style={{padding:'7px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F,outline:'none',background:'white',width:'100%'}}>
      {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
    </select>
  </div>
);

const Toggle = ({label,checked,onChange,hint}) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0'}}>
    <div>
      <div style={{fontSize:12,fontWeight:600,color:C.text1}}>{label}</div>
      {hint&&<div style={{fontSize:11,color:C.text3}}>{hint}</div>}
    </div>
    <div onClick={()=>onChange(!checked)}
      style={{width:36,height:20,borderRadius:10,background:checked?C.accent:C.border,cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0}}>
      <div style={{position:'absolute',top:2,left:checked?18:2,width:16,height:16,borderRadius:'50%',background:'white',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
    </div>
  </div>
);

// ── Block config panel — shown when a block is selected ───────────────────────
const PROFILE_FIELD_OPTIONS = [
  {value:'first_name',label:'First name'},{value:'last_name',label:'Last name'},
  {value:'email',label:'Email'},{value:'phone',label:'Phone'},
  {value:'location',label:'Location'},{value:'current_title',label:'Current title'},
  {value:'linkedin_url',label:'LinkedIn URL'},{value:'cover_letter',label:'Cover letter'},
  {value:'years_experience',label:'Years of experience'},{value:'salary_expectation',label:'Salary expectation'},
];
const JOB_FIELD_OPTIONS = [
  {value:'job_title',label:'Job title'},{value:'department',label:'Department'},
  {value:'location',label:'Location'},{value:'work_type',label:'Work type'},
  {value:'employment_type',label:'Employment type'},{value:'salary_min',label:'Salary min'},
  {value:'salary_max',label:'Salary max'},{value:'description',label:'Description'},
  {value:'required_skills',label:'Required skills'},{value:'priority',label:'Priority'},
];

const BlockConfig = ({ block, onUpdate, onRemove }) => {
  const cfg = block.config || {};
  const set = (k,v) => onUpdate({ ...block, config:{ ...cfg, [k]:v } });
  const setField = (k,v) => onUpdate({ ...block, [k]:v });

  return (
    <div style={{background:C.accentLight,borderRadius:10,border:`1.5px solid ${C.accent}30`,padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:16}}>{BLOCK_TYPES.find(b=>b.type===block.type)?.icon||'🔧'}</span>
          <span style={{fontSize:12,fontWeight:700,color:C.text1}}>{BLOCK_TYPES.find(b=>b.type===block.type)?.label||block.type}</span>
        </div>
        <SmBtn onClick={onRemove} variant='danger' icon='✕'>Remove</SmBtn>
      </div>

      {/* Type-specific config */}
      {block.type==='entry_method'&&(
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {[{k:'allow_cv',l:'Allow CV upload'},{k:'allow_manual',l:'Manual entry'},{k:'allow_linkedin',l:'LinkedIn URL'},{k:'allow_returning',l:'Returning applicant'}].map(({k,l})=>(
            <Toggle key={k} label={l} checked={cfg[k]!==false} onChange={v=>set(k,v)}/>
          ))}
        </div>
      )}
      {(block.type==='profile_fields'||block.type==='job_fields')&&(
        <div>
          <div style={{fontSize:11,fontWeight:600,color:C.text3,marginBottom:6}}>Fields to show</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {(block.type==='profile_fields'?PROFILE_FIELD_OPTIONS:JOB_FIELD_OPTIONS).map(f=>{
              const selected = (cfg.fields||[]).includes(f.value);
              return (
                <button key={f.value} onClick={()=>{ const cur=cfg.fields||[]; set('fields',selected?cur.filter(x=>x!==f.value):[...cur,f.value]); }}
                  style={{padding:'3px 8px',borderRadius:99,fontSize:10,fontWeight:600,border:`1px solid ${selected?C.accent:C.border}`,background:selected?C.accentLight:'white',color:selected?C.accent:C.text3,cursor:'pointer'}}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {block.type==='file_upload'&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <Inp label="Button label" value={cfg.label} onChange={v=>set('label',v)} placeholder="Upload your CV"/>
          <Toggle label="Parse CV with AI" checked={!!cfg.parse_cv} onChange={v=>set('parse_cv',v)} hint="Auto-fill fields from the uploaded document"/>
          <Toggle label="Required" checked={!!cfg.required} onChange={v=>set('required',v)}/>
        </div>
      )}
      {block.type==='equal_opps'&&(
        <Sel label="Region" value={cfg.region||'auto'} onChange={v=>set('region',v)}
          options={[{value:'auto',label:'Auto-detect from job location'},{value:'uk',label:'United Kingdom'},{value:'us',label:'United States'},{value:'uae',label:'UAE / Middle East'},{value:'generic',label:'Generic / International'}]}/>
      )}
      {block.type==='consent'&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <Inp label="Consent text (leave blank for default)" value={cfg.text} onChange={v=>set('text',v)} rows={3} placeholder="I consent to…"/>
          <Toggle label="Required" checked={cfg.required!==false} onChange={v=>set('required',v)}/>
        </div>
      )}
      {block.type==='info_block'&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <Inp label="Heading" value={cfg.heading} onChange={v=>set('heading',v)} placeholder="Important information"/>
          <Inp label="Content" value={cfg.content} onChange={v=>set('content',v)} rows={3} placeholder="Instructions or information…"/>
          <Inp label="Icon (emoji)" value={cfg.icon} onChange={v=>set('icon',v)} placeholder="💡"/>
        </div>
      )}
    </div>
  );
};

// ── Page editor panel ──────────────────────────────────────────────────────────
const PageEditor = ({ page, allPages, onUpdate, onDelete, isOnly }) => {
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(null);
  const [showPalette, setShowPalette] = useState(false);

  const updateBlock = (idx, updated) => {
    const blocks = [...(page.blocks||[])]; blocks[idx]=updated;
    onUpdate({ ...page, blocks });
  };
  const removeBlock = (idx) => {
    onUpdate({ ...page, blocks:(page.blocks||[]).filter((_,i)=>i!==idx) });
    setSelectedBlockIdx(null);
  };
  const addBlock = (type) => {
    const newBlock = { id:uid(), type, config:{} };
    // Default configs
    if (type==='profile_fields') newBlock.config = { fields:['first_name','last_name','email','phone'] };
    if (type==='equal_opps')     newBlock.config = { region:'auto' };
    if (type==='consent')        newBlock.config = { required:true };
    if (type==='entry_method')   newBlock.config = { allow_cv:true, allow_manual:true, allow_linkedin:true, allow_returning:true };
    if (type==='job_fields')     newBlock.config = { fields:['job_title','department','location','work_type'] };
    onUpdate({ ...page, blocks:[...(page.blocks||[]),newBlock] });
    setSelectedBlockIdx((page.blocks||[]).length);
    setShowPalette(false);
  };
  const moveBlock = (idx,dir) => {
    const blocks=[...(page.blocks||[])];
    const to=idx+dir; if(to<0||to>=blocks.length) return;
    [blocks[idx],blocks[to]]=[blocks[to],blocks[idx]];
    onUpdate({...page,blocks});
    setSelectedBlockIdx(to);
  };

  return (
    <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:12}}>
      {/* Page header */}
      <div style={{display:'flex',alignItems:'flex-start',gap:8,padding:'10px 12px',background:C.surface,borderRadius:10,border:`1px solid ${C.border}`}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
          <Inp label="Page title" value={page.title} onChange={v=>onUpdate({...page,title:v})} placeholder="Step title…"/>
          <Inp label="Subtitle (optional)" value={page.subtitle} onChange={v=>onUpdate({...page,subtitle:v})} placeholder="Supporting text…"/>
        </div>
        {!isOnly&&<button onClick={onDelete} style={{padding:'5px 8px',marginTop:16,borderRadius:6,border:'none',background:'#FEE2E2',color:C.red,fontSize:11,fontWeight:700,cursor:'pointer'}}>✕</button>}
      </div>

      {/* Block list */}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {(page.blocks||[]).length===0&&<div style={{textAlign:'center',padding:'20px 0',color:C.text3,fontSize:13}}>No blocks yet. Add one below.</div>}
        {(page.blocks||[]).map((block,i)=>(
          <div key={block.id}>
            {selectedBlockIdx===i ? (
              <BlockConfig block={block} onUpdate={b=>updateBlock(i,b)} onRemove={()=>removeBlock(i)}/>
            ) : (
              <div onClick={()=>setSelectedBlockIdx(i)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:C.surface,borderRadius:10,border:`1.5px solid ${C.border}`,cursor:'pointer',transition:'all .1s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <span style={{fontSize:18,flexShrink:0}}>{BLOCK_TYPES.find(b=>b.type===block.type)?.icon||'🔧'}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{BLOCK_TYPES.find(b=>b.type===block.type)?.label||block.type}</div>
                  <div style={{fontSize:10,color:C.text3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{BLOCK_TYPES.find(b=>b.type===block.type)?.desc||''}</div>
                </div>
                <div style={{display:'flex',gap:3,flexShrink:0}}>
                  <button onClick={e=>{e.stopPropagation();moveBlock(i,-1);}} disabled={i===0} style={{padding:'2px 5px',border:'none',background:'transparent',cursor:i===0?'not-allowed':'pointer',color:C.text3,fontSize:11}}>▲</button>
                  <button onClick={e=>{e.stopPropagation();moveBlock(i,1);}} disabled={i===(page.blocks||[]).length-1} style={{padding:'2px 5px',border:'none',background:'transparent',cursor:i===(page.blocks||[]).length-1?'not-allowed':'pointer',color:C.text3,fontSize:11}}>▼</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add block */}
      <div style={{position:'relative'}}>
        <SmBtn onClick={()=>setShowPalette(p=>!p)} icon='＋' variant='outline'>Add block</SmBtn>
        {showPalette&&(
          <>
            <div onClick={()=>setShowPalette(false)} style={{position:'fixed',inset:0,zIndex:99}}/>
            <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:100,background:C.surface,borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,.15)',border:`1px solid ${C.border}`,padding:6,minWidth:260}}>
              {BLOCK_TYPES.map(bt=>(
                <button key={bt.type} onClick={()=>addBlock(bt.type)}
                  style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',textAlign:'left',fontFamily:F}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.surface2}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span style={{fontSize:18,flexShrink:0}}>{bt.icon}</span>
                  <div><div style={{fontSize:12,fontWeight:700,color:C.text1}}>{bt.label}</div><div style={{fontSize:10,color:C.text3}}>{bt.desc}</div></div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main WizardBuilder export ─────────────────────────────────────────────────
export default function WizardBuilder({ portal, onChange }) {
  const wizard = portal.wizard || { enabled:false, pages:[] };
  const setWizard = (w) => onChange({ ...portal, wizard:w });
  const setW = (k,v) => setWizard({ ...wizard, [k]:v });

  const [selectedPageIdx, setSelectedPageIdx] = useState(0);

  const pages = wizard.pages || [];
  const currentPage = pages[selectedPageIdx] || pages[0];

  const addPage = () => {
    const newPage = { id:uid(), title:`Step ${pages.length+1}`, subtitle:'', blocks:[], navigation:{} };
    const newPages = [...pages, newPage];
    setWizard({ ...wizard, pages:newPages });
    setSelectedPageIdx(newPages.length-1);
  };
  const updatePage = (idx, updated) => {
    const newPages = pages.map((p,i)=>i===idx?updated:p);
    setWizard({ ...wizard, pages:newPages });
  };
  const deletePage = (idx) => {
    const newPages = pages.filter((_,i)=>i!==idx);
    setWizard({ ...wizard, pages:newPages });
    setSelectedPageIdx(Math.max(0,idx-1));
  };
  const movePage = (idx,dir) => {
    const np=[...pages]; const to=idx+dir; if(to<0||to>=np.length) return;
    [np[idx],np[to]]=[np[to],np[idx]];
    setWizard({...wizard,pages:np}); setSelectedPageIdx(to);
  };

  const applyTemplate = (key) => {
    const tmpl = DEFAULT_WIZARDS[key];
    if (!tmpl) return;
    // Re-generate IDs so pages/blocks are unique
    const fresh = JSON.parse(JSON.stringify(tmpl));
    fresh.pages = fresh.pages.map(p=>({...p,id:uid(),blocks:(p.blocks||[]).map(b=>({...b,id:uid()}))}));
    setWizard({ ...wizard, ...fresh, enabled:true });
    setSelectedPageIdx(0);
  };

  if (!wizard.enabled) {
    return (
      <div style={{padding:'20px 0',display:'flex',flexDirection:'column',gap:16}}>
        <div style={{padding:'16px 18px',background:C.surface2,borderRadius:12,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:4}}>Wizard not enabled</div>
          <div style={{fontSize:12,color:C.text2,lineHeight:1.6,marginBottom:14}}>
            A wizard guides users through a multi-step form — for job applications, HM requisitions, or any custom flow.
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>Start from a template</div>
            {[
              {key:'candidate_apply', icon:'📝', label:'Candidate Application', desc:'5-step wizard: entry method, details, screening, EO monitoring, review'},
              {key:'hm_create_job',   icon:'💼', label:'HM Requisition',        desc:'3-step job creation: role details, description, review'},
            ].map(t=>(
              <button key={t.key} onClick={()=>applyTemplate(t.key)}
                style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:C.surface,borderRadius:10,border:`1.5px solid ${C.border}`,cursor:'pointer',textAlign:'left',fontFamily:F,width:'100%'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <span style={{fontSize:24,flexShrink:0}}>{t.icon}</span>
                <div><div style={{fontSize:13,fontWeight:700,color:C.text1}}>{t.label}</div><div style={{fontSize:11,color:C.text3}}>{t.desc}</div></div>
              </button>
            ))}
            <button onClick={()=>{ setWizard({...wizard,enabled:true,pages:[{id:uid(),title:'Step 1',subtitle:'',blocks:[],navigation:{}}]}); setSelectedPageIdx(0); }}
              style={{padding:'8px 14px',borderRadius:8,border:`1.5px dashed ${C.border}`,background:'transparent',color:C.text3,fontSize:12,cursor:'pointer',fontFamily:F,textAlign:'left'}}>
              + Start from scratch
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14,paddingBottom:12}}>
      {/* Top controls */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <Toggle label="Wizard enabled" checked={!!wizard.enabled} onChange={v=>setW('enabled',v)}/>
        </div>
        <SmBtn onClick={()=>setW('enabled',false)} variant='danger' icon='🗑'>Disable wizard</SmBtn>
      </div>

      {/* Global settings */}
      <div style={{padding:'10px 12px',background:C.surface2,borderRadius:10,border:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:8}}>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>Global settings</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <Sel label="Wizard type" value={wizard.type||'candidate_apply'} onChange={v=>setW('type',v)}
            options={[{value:'candidate_apply',label:'Candidate application'},{value:'hm_create_job',label:'HM job creation'},{value:'custom',label:'Custom'}]}/>
          <Sel label="Target object" value={wizard.target_object||'people'} onChange={v=>setW('target_object',v)}
            options={[{value:'people',label:'People'},{value:'jobs',label:'Jobs'},{value:'talent_pools',label:'Talent Pools'}]}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <Toggle label="Show progress bar" checked={wizard.show_progress!==false} onChange={v=>setW('show_progress',v)} hint="Show step indicators at the top of each page"/>
          <Toggle label="Allow save & continue later" checked={wizard.allow_save_draft!==false} onChange={v=>setW('allow_save_draft',v)} hint="Sends a resume link to the applicant's email"/>
        </div>
      </div>

      {/* Page list + page editor */}
      <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
        {/* Pages sidebar */}
        <div style={{width:140,flexShrink:0,display:'flex',flexDirection:'column',gap:4}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>Pages</div>
          {pages.map((p,i)=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:4}}>
              <button onClick={()=>setSelectedPageIdx(i)}
                style={{flex:1,padding:'7px 9px',borderRadius:8,border:`1.5px solid ${selectedPageIdx===i?C.accent:C.border}`,
                  background:selectedPageIdx===i?C.accentLight:'white',color:selectedPageIdx===i?C.accent:C.text2,
                  fontSize:11,fontWeight:selectedPageIdx===i?700:400,cursor:'pointer',textAlign:'left',fontFamily:F,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {i+1}. {p.title||`Step ${i+1}`}
              </button>
              <div style={{display:'flex',flexDirection:'column',gap:1}}>
                <button onClick={()=>movePage(i,-1)} disabled={i===0} style={{padding:'1px 3px',border:'none',background:'transparent',cursor:i===0?'not-allowed':'pointer',color:C.text3,fontSize:9}}>▲</button>
                <button onClick={()=>movePage(i,1)} disabled={i===pages.length-1} style={{padding:'1px 3px',border:'none',background:'transparent',cursor:i===pages.length-1?'not-allowed':'pointer',color:C.text3,fontSize:9}}>▼</button>
              </div>
            </div>
          ))}
          <button onClick={addPage}
            style={{padding:'6px 9px',borderRadius:8,border:`1.5px dashed ${C.border}`,background:'transparent',color:C.text3,fontSize:11,cursor:'pointer',fontFamily:F,textAlign:'left',marginTop:4}}>
            + Add page
          </button>
        </div>

        {/* Active page editor */}
        {currentPage&&(
          <PageEditor page={currentPage} allPages={pages}
            onUpdate={p=>updatePage(selectedPageIdx,p)}
            onDelete={()=>deletePage(selectedPageIdx)}
            isOnly={pages.length<=1}/>
        )}
      </div>

      {/* Success / rejection messages */}
      <div style={{padding:'10px 12px',background:C.surface2,borderRadius:10,border:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:10}}>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>Completion messages</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontSize:11,fontWeight:600,color:C.green}}>✓ Success page</div>
            <Inp label="Heading" value={wizard.success_page?.title} onChange={v=>setW('success_page',{...wizard.success_page,title:v})} placeholder="Submitted!"/>
            <Inp label="Message (use {first_name}, {job_title})" value={wizard.success_page?.message} onChange={v=>setW('success_page',{...wizard.success_page,message:v})} rows={2} placeholder="Thank you {first_name}…"/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontSize:11,fontWeight:600,color:C.amber}}>⚠ Rejection page (knockout)</div>
            <Inp label="Heading" value={wizard.rejection_page?.title} onChange={v=>setW('rejection_page',{...wizard.rejection_page,title:v})} placeholder="Thank you for your interest"/>
            <Inp label="Message" value={wizard.rejection_page?.message} onChange={v=>setW('rejection_page',{...wizard.rejection_page,message:v})} rows={2} placeholder="Based on your answers…"/>
          </div>
        </div>
      </div>
    </div>
  );
}
