// WizardRenderer.jsx — configurable multi-step wizard for portals
// Reads a wizard config from portal.wizard and renders it dynamically
import { useState, useEffect, useRef, useCallback } from 'react';
import { css, Badge, Btn, Section } from './shared.jsx';

// ── Lucide icon component (portal-renderer has no shared Ic) ─────────────────
const WZ_PATHS = {
  upload:      "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  fileText:    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  linkedin:    "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  edit:        "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  userCheck:   "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 11l2 2 4-4",
  paperclip:   "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
  check:       "M20 6L9 17l-5-5",
  checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
  loader:      "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  lock:        "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  x:           "M18 6L6 18M6 6l12 12",
  alertCircle: "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 8v4M12 16h.01",
  info:        "M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM12 8h.01M12 12v4",
  save:        "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  partyPopper: "M5.8 11.3L2 22l10.7-3.79M4 3h.01M22 8h.01M15 2h.01M22 20h.01M2 8h.01M20 2l-7.5 7.5M15 9.5L9.5 15",
  thumbsDown:  "M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17",
  arrowLeft:   "M19 12H5M12 19l-7-7 7-7",
  send:        "M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z",
};
const WzIc = ({n,s=16,c='currentColor'}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    {WZ_PATHS[n]&&<path d={WZ_PATHS[n]}/>}
  </svg>
);

// ── EO templates (same as CareerSite) ────────────────────────────────────────
const EO_TEMPLATES = {
  uk: {
    label:'United Kingdom',
    intro:'This information is collected anonymously for monitoring purposes and does not form part of your application.',
    fields:[
      {id:'eo_gender',      label:'Gender identity',   options:['Male','Female','Non-binary','Prefer to self-describe','Prefer not to say']},
      {id:'eo_age',         label:'Age range',          options:['Under 25','25–34','35–44','45–54','55–64','65 or over','Prefer not to say']},
      {id:'eo_ethnicity',   label:'Ethnic origin',      options:['Asian / Asian British','Black / African / Caribbean','Mixed / Multiple ethnic groups','White','Another ethnic group','Prefer not to say']},
      {id:'eo_disability',  label:'Disability',         options:['Yes – visible condition','Yes – non-visible condition','No','Prefer not to say']},
      {id:'eo_religion',    label:'Religion or belief', options:['Buddhist','Christian','Hindu','Jewish','Muslim','Sikh','No religion','Another religion or belief','Prefer not to say']},
      {id:'eo_orientation', label:'Sexual orientation', options:['Bisexual','Gay or Lesbian','Heterosexual / Straight','Another sexual orientation','Prefer not to say']},
    ],
  },
  us: {
    label:'United States',
    intro:'Providing this information is voluntary and will not affect your application. Used solely for EEO reporting.',
    fields:[
      {id:'eo_gender',      label:'Gender',           options:['Male','Female','Non-binary','Prefer not to say']},
      {id:'eo_race',        label:'Race / Ethnicity', options:['American Indian or Alaska Native','Asian','Black or African American','Hispanic or Latino','Native Hawaiian or Other Pacific Islander','White','Two or more races','Prefer not to say']},
      {id:'eo_veteran',     label:'Veteran status',   options:['I am a protected veteran','I am not a protected veteran','Prefer not to say']},
      {id:'eo_disability',  label:'Disability status',options:['Yes, I have a disability','No, I do not have a disability','Prefer not to say']},
    ],
  },
  uae: {
    label:'UAE / Middle East',
    intro:'This information is collected voluntarily to support our diversity and inclusion initiatives.',
    fields:[
      {id:'eo_gender',label:'Gender',    options:['Male','Female','Prefer not to say']},
      {id:'eo_age',   label:'Age range', options:['Under 25','25–34','35–44','45–54','55 or over','Prefer not to say']},
    ],
  },
  generic: {
    label:'International',
    intro:'This optional information helps us monitor equal opportunity. It does not affect your application.',
    fields:[
      {id:'eo_gender',label:'Gender identity',options:['Male','Female','Non-binary','Another gender identity','Prefer not to say']},
      {id:'eo_age',   label:'Age range',       options:['Under 25','25–34','35–44','45–54','55 or over','Prefer not to say']},
    ],
  },
};

// ── Shared form primitives ────────────────────────────────────────────────────
const WzInput = ({ label, value, onChange, required, type='text', placeholder, rows, onBlur, color }) => {
  const [focused, setFocused] = useState(false);
  const border = focused ? (color||'#4361EE') : '#E8ECF8';
  const s = { padding:'10px 14px', borderRadius:10, border:`1.5px solid ${border}`,
    fontSize:14, fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box', transition:'border-color .15s' };
  return (
    <div style={{display:'flex',flexDirection:'column',gap:5}}>
      {label&&<label style={{fontSize:12,fontWeight:600,color:'#4B5675'}}>{label}{required&&<span style={{color:'#EF4444'}}> *</span>}</label>}
      {rows
        ? <textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{...s,resize:'vertical'}} onFocus={()=>setFocused(true)} onBlur={()=>{setFocused(false);onBlur&&onBlur();}}/>
        : <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} style={s} onFocus={()=>setFocused(true)} onBlur={()=>{setFocused(false);onBlur&&onBlur();}}/>
      }
    </div>
  );
};

const WzSelect = ({ label, value, onChange, options, placeholder='Select…' }) => (
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:'#4B5675'}}>{label}</label>}
    <select value={value||''} onChange={e=>onChange(e.target.value)}
      style={{padding:'10px 14px',borderRadius:10,border:'1.5px solid #E8ECF8',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box',background:'white'}}>
      <option value="">{placeholder}</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ── Progress bar ──────────────────────────────────────────────────────────────
const WizardProgress = ({ pages, currentIndex, color }) => (
  <div style={{display:'flex',alignItems:'center',marginBottom:28}}>
    {pages.map((p,i)=>(
      <div key={p.id} style={{display:'flex',alignItems:'center',flex:i<pages.length-1?1:0}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,
            background:i<=currentIndex?color:'#E8ECF8',color:i<=currentIndex?'white':'#9DA8C7',transition:'all .2s'}}>
            {i<currentIndex ? <WzIc n="check" s={12} c="white"/> : i+1}
          </div>
          <div style={{fontSize:10,fontWeight:600,color:i===currentIndex?color:'#9DA8C7',marginTop:3,whiteSpace:'nowrap',maxWidth:80,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis'}}>
            {p.title||`Step ${i+1}`}
          </div>
        </div>
        {i<pages.length-1&&<div style={{flex:1,height:2,background:i<currentIndex?color:'#E8ECF8',margin:'0 6px 16px',transition:'background .3s'}}/>}
      </div>
    ))}
  </div>
);

// ── BLOCK: Entry Method ───────────────────────────────────────────────────────
const EntryMethodBlock = ({ config={}, formData, set, onMethodChosen, parsing, color, onCvFile }) => {
  const methods = [];
  if (config.allow_cv!==false)       methods.push({ id:'cv',        iconN:'upload',    label:'Upload my CV / Resume',     sub:'PDF, DOC or DOCX — we\'ll fill in your details automatically' });
  if (config.allow_linkedin!==false)  methods.push({ id:'linkedin',  iconN:'linkedin',  label:'Enter LinkedIn profile URL', sub:'Paste your LinkedIn URL — we\'ll note it for the team' });
  if (config.allow_manual!==false)    methods.push({ id:'manual',    iconN:'edit',      label:'Fill in the form manually',  sub:'Complete the application yourself' });
  if (config.allow_returning!==false) methods.push({ id:'returning', iconN:'userCheck', label:'Returning applicant',        sub:'Continue or update your existing profile', dashed:true });
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
      {methods.map(m=>{
        if (m.id==='cv') return (
          <label key="cv" style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:12,padding:'20px',background:'white',borderRadius:14,
            border:`2px solid ${color}`,cursor:'pointer',boxShadow:`0 2px 12px ${color}14`,transition:'all .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 20px ${color}22`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`0 2px 12px ${color}14`;}}>
            <input type="file" accept=".pdf,.doc,.docx" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){onCvFile&&onCvFile(f);onMethodChosen('cv');}e.target.value='';}}/>
            <div style={{width:44,height:44,borderRadius:12,background:`${color}14`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><WzIc n={m.iconN} s={22} c={color}/></div>
            <div><div style={{fontSize:14,fontWeight:700,color:'#0F1729',marginBottom:4}}>{parsing?'Reading your CV…':m.label}</div><div style={{fontSize:12,color:'#6B7280',lineHeight:1.5}}>{m.sub}</div></div>
          </label>
        );
        return (
          <button key={m.id} onClick={()=>onMethodChosen(m.id)}
            style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:12,padding:'20px',background:m.dashed?'#FAFBFF':'white',borderRadius:14,
              border:m.dashed?`1.5px dashed #C7D0E8`:'1.5px solid #E8ECF8',cursor:'pointer',textAlign:'left',width:'100%',fontFamily:'inherit',transition:'all .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=color;e.currentTarget.style.boxShadow=`0 6px 20px ${color}18`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.borderColor=m.dashed?'#C7D0E8':'#E8ECF8';e.currentTarget.style.boxShadow='none';}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${color}14`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><WzIc n={m.iconN} s={22} c={color}/></div>
            <div><div style={{fontSize:14,fontWeight:700,color:'#0F1729',marginBottom:4}}>{m.label}</div><div style={{fontSize:12,color:'#6B7280',lineHeight:1.5}}>{m.sub}</div></div>
          </button>
        );
      })}
    </div>
  );
};

// ── BLOCK: Profile Fields ─────────────────────────────────────────────────────
const PROFILE_FIELD_DEFS = [
  {key:'first_name',  label:'First name',         type:'text',  required:true,  placeholder:'Jane'},
  {key:'last_name',   label:'Last name',           type:'text',  required:false, placeholder:'Smith'},
  {key:'email',       label:'Email address',       type:'email', required:true,  placeholder:'jane@example.com'},
  {key:'phone',       label:'Phone number',        type:'tel',   required:false, placeholder:'+971 50 000 0000'},
  {key:'location',    label:'Location',            type:'text',  required:false, placeholder:'Dubai, UAE'},
  {key:'current_title',label:'Current job title',  type:'text',  required:false, placeholder:'Software Engineer'},
  {key:'linkedin_url',label:'LinkedIn profile URL',type:'url',   required:false, placeholder:'linkedin.com/in/your-profile'},
  {key:'cover_letter',label:'Cover letter / note', type:'textarea',required:false,placeholder:'Tell us why you\'re a great fit…',rows:4},
  {key:'years_experience',label:'Years of experience',type:'number',required:false,placeholder:'5'},
  {key:'salary_expectation',label:'Salary expectation',type:'text',required:false,placeholder:'AED 25,000/month'},
];

const ProfileFieldsBlock = ({ config={}, formData, set, onEmailBlur, emailCheck, checkingEmail, color }) => {
  const visibleKeys = config.fields?.length ? config.fields : ['first_name','last_name','email','phone','location','current_title'];
  const defs = PROFILE_FIELD_DEFS.filter(f=>visibleKeys.includes(f.key));
  const pairs = [];
  for (let i=0;i<defs.length;i+=2) pairs.push(defs.slice(i,i+2));
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {defs.map(f=>(
        <div key={f.key}>
          <WzInput label={f.label} type={f.type} value={formData[f.key]} onChange={v=>set(f.key,v)}
            required={f.required} placeholder={f.placeholder} rows={f.rows} color={color}
            onBlur={f.key==='email'?onEmailBlur:undefined}/>
          {f.key==='email'&&checkingEmail&&<div style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>Checking…</div>}
          {f.key==='email'&&emailCheck?.already_applied_this_job&&<div style={{marginTop:8,padding:'10px 12px',background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:8,fontSize:12,color:'#92400E',display:'flex',alignItems:'center',gap:6}}><WzIc n="alertCircle" s={13} c="#92400E"/>You've already applied for this role.</div>}
          {f.key==='email'&&emailCheck?.exists&&!emailCheck?.already_applied_this_job&&<div style={{marginTop:8,padding:'10px 12px',background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:8,fontSize:12,color:'#15803D',display:'flex',alignItems:'center',gap:6}}><WzIc n="checkCircle" s={13} c="#15803D"/>Welcome back — we've pre-filled your details.</div>}
        </div>
      ))}
    </div>
  );
};

// ── BLOCK: File Upload ────────────────────────────────────────────────────────
const FileUploadBlock = ({ config={}, formData, set, color }) => {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const label = config.label || 'Upload a file';
  const accept = config.accept || '.pdf,.doc,.docx,.jpg,.jpeg,.png';
  const handleFile = async (f) => {
    setFile(f); set(`__file_${config.field_key||'upload'}`, f);
    if (config.parse_cv && (f.name.endsWith('.pdf')||f.name.endsWith('.docx')||f.name.endsWith('.doc'))) {
      setParsing(true);
      try {
        const fd = new FormData(); fd.append('file',f);
        const r = await fetch('/api/cv-parse',{method:'POST',body:fd});
        if (r.ok) { const {result}=await r.json(); if(result) Object.entries(result).forEach(([k,v])=>{ if(v) set(k,v); }); }
      } catch {}
      setParsing(false);
    }
  };
  return (
    <div>
      <label style={{display:'flex',alignItems:'center',gap:14,padding:'16px 18px',background:'white',borderRadius:14,
        border:`2px dashed ${file?color:'#C7D0E8'}`,cursor:'pointer',transition:'border-color .2s'}}>
        <input type="file" accept={accept} style={{display:'none'}} onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=''; }}/>
        <div style={{width:36,height:36,borderRadius:10,background:`${color}14`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {parsing?<WzIc n="loader" s={18} c={color}/>:file?<WzIc n="checkCircle" s={18} c="#0CAF77"/>:<WzIc n="paperclip" s={18} c={color}/>}
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:'#0F1729'}}>{parsing?'Reading file…':file?file.name:label}</div>
          <div style={{fontSize:12,color:'#6B7280'}}>{file?`${(file.size/1024).toFixed(0)} KB`:config.hint||'Click to browse'}</div>
        </div>
        {file&&<button onClick={e=>{e.preventDefault();setFile(null);set(`__file_${config.field_key||'upload'}`,null);}} style={{marginLeft:'auto',padding:'4px 8px',borderRadius:6,border:'none',background:'#FEE2E2',color:'#EF4444',fontSize:11,fontWeight:700,cursor:'pointer'}}>Remove</button>}
      </label>
    </div>
  );
};

// ── BLOCK: Screening Questions ────────────────────────────────────────────────
const ScreeningQuestionsBlock = ({ config={}, formData, set, questions=[], color }) => {
  if (questions.length===0) return (
    <div style={{textAlign:'center',padding:'24px 0',color:'#9CA3AF',fontSize:14}}>No screening questions for this role. Click Continue.</div>
  );
  return (
    <div style={{display:'flex',flexDirection:'column',gap:18}}>
      {questions.map((q,i)=>{
        const isKO = q.type==='knockout';
        const val = formData[`sq_${q.id}`]||'';
        return (
          <div key={q.id} style={{padding:16,background:'white',borderRadius:12,border:`1.5px solid ${isKO?'#FCA5A5':'#E8ECF8'}`}}>
            {isKO&&<div style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',background:'#FEF2F2',borderRadius:99,marginBottom:8}}>
              <span style={{fontSize:10,fontWeight:700,color:'#DC2626'}}>ELIGIBILITY REQUIREMENT</span>
            </div>}
            <p style={{fontSize:14,fontWeight:600,color:'#0F1729',margin:'0 0 12px',lineHeight:1.5}}>{i+1}. {q.text}</p>
            {q.options?.length>0 ? (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {q.options.map(opt=>(
                  <label key={opt} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'8px 12px',borderRadius:8,
                    background:val===opt?`${color}12`:'#F8F9FF',border:`1px solid ${val===opt?color:'#E8ECF8'}`,transition:'all .1s'}}>
                    <input type="radio" name={`sq_${q.id}`} value={opt} checked={val===opt} onChange={()=>set(`sq_${q.id}`,opt)} style={{accentColor:color}}/>
                    <span style={{fontSize:13,color:'#374151'}}>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea value={val} onChange={e=>set(`sq_${q.id}`,e.target.value)} rows={3}
                placeholder="Your answer…"
                style={{padding:'10px 14px',borderRadius:10,border:'1.5px solid #E8ECF8',fontSize:14,fontFamily:'inherit',outline:'none',width:'100%',boxSizing:'border-box',resize:'vertical'}}/>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── BLOCK: Equal Opportunities ────────────────────────────────────────────────
const EqualOppsBlock = ({ config={}, formData, set, jobLocation }) => {
  const resolveRegion = (loc='') => {
    const l=loc.toLowerCase();
    if (/uk|united kingdom|england|london|manchester/.test(l)) return 'uk';
    if (/us|usa|united states|new york|california/.test(l)) return 'us';
    if (/uae|dubai|abu dhabi|gulf/.test(l)) return 'uae';
    return 'generic';
  };
  const region = config.region==='auto' ? resolveRegion(jobLocation) : (config.region||'generic');
  const tmpl = EO_TEMPLATES[region]||EO_TEMPLATES.generic;
  return (
    <div>
      <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'12px 16px',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
          <WzIc n="lock" s={14} c="#15803D" style={{marginTop:2,flexShrink:0}}/>
          <p style={{fontSize:12,color:'#15803D',margin:0,lineHeight:1.6}}><strong>Anonymous & confidential.</strong> {tmpl.intro}</p>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {tmpl.fields.map(f=><WzSelect key={f.id} label={f.label} value={formData[f.id]||''} onChange={v=>set(f.id,v)} options={f.options}/>)}
      </div>
    </div>
  );
};

// ── BLOCK: Consent ────────────────────────────────────────────────────────────
const ConsentBlock = ({ config={}, formData, set, companyName, color }) => {
  const text = config.text || `I consent to ${companyName||'this company'} storing and processing my personal data for recruitment purposes. I understand this can be withdrawn at any time.`;
  return (
    <div style={{background:'#F8F9FF',borderRadius:12,border:'1px solid #E8ECF8',padding:'16px 20px'}}>
      <label style={{display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer'}}>
        <input type="checkbox" checked={!!formData.__consent} onChange={e=>set('__consent',e.target.checked)}
          style={{marginTop:2,accentColor:color,width:16,height:16,flexShrink:0}}/>
        <span style={{fontSize:12,color:'#4B5675',lineHeight:1.7}}>
          {text}{config.required&&<span style={{color:'#DC2626'}}> *</span>}
        </span>
      </label>
    </div>
  );
};

// ── BLOCK: Info Block ─────────────────────────────────────────────────────────
const InfoBlock = ({ config={} }) => (
  <div style={{padding:'14px 18px',borderRadius:12,background:config.bg||'#F0F4FF',border:`1px solid ${config.border||'#C7D7FF'}`,marginBottom:4}}>
    {config.icon&&<div style={{fontSize:24,marginBottom:8}}>{config.icon}</div>}
    {config.heading&&<div style={{fontSize:15,fontWeight:700,color:'#1F2937',marginBottom:6}}>{config.heading}</div>}
    {config.content&&<div style={{fontSize:13,color:'#4B5675',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{config.content}</div>}
  </div>
);

// ── BLOCK: Review Summary ─────────────────────────────────────────────────────
const ReviewSummaryBlock = ({ config={}, formData, pages, questions }) => {
  const profileLabels = Object.fromEntries(PROFILE_FIELD_DEFS.map(f=>[f.key,f.label]));
  const excludeKeys = new Set(['__consent','__draft_token',...Object.keys(formData).filter(k=>k.startsWith('__file_'))]);
  const sections = [];

  // Profile fields
  const profileKeys = Object.keys(formData).filter(k=>profileLabels[k]&&formData[k]&&!excludeKeys.has(k));
  if (profileKeys.length) sections.push({ title:'Personal details', rows:profileKeys.map(k=>([profileLabels[k],String(formData[k]).slice(0,200)])) });

  // Screening questions
  const sqKeys = Object.keys(formData).filter(k=>k.startsWith('sq_')&&formData[k]);
  if (sqKeys.length&&questions?.length) {
    sections.push({ title:'Pre-screen answers', rows:sqKeys.map(k=>{
      const q = questions.find(q=>`sq_${q.id}`===k);
      return [q?.text?.slice(0,55)||k, formData[k]];
    })});
  }

  // Job fields
  const jobKeys = Object.keys(formData).filter(k=>k.startsWith('job_')&&formData[k]);
  if (jobKeys.length) sections.push({ title:'Role details', rows:jobKeys.map(k=>([k.replace('job_','').replace(/_/g,' '),String(formData[k])])) });

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {sections.map((s,si)=>(
        <div key={si} style={{background:'white',borderRadius:12,border:'1px solid #E8ECF8',padding:'16px 20px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#9DA8C7',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12}}>{s.title}</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {s.rows.map(([k,v],ri)=>(
              <div key={ri} style={{display:'flex',justifyContent:'space-between',gap:16,fontSize:13}}>
                <span style={{color:'#6B7280',flexShrink:0,maxWidth:'50%'}}>{k}</span>
                <span style={{color:'#0F1729',fontWeight:500,textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'50%'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── BLOCK: Job Fields (for HM portal) ────────────────────────────────────────
const JOB_FIELD_DEFS = [
  {key:'job_title',        label:'Job title',         type:'text',   required:true,  placeholder:'Senior Product Manager'},
  {key:'department',       label:'Department',         type:'text',   required:false, placeholder:'Engineering'},
  {key:'location',         label:'Location',           type:'text',   required:false, placeholder:'Dubai, UAE'},
  {key:'work_type',        label:'Work type',          type:'select', required:false, options:['On-site','Remote','Hybrid']},
  {key:'employment_type',  label:'Employment type',    type:'select', required:false, options:['Full-time','Part-time','Contract','Internship','Freelance']},
  {key:'salary_min',       label:'Salary min',         type:'number', required:false, placeholder:'50000'},
  {key:'salary_max',       label:'Salary max',         type:'number', required:false, placeholder:'80000'},
  {key:'description',      label:'Job description',    type:'textarea',required:false,placeholder:'Describe the role and responsibilities…',rows:5},
  {key:'required_skills',  label:'Required skills',    type:'text',   required:false, placeholder:'React, Node.js, SQL (comma-separated)'},
  {key:'priority',         label:'Priority',           type:'select', required:false, options:['Low','Medium','High','Urgent']},
];

const JobFieldsBlock = ({ config={}, formData, set, color }) => {
  const visibleKeys = config.fields?.length ? config.fields : ['job_title','department','location','work_type','employment_type','description'];
  const defs = JOB_FIELD_DEFS.filter(f=>visibleKeys.includes(f.key));
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {defs.map(f=>(
        <div key={f.key}>
          {f.type==='select' ? <WzSelect label={f.label} value={formData[f.key]} onChange={v=>set(f.key,v)} options={f.options||[]}/>
          : <WzInput label={f.label} type={f.type} value={formData[f.key]} onChange={v=>set(f.key,v)} required={f.required} placeholder={f.placeholder} rows={f.rows} color={color}/>}
        </div>
      ))}
    </div>
  );
};

// ── Block Renderer — dispatches to the right component ───────────────────────
const renderBlock = (block, ctx) => {
  const { formData, set, color, emailCheck, checkingEmail, onEmailBlur,
    onMethodChosen, onCvFile, parsing, questions, jobLocation, companyName, pages } = ctx;

  switch (block.type) {
    case 'entry_method':
      return <EntryMethodBlock key={block.id} config={block.config} formData={formData} set={set}
        onMethodChosen={onMethodChosen} parsing={parsing} color={color} onCvFile={onCvFile}/>;
    case 'profile_fields':
      return <ProfileFieldsBlock key={block.id} config={block.config} formData={formData} set={set}
        onEmailBlur={onEmailBlur} emailCheck={emailCheck} checkingEmail={checkingEmail} color={color}/>;
    case 'file_upload':
      return <FileUploadBlock key={block.id} config={block.config} formData={formData} set={set} color={color}/>;
    case 'screening_questions':
      return <ScreeningQuestionsBlock key={block.id} config={block.config} formData={formData} set={set} questions={questions} color={color}/>;
    case 'equal_opps':
      return <EqualOppsBlock key={block.id} config={block.config} formData={formData} set={set} jobLocation={jobLocation}/>;
    case 'consent':
      return <ConsentBlock key={block.id} config={block.config} formData={formData} set={set} companyName={companyName} color={color}/>;
    case 'info_block':
      return <InfoBlock key={block.id} config={block.config}/>;
    case 'review_summary':
      return <ReviewSummaryBlock key={block.id} config={block.config} formData={formData} pages={pages} questions={questions}/>;
    case 'job_fields':
      return <JobFieldsBlock key={block.id} config={block.config} formData={formData} set={set} color={color}/>;
    default:
      return <div key={block.id} style={{padding:'10px 14px',background:'#F1F5F9',borderRadius:8,fontSize:12,color:'#6B7280'}}>
        Unknown block type: <code>{block.type}</code>
      </div>;
  }
};

// ── Main WizardRenderer ───────────────────────────────────────────────────────
export default function WizardRenderer({ portal, wizard, job, api, onBack, onSuccess }) {
  const c = css(portal.branding);
  const color = c.primary || '#4361EE';
  const br = portal.branding || {};

  const pages = (wizard.pages || []).filter(p => !p.hidden);
  const showProgress = wizard.show_progress !== false && pages.length > 1;
  const allowDraft   = wizard.allow_save_draft !== false;

  const [formData, setFormData]       = useState(() => {
    try { const saved = sessionStorage.getItem(`wiz_${portal.id}_${job?.id||'gen'}`); return saved ? JSON.parse(saved) : {}; }
    catch { return {}; }
  });
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [pageHistory, setPageHistory]  = useState([0]);
  const [entryMethod, setEntryMethod]  = useState(null);
  const [parsing, setParsing]          = useState(false);
  const [submitting, setSubmitting]    = useState(false);
  const [savingDraft, setSavingDraft]  = useState(false);
  const [draftSaved, setDraftSaved]    = useState(false);
  const [knockedOut, setKnockedOut]    = useState(false);
  const [submitted, setSubmitted]      = useState(false);
  const [error, setError]              = useState('');
  const [questions, setQuestions]      = useState([]);
  const [emailCheck, setEmailCheck]    = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const emailCheckedRef = useRef('');

  const currentPage = pages[currentPageIdx] || pages[0];

  // Persist form to sessionStorage
  const set = useCallback((k, v) => {
    setFormData(f => {
      const next = { ...f, [k]: v };
      try { sessionStorage.setItem(`wiz_${portal.id}_${job?.id||'gen'}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [portal.id, job?.id]);

  // Load screening questions if this wizard has a screening block
  useEffect(() => {
    const hasScreening = pages.some(p => p.blocks?.some(b => b.type === 'screening_questions'));
    if (!hasScreening || !job?.id) return;
    api.get(`/question-bank/jobs/${job.id}/questions`).then(data => {
      const qs = Array.isArray(data) ? data : [];
      setQuestions([...qs.filter(q=>q.type==='knockout'), ...qs.filter(q=>q.type!=='knockout')]);
    }).catch(() => {});
  }, [job?.id]);

  // Resume from draft token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resume_token');
    if (!token) return;
    api.get(`/portals/${portal.id}/wizard/draft/${token}`).then(draft => {
      if (draft.form_data) {
        setFormData(draft.form_data);
        if (draft.page_id) {
          const idx = pages.findIndex(p=>p.id===draft.page_id);
          if (idx>=0) { setCurrentPageIdx(idx); setPageHistory([...Array(idx+1).keys()]); }
        }
      }
    }).catch(() => {});
  }, []);

  // ── Email blur check ──────────────────────────────────────────────────────
  const handleEmailBlur = async () => {
    const email = (formData.email || '').toLowerCase().trim();
    if (!email || email === emailCheckedRef.current) return;
    emailCheckedRef.current = email;
    setCheckingEmail(true);
    try {
      const res = await api.get(`/portals/${portal.id}/apply/check-email?email=${encodeURIComponent(email)}&job_id=${job?.id||''}`);
      setEmailCheck(res);
      if (res.exists && res.person) {
        const p = res.person;
        ['first_name','last_name','phone','location','current_title','linkedin_url'].forEach(k => { if (p[k]) set(k, p[k]); });
      }
    } catch {}
    setCheckingEmail(false);
  };

  // ── CV upload handler ─────────────────────────────────────────────────────
  const handleCvFile = async (file) => {
    setParsing(true);
    set('__cv_file', file);
    try {
      const fd = new FormData(); fd.append('file', file);
      // Use api prop if available (adds auth headers), fall back to bare fetch for standalone renderer
      let r;
      if (api?.postForm) {
        r = await api.postForm('/cv-parse', fd);
      } else {
        const res = await fetch('/api/cv-parse', { method:'POST', body:fd, credentials:'include' });
        r = res.ok ? await res.json() : null;
      }
      const data = r?.result || r;
      const result = data?.parsed || data;
      if (result && typeof result === 'object') {
        ['first_name','last_name','email','phone','location','current_title','linkedin_url',
         'years_experience','skills','summary'].forEach(k => { if (result[k]) set(k, result[k]); });
      }
    } catch(e) { console.warn('CV parse error:', e); }
    setParsing(false);
  };

  // ── Navigation: validate current page then advance ────────────────────────
  const handleNext = async () => {
    setError('');
    const page = pages[currentPageIdx];

    // Validate required profile fields on this page
    if (page.blocks?.some(b => b.type === 'profile_fields')) {
      if (!formData.first_name) { setError('First name is required.'); return; }
      if (!formData.email)      { setError('Email address is required.'); return; }
    }
    if (page.blocks?.some(b => b.type === 'job_fields')) {
      if (!formData.job_title) { setError('Job title is required.'); return; }
    }

    // Check knockout questions on screening page
    if (page.blocks?.some(b => b.type === 'screening_questions')) {
      for (const q of questions.filter(q => q.type === 'knockout')) {
        const ans = formData[`sq_${q.id}`];
        if (q.pass_value && ans && ans !== q.pass_value) {
          setKnockedOut(true); return;
        }
      }
    }

    // Navigate to next page
    const nextId = page.navigation?.next;
    if (page.navigation?.submit || nextId === 'submit') { await handleSubmit(); return; }

    let nextIdx;
    if (nextId) {
      nextIdx = pages.findIndex(p => p.id === nextId);
    } else {
      nextIdx = currentPageIdx + 1;
    }
    if (nextIdx < 0 || nextIdx >= pages.length) { await handleSubmit(); return; }
    setPageHistory(h => [...h, nextIdx]);
    setCurrentPageIdx(nextIdx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Navigation: back ─────────────────────────────────────────────────────
  const handleBack = () => {
    if (pageHistory.length <= 1) { onBack && onBack(); return; }
    const newHistory = pageHistory.slice(0, -1);
    setPageHistory(newHistory);
    setCurrentPageIdx(newHistory[newHistory.length - 1]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Save draft ────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!formData.email) { setError('Please enter your email before saving progress.'); return; }
    setSavingDraft(true); setError('');
    try {
      await api.post(`/portals/${portal.id}/wizard/draft`, {
        email: formData.email, form_data: formData,
        page_id: currentPage?.id, job_id: job?.id || null,
      });
      setDraftSaved(true); setTimeout(() => setDraftSaved(false), 5000);
    } catch { setError('Could not save progress. Please try again.'); }
    setSavingDraft(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (currentPage.blocks?.some(b => b.type === 'consent' && b.config?.required !== false) && !formData.__consent) {
      setError('Please accept the data processing consent to continue.'); return;
    }
    setSubmitting(true); setError('');
    try {
      // Upload any pending files
      const fileKeys = Object.keys(formData).filter(k => k.startsWith('__file_') && formData[k] instanceof File);
      const uploadedIds = {};
      for (const k of fileKeys) {
        const fd2 = new FormData(); fd2.append('file', formData[k]);
        fd2.append('file_type_name', k.replace('__file_','').replace(/_/g,' '));
        try { const r=await fetch('/api/attachments/upload',{method:'POST',body:fd2}); if(r.ok){const a=await r.json();uploadedIds[k]=a.id;} } catch {}
      }

      // Collect form responses from form_response blocks
      const formResponses = [];
      for (const page of pages) {
        for (const block of (page.blocks||[])) {
          if (block.type === 'form_response' && block.config?.form_id) {
            const answers = {};
            for (const [k,v] of Object.entries(formData)) {
              if (k.startsWith(`fr_${block.config.form_id}_`)) answers[k.replace(`fr_${block.config.form_id}_`,'')] = v;
            }
            if (Object.keys(answers).length) formResponses.push({ form_id:block.config.form_id, answers });
          }
        }
      }

      const result = await api.post(`/portals/${portal.id}/wizard/submit`, {
        form_data: { ...formData, ...uploadedIds },
        job_id: job?.id || null,
        form_responses: formResponses,
        meta: { entry_method: entryMethod, wizard_type: wizard.type },
      });
      if (result.error) { setError(result.error); setSubmitting(false); return; }
      try { sessionStorage.removeItem(`wiz_${portal.id}_${job?.id||'gen'}`); } catch {}
      setSubmitted(true);
    } catch { setError('Something went wrong. Please try again.'); setSubmitting(false); }
  };

  // ── Special screens ───────────────────────────────────────────────────────
  if (submitted) {
    const sp = wizard.success_page || {};
    const name = formData.first_name || '';
    return (
      <div style={{minHeight:'100vh',background:c.bg,fontFamily:c.font,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center',padding:40,maxWidth:480}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:`${color}14`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <WzIc n="partyPopper" s={36} c={color}/>
          </div>
          <h2 style={{fontSize:26,fontWeight:900,color:'#0F1729',marginBottom:8}}>{sp.title||'Submitted!'}</h2>
          <p style={{color:'#6B7280',lineHeight:1.7,marginBottom:28}}>
            {(sp.message||'Thank you {first_name} — your submission is on its way.').replace('{first_name}',name).replace('{job_title}',job?.data?.job_title||'')}
          </p>
          {onSuccess&&<button onClick={onSuccess} style={{padding:'10px 24px',borderRadius:10,background:color,color:'white',fontSize:14,fontWeight:700,border:'none',cursor:'pointer',fontFamily:c.font}}>Done</button>}
        </div>
      </div>
    );
  }

  if (knockedOut) {
    const rp = wizard.rejection_page || {};
    return (
      <div style={{minHeight:'100vh',background:c.bg,fontFamily:c.font,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center',padding:40,maxWidth:480}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:'#FEF3C7',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <WzIc n="thumbsDown" s={36} c="#F59F00"/>
          </div>
          <h2 style={{fontSize:22,fontWeight:800,color:'#0F1729',marginBottom:12}}>{rp.title||'Thank you for your interest'}</h2>
          <p style={{color:'#6B7280',lineHeight:1.7,marginBottom:28}}>{rp.message||"Based on your answers, we're unable to progress your application for this role at this time."}</p>
          {onBack&&<button onClick={onBack} style={{padding:'10px 24px',borderRadius:10,background:color,color:'white',fontSize:14,fontWeight:700,border:'none',cursor:'pointer',fontFamily:c.font}}>Back to roles</button>}
        </div>
      </div>
    );
  }

  const isFirstPage = pageHistory.length <= 1;
  const isLastPage  = currentPage?.navigation?.submit || !currentPage?.navigation?.next ||
    currentPageIdx >= pages.length - 1;
  const isEntryPage = currentPage?.blocks?.some(b => b.type === 'entry_method');
  const blockCtx = { formData, set, color, emailCheck, checkingEmail, onEmailBlur:handleEmailBlur,
    onMethodChosen:(m)=>{ setEntryMethod(m); handleNext(); }, onCvFile:handleCvFile, parsing,
    questions, jobLocation:job?.data?.location, companyName:br.company_name, pages };

  return (
    <div style={{minHeight:'100vh',background:c.bg,fontFamily:c.font}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Header bar */}
      <div style={{background:color,padding:'14px 0',position:'sticky',top:0,zIndex:50}}>
        <Section>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <button onClick={isFirstPage?onBack:handleBack}
              style={{background:'none',border:'none',color:'rgba(255,255,255,.85)',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:c.font,flexShrink:0}}>
              ← {isFirstPage?'Back':'Previous'}
            </button>
            {job?.data?.job_title&&(
              <div style={{color:'rgba(255,255,255,.65)',fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                Applying for <strong style={{color:'white'}}>{job.data.job_title}</strong>
              </div>
            )}
            {allowDraft&&formData.email&&!isEntryPage&&(
              <button onClick={handleSaveDraft} disabled={savingDraft}
                style={{background:'rgba(255,255,255,.18)',border:'1px solid rgba(255,255,255,.35)',borderRadius:8,color:'white',fontSize:12,fontWeight:600,cursor:'pointer',padding:'5px 12px',fontFamily:c.font,flexShrink:0,display:'flex',alignItems:'center',gap:5}}>
                {savingDraft
                  ? <><WzIc n="loader" s={11} c="white"/>Saving…</>
                  : draftSaved
                  ? <><WzIc n="check" s={11} c="white"/>Saved!</>
                  : <><WzIc n="save" s={11} c="white"/>Save & continue later</>}
              </button>
            )}
          </div>
        </Section>
      </div>

      <Section style={{padding:'32px 24px'}}>
        <div style={{maxWidth:620,margin:'0 auto'}}>
          {/* Progress bar */}
          {showProgress&&!isEntryPage&&(
            <WizardProgress pages={pages.filter(p=>!p.hide_from_progress&&!p.blocks?.some(b=>b.type==='entry_method'))}
              currentIndex={currentPageIdx-(pages.findIndex(p=>p.blocks?.some(b=>b.type==='entry_method'))>=0?1:0)}
              color={color}/>
          )}

          {/* Alerts */}
          {error&&<div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',color:'#DC2626',fontSize:13,marginBottom:16}}>{error}</div>}

          {/* CV parsing banner — shows while NLP extraction is in progress */}
          {parsing&&!isEntryPage&&(
            <div style={{background:'#EEF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
              <svg style={{animation:'spin .8s linear infinite',flexShrink:0}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#1D4ED8'}}>Reading your CV…</div>
                <div style={{fontSize:12,color:'#3B82F6'}}>We're extracting your details — fields will fill in automatically.</div>
              </div>
            </div>
          )}
          {draftSaved&&<div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'10px 14px',color:'#15803D',fontSize:13,marginBottom:16,display:'flex',alignItems:'center',gap:7}}><WzIc n="checkCircle" s={14} c="#15803D"/>Progress saved — a link to continue has been sent to {formData.email}.</div>}

          {/* Page title & subtitle */}
          {currentPage?.title&&(
            <div style={{marginBottom:isEntryPage?28:20}}>
              <h2 style={{fontSize:isEntryPage?24:20,fontWeight:900,color:'#0F1729',marginBottom:4}}>{currentPage.title}</h2>
              {currentPage.subtitle&&<p style={{color:'#6B7280',fontSize:14,margin:0}}>{currentPage.subtitle}</p>}
            </div>
          )}

          {/* Blocks */}
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            {(currentPage?.blocks||[]).map(block => renderBlock(block, blockCtx))}
          </div>

          {/* Navigation footer — not shown on entry_method pages (those navigate via block clicks) */}
          {!isEntryPage&&(
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:32}}>
              <button onClick={handleNext} disabled={submitting}
                style={{padding:'12px 28px',borderRadius:10,background:color,color:'white',fontSize:15,fontWeight:700,border:'none',
                  cursor:submitting?'not-allowed':'pointer',opacity:submitting?0.7:1,fontFamily:c.font,display:'flex',alignItems:'center',gap:8}}>
                {submitting?'Submitting…':isLastPage?'Submit →':'Continue →'}
              </button>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
