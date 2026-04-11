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

// ── Lucide SVG icon component ─────────────────────────────────────────────────
const PATHS = {
  doorOpen:    "M13 2H3a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9zM13 2v7h7M9 12h.01",
  user:        "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  paperclip:   "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
  helpCircle:  "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01",
  scale:       "M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h2.5M18.5 7H21",
  checkSquare: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  info:        "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 8h.01M12 12v4",
  clipboard:   "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
  briefcase:   "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  settings:    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  zap:         "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  fileText:    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  arrowRight:  "M5 12h14M12 5l7 7-7 7",
  rocket:      "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
  layoutGrid:  "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  trash:       "M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  plus:        "M12 5v14M5 12h14",
  chevUp:      "M18 15l-6-6-6 6",
  chevDown:    "M6 9l6 6 6-6",
  x:           "M18 6L6 18M6 6l12 12",
  lock:        "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  save:        "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  check:       "M20 6L9 17l-5-5",
  partyPopper: "M5.8 11.3L2 22l10.7-3.79M4 3h.01M22 8h.01M15 2h.01M22 20h.01M2 8h.01M20 2l-7.5 7.5M15 9.5L9.5 15",
  thumbsDown:  "M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17",
  alertCircle: "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 8v4M12 16h.01",
};
const WzIc = ({n,s=14,c='currentColor'}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    {PATHS[n]&&<path d={PATHS[n]}/>}
  </svg>
);

// ── Block palette definitions ──────────────────────────────────────────────────
export const BLOCK_TYPES = [
  { type:'entry_method',       icon:'doorOpen',    label:'Entry Method',       desc:'CV upload, manual entry, LinkedIn or returning applicant' },
  { type:'profile_fields',     icon:'user',        label:'Profile Fields',     desc:'Configurable person fields (name, email, phone, location…)' },
  { type:'file_upload',        icon:'paperclip',   label:'File Upload',        desc:'Upload any document — CV, right to work, portfolio' },
  { type:'screening_questions',icon:'helpCircle',  label:'Screening Questions',desc:'Pre-screen questions from the question bank with knockout support' },
  { type:'equal_opps',         icon:'scale',       label:'Equal Opportunities',desc:'Anonymous EO monitoring form (auto-detects region)' },
  { type:'consent',            icon:'checkSquare', label:'Consent / GDPR',     desc:'Data processing consent checkbox' },
  { type:'info_block',         icon:'info',        label:'Info Block',         desc:'Instructions or rich text shown to the applicant' },
  { type:'review_summary',     icon:'clipboard',   label:'Review Summary',     desc:'Read-only summary of all collected data before submission' },
  { type:'job_fields',         icon:'briefcase',   label:'Job Fields',         desc:'Job creation fields for HM portal requisition wizard' },
];

// ── Default wizard configs per type ───────────────────────────────────────────
export const DEFAULT_WIZARDS = {
  candidate_apply: {
    type:'candidate_apply', target_object:'people', link_to_job:true,
    show_progress:true, allow_save_draft:true,
    trigger:{ mode:'job_apply', apply_label:'Apply for this role →', hero_label:'Register your interest →' },
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
    trigger:{ mode:'hm_dashboard', button_label:'New Requisition' },
    pages:[
      { id:uid(), title:'New Requisition',  subtitle:'Tell us about the role.',  blocks:[{id:uid(),type:'job_fields',config:{fields:['job_title','department','location','work_type','employment_type','priority']}}], navigation:{next:null} },
      { id:uid(), title:'Role description', subtitle:'',                          blocks:[{id:uid(),type:'job_fields',config:{fields:['description','required_skills']}},{id:uid(),type:'info_block',config:{heading:'Tip',content:'Add the key skills required for this role, separated by commas.'}}], navigation:{next:null} },
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
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',gap:16}}>
    <div>
      <div style={{fontSize:12,fontWeight:600,color:C.text1}}>{label}</div>
      {hint&&<div style={{fontSize:11,color:C.text3}}>{hint}</div>}
    </div>
    <div onClick={()=>onChange(!checked)}
      style={{width:36,height:20,borderRadius:10,background:checked?C.accent:C.border,cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0,marginLeft:8}}>
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
          <div style={{width:24,height:24,borderRadius:6,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <WzIc n={BLOCK_TYPES.find(b=>b.type===block.type)?.icon||'settings'} s={13} c={C.accent}/>
          </div>
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
                <div style={{width:28,height:28,borderRadius:7,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <WzIc n={BLOCK_TYPES.find(b=>b.type===block.type)?.icon||'settings'} s={14} c={C.accent}/>
                </div>
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
                  <div style={{width:28,height:28,borderRadius:7,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <WzIc n={bt.icon} s={14} c={C.accent}/>
                  </div>
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
              {key:'candidate_apply', icon:'fileText',   label:'Candidate Application', desc:'5-step wizard: entry method, details, screening, EO monitoring, review'},
              {key:'hm_create_job',   icon:'briefcase',  label:'HM Requisition',        desc:'3-step job creation: role details, description, review'},
            ].map(t=>(
              <button key={t.key} onClick={()=>applyTemplate(t.key)}
                style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:C.surface,borderRadius:10,border:`1.5px solid ${C.border}`,cursor:'pointer',textAlign:'left',fontFamily:F,width:'100%'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{width:36,height:36,borderRadius:10,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <WzIc n={t.icon} s={18} c={C.accent}/>
                </div>
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

  const [triggerOpen, setTriggerOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14,paddingBottom:12}}>
      {/* Top controls */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <Toggle label="Flows enabled" checked={!!wizard.enabled} onChange={v=>setW('enabled',v)}/>
        </div>
        <SmBtn onClick={()=>setW('enabled',false)} variant='danger' icon='✕'>Disable flow</SmBtn>
      </div>

      {/* ── Trigger configuration ── */}
      <div style={{borderRadius:10,border:'1.5px solid #FDE68A',overflow:'hidden'}}>
        <button onClick={()=>setTriggerOpen(o=>!o)}
          style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#FFFBEB',border:'none',cursor:'pointer',fontFamily:F}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <WzIc n="zap" s={14} c="#92400E"/>
            <span style={{fontSize:11,fontWeight:700,color:'#92400E',textTransform:'uppercase',letterSpacing:'0.05em'}}>How is this flow triggered?</span>
          </div>
          <WzIc n={triggerOpen?'chevUp':'chevDown'} s={13} c="#92400E"/>
        </button>
        {triggerOpen&&<div style={{padding:'12px 14px',background:'#FFFBEB',display:'flex',flexDirection:'column',gap:10,borderTop:'1px solid #FDE68A'}}>

        <Sel label="Trigger mode" value={wizard.trigger?.mode||'job_apply'} onChange={v=>setW('trigger',{...(wizard.trigger||{}),mode:v})}
          options={[
            {value:'job_apply',      label:'Apply button on each job listing (Career Site)'},
            {value:'hero_cta',       label:'CTA button on the portal hero section (Career Site)'},
            {value:'job_apply+hero', label:'Both — apply button AND hero CTA (Career Site)'},
            {value:'hm_dashboard',   label:'New Requisition button in HM portal dashboard'},
            {value:'standalone',     label:'Standalone — wizard is the whole portal page'},
          ]}/>

        {/* Trigger-specific explanation */}
        {(wizard.trigger?.mode||'job_apply')==='job_apply'&&(
          <div style={{background:'white',borderRadius:8,padding:'8px 10px',fontSize:12,color:'#6B7280',lineHeight:1.6}}>
            The <strong>"Apply for this role →"</strong> button on every job detail page will launch this wizard. The candidate must click a job first — the wizard runs in the context of that specific job.
          </div>
        )}
        {(wizard.trigger?.mode)==='hero_cta'&&(
          <div style={{background:'white',borderRadius:8,padding:'8px 10px',fontSize:12,color:'#6B7280',lineHeight:1.6}}>
            A CTA button appears in the career site hero section. Clicking it launches the wizard <strong>without a specific job</strong> — useful for expressions of interest or talent pool sign-ups.
          </div>
        )}
        {(wizard.trigger?.mode)==='job_apply+hero'&&(
          <div style={{background:'white',borderRadius:8,padding:'8px 10px',fontSize:12,color:'#6B7280',lineHeight:1.6}}>
            Two triggers: the <strong>Apply</strong> button on job listings (job-specific), and a <strong>general CTA</strong> in the hero section (no job). Use when you want both targeted applications and general interest.
          </div>
        )}
        {(wizard.trigger?.mode)==='hm_dashboard'&&(
          <div style={{background:'white',borderRadius:8,padding:'8px 10px',fontSize:12,color:'#6B7280',lineHeight:1.6}}>
            A <strong>"{wizard.trigger?.button_label||'New Requisition'}"</strong> button appears on the HM portal dashboard. Clicking it launches this wizard to collect job/requisition details.
          </div>
        )}
        {(wizard.trigger?.mode)==='standalone'&&(
          <div style={{background:'white',borderRadius:8,padding:'8px 10px',fontSize:12,color:'#6B7280',lineHeight:1.6}}>
            The wizard <strong>is the portal</strong> — anyone who visits the portal URL goes straight into the wizard. No job listing, no separate landing page.
          </div>
        )}

        {/* Button label config — shown for modes that have a configurable button */}
        {['job_apply','hero_cta','job_apply+hero','hm_dashboard'].includes(wizard.trigger?.mode||'job_apply')&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {['job_apply','job_apply+hero'].includes(wizard.trigger?.mode||'job_apply')&&(
              <Inp label="Apply button label" value={wizard.trigger?.apply_label||''} onChange={v=>setW('trigger',{...(wizard.trigger||{}),apply_label:v})} placeholder="Apply for this role →"/>
            )}
            {['hero_cta','job_apply+hero'].includes(wizard.trigger?.mode)&&(
              <Inp label="Hero CTA button label" value={wizard.trigger?.hero_label||''} onChange={v=>setW('trigger',{...(wizard.trigger||{}),hero_label:v})} placeholder="Register your interest →"/>
            )}
            {(wizard.trigger?.mode)==='hm_dashboard'&&(
              <Inp label="Dashboard button label" value={wizard.trigger?.button_label||''} onChange={v=>setW('trigger',{...(wizard.trigger||{}),button_label:v})} placeholder="New Requisition"/>
            )}
          </div>
        )}
        </div>}
      </div>

      {/* ── Global settings ── */}
      <div style={{borderRadius:10,border:`1px solid ${C.border}`,overflow:'hidden'}}>
        <button onClick={()=>setSettingsOpen(o=>!o)}
          style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:C.surface2,border:'none',cursor:'pointer',fontFamily:F}}>
          <span style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em'}}>Global settings</span>
          <WzIc n={settingsOpen?'chevUp':'chevDown'} s={13} c={C.text3}/>
        </button>
        {settingsOpen&&<div style={{padding:'10px 12px',background:C.surface2,display:'flex',flexDirection:'column',gap:8,borderTop:`1px solid ${C.border}`}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <Sel label="Flow type" value={wizard.type||'candidate_apply'} onChange={v=>setW('type',v)}
            options={[{value:'candidate_apply',label:'Candidate application'},{value:'hm_create_job',label:'HM job creation'},{value:'custom',label:'Custom'}]}/>
          <Sel label="Target object" value={wizard.target_object||'people'} onChange={v=>setW('target_object',v)}
            options={[{value:'people',label:'People'},{value:'jobs',label:'Jobs'},{value:'talent_pools',label:'Talent Pools'}]}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <Toggle label="Show progress bar" checked={wizard.show_progress!==false} onChange={v=>setW('show_progress',v)} hint="Show step indicators at the top of each page"/>
          <Toggle label="Allow save & continue later" checked={wizard.allow_save_draft!==false} onChange={v=>setW('allow_save_draft',v)} hint="Sends a resume link to the applicant's email"/>
        </div>
        </div>}
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
            <div style={{fontSize:11,fontWeight:600,color:C.green,display:'flex',alignItems:'center',gap:4}}><WzIc n="checkSquare" s={12} c={C.green}/>Success page</div>
            <Inp label="Heading" value={wizard.success_page?.title} onChange={v=>setW('success_page',{...wizard.success_page,title:v})} placeholder="Submitted!"/>
            <Inp label="Message (use {first_name}, {job_title})" value={wizard.success_page?.message} onChange={v=>setW('success_page',{...wizard.success_page,message:v})} rows={2} placeholder="Thank you {first_name}…"/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontSize:11,fontWeight:600,color:C.amber,display:'flex',alignItems:'center',gap:4}}><WzIc n="alertCircle" s={12} c={C.amber}/>Rejection page (knockout)</div>
            <Inp label="Heading" value={wizard.rejection_page?.title} onChange={v=>setW('rejection_page',{...wizard.rejection_page,title:v})} placeholder="Thank you for your interest"/>
            <Inp label="Message" value={wizard.rejection_page?.message} onChange={v=>setW('rejection_page',{...wizard.rejection_page,message:v})} rows={2} placeholder="Based on your answers…"/>
          </div>
        </div>
      </div>
    </div>
  );
}
