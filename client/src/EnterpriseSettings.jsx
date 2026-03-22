// client/src/EnterpriseSettings.jsx
import { useState, useEffect, useCallback } from "react";

const F = "'Geist', -apple-system, sans-serif";
const C = { accent:'#4361EE', accentLight:'#EEF2FF', bg:'#F7F8FA', text1:'#111827', text2:'#374151', text3:'#6B7280', text4:'#9CA3AF', border:'#E5E7EB', green:'#0CAF77', amber:'#F59F00', red:'#EF4444', purple:'#7C3AED' };
const api = {
  get: u => fetch(u).then(r=>r.json()),
  post:(u,b)=>fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:(u,b)=>fetch(u,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  delete:u=>fetch(u,{method:'DELETE'}).then(r=>r.json()),
};

const PATHS = {
  plus:'M12 5v14M5 12h14', trash:'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  edit:'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  x:'M18 6L6 18M6 6l12 12', check:'M20 6L9 17l-5-5', search:'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  layers:'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  briefcase:'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2',
  map:'M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7zM9 4v13M15 7v13',
  dollar:'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  award:'M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  chevD:'M6 9l6 6 6-6', chevR:'M9 18l6-6-6-6',
  download:'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  zap:'M13 2L3 14h9l-1 8 10-12h-9l1-8z', filter:'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
};

function Ic({n,s=16,c=C.text3,style={}}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={PATHS[n]||''}/></svg>; }

function Btn({children,onClick,variant='default',size='md',disabled,style={}}) {
  const sz={sm:{padding:'5px 10px',fontSize:12},md:{padding:'8px 14px',fontSize:13}};
  const vr={default:{background:'white',color:C.text2,border:`1.5px solid ${C.border}`},primary:{background:C.accent,color:'white',border:'none'},danger:{background:'#FEF2F2',color:C.red,border:`1.5px solid #FECACA`},green:{background:'#F0FDF4',color:C.green,border:`1.5px solid #BBF7D0`}};
  return <button onClick={onClick} disabled={disabled} style={{fontFamily:F,cursor:disabled?'not-allowed':'pointer',display:'inline-flex',alignItems:'center',gap:6,borderRadius:8,fontWeight:600,transition:'all .15s',opacity:disabled?0.5:1,...sz[size],...vr[variant],...style}}>{children}</button>;
}
function Badge({children,color=C.accent,light=false}) { return <span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:700,background:light?`${color}18`:color,color:light?color:'white',fontFamily:F}}>{children}</span>; }
function Input({value,onChange,placeholder,style={}}) { return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{fontFamily:F,fontSize:13,padding:'7px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,outline:'none',background:'white',color:C.text1,width:'100%',boxSizing:'border-box',...style}}/>; }
function Select({value,onChange,options,placeholder,style={}}) { return <select value={value} onChange={e=>onChange(e.target.value)} style={{fontFamily:F,fontSize:13,padding:'7px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,outline:'none',background:'white',width:'100%',...style}}>{placeholder&&<option value="">{placeholder}</option>}{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>; }
function Label({children}) { return <div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:4,fontFamily:F}}>{children}</div>; }
function FormRow({label,children}) { return <div style={{marginBottom:14}}><Label>{label}</Label>{children}</div>; }

function Modal({open,onClose,title,width=540,children}) {
  if(!open) return null;
  return <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.35)'}} onClick={onClose}>
    <div style={{background:'white',borderRadius:16,width,maxWidth:'95vw',maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:'18px 22px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:15,fontWeight:700,color:C.text1,fontFamily:F}}>{title}</span>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="x" s={16} c={C.text3}/></button>
      </div>
      <div style={{padding:'20px 22px'}}>{children}</div>
    </div>
  </div>;
}

function EmptyState({icon,title,subtitle,action}) {
  return <div style={{textAlign:'center',padding:'48px 24px'}}>
    <div style={{width:52,height:52,borderRadius:14,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}><Ic n={icon} s={22} c={C.accent}/></div>
    <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:6,fontFamily:F}}>{title}</div>
    {subtitle&&<div style={{fontSize:13,color:C.text3,marginBottom:16,fontFamily:F}}>{subtitle}</div>}
    {action}
  </div>;
}

const CAT_COLORS = { Technology:'#4361EE', Business:'#0CA678', Design:'#7C3AED', 'Soft Skills':'#F59F00', Languages:'#E03131', Certifications:'#1098AD' };
function catColor(cat) { return CAT_COLORS[cat] || C.accent; }

// ── Skills Section ────────────────────────────────────────────────────────────
function SkillsSection({environment}) {
  const [skills,setSkills]=useState([]); const [cats,setCats]=useState([]); const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState(''); const [filterCat,setFilterCat]=useState(''); const [view,setView]=useState('tree');
  const [modal,setModal]=useState(null); const [seeding,setSeeding]=useState(false); const [saving,setSaving]=useState(false);
  const [generatingEmb,setGeneratingEmb]=useState(false); const [seedingRels,setSeedingRels]=useState(false);
  const [embMsg,setEmbMsg]=useState(''); const [showExpand,setShowExpand]=useState(false);
  const envId=environment?.id;

  const load=useCallback(async()=>{ if(!envId) return; setLoading(true);
    const [s,c]=await Promise.all([api.get(`/enterprise/skills?environment_id=${envId}`),api.get(`/enterprise/skills/categories?environment_id=${envId}`)]);
    setSkills(Array.isArray(s)?s:[]); setCats(Array.isArray(c)?c:[]); setLoading(false); },[envId]);
  useEffect(()=>{load();},[load]);

  const allCats=[...new Set(skills.map(s=>s.category))].sort();
  const filtered=skills.filter(s=>{ if(filterCat&&s.category!==filterCat) return false; if(search){const q=search.toLowerCase(); return s.name.toLowerCase().includes(q)||(s.aliases||[]).some(a=>a.toLowerCase().includes(q));} return true; });
  const grouped={}; filtered.forEach(s=>{ const k=`${s.category}|||${s.subcategory||'Other'}`; if(!grouped[k]) grouped[k]={category:s.category,subcategory:s.subcategory||'Other',skills:[]}; grouped[k].skills.push(s); });
  const embCount=skills.filter(s=>s.embedding).length;

  async function handleSeed(){setSeeding(true); const r=await api.post('/enterprise/skills/seed',{environment_id:envId}); setSeeding(false); if(r.error)window.__toast?.alert(r.error); else load();}
  async function handleSeedRels(){setSeedingRels(true); const r=await api.post('/skills-intel/seed-relationships',{environment_id:envId}); setSeedingRels(false); if(r.error)window.__toast?.alert(r.error); else window.__toast?.alert(`Seeded ${r.inserted} relationships`);}
  async function handleGenEmb(){setGeneratingEmb(true); setEmbMsg('Generating embeddings via Claude…'); const r=await api.post('/skills-intel/generate-embeddings',{environment_id:envId}); setGeneratingEmb(false); setEmbMsg(r.error?`Error: ${r.error}`:`Done — ${r.done} embeddings generated`); load();}
  async function handleSave(form){setSaving(true); if(modal.mode==='edit') await api.patch(`/enterprise/skills/${modal.skill.id}`,{...form,environment_id:envId}); else await api.post('/enterprise/skills',{...form,environment_id:envId}); setSaving(false); setModal(null); load();}
  async function handleDelete(id){if(!confirm('Delete this skill?'))return; await api.delete(`/enterprise/skills/${id}`); load();}

  return <div>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
      <div>
        <div style={{fontSize:18,fontWeight:800,color:C.text1,fontFamily:F}}>Skills Ontology</div>
        <div style={{fontSize:13,color:C.text3,fontFamily:F,marginTop:2}}>{skills.length} skills · {embCount} embedded{skills.length>embCount&&skills.length>0?` · ${skills.length-embCount} need embedding`:''}</div>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {skills.length===0&&<Btn onClick={handleSeed} disabled={seeding} variant="green" size="sm"><Ic n="download" s={12} c={C.green}/>{seeding?'Seeding…':'Load Taxonomy'}</Btn>}
        {skills.length>0&&<><Btn onClick={handleSeedRels} disabled={seedingRels} size="sm" style={{borderColor:C.purple,color:C.purple,background:`${C.purple}08`}}><Ic n="zap" s={12} c={C.purple}/>{seedingRels?'Seeding…':'Seed Relationships'}</Btn>
        {embCount<skills.length&&<Btn onClick={handleGenEmb} disabled={generatingEmb} size="sm" style={{borderColor:C.green,color:C.green,background:`${C.green}08`}}><Ic n="zap" s={12} c={C.green}/>{generatingEmb?'Generating…':`Embed ${skills.length-embCount} skills`}</Btn>}
        <Btn onClick={()=>setShowExpand(true)} size="sm"><Ic n="plus" s={12} c={C.text2}/>Expand Taxonomy</Btn></>}
        <Btn onClick={()=>setModal({mode:'create',skill:null})} variant="primary" size="sm"><Ic n="plus" s={12} c="white"/>Add Skill</Btn>
      </div>
    </div>
    {embMsg&&<div style={{padding:'8px 12px',borderRadius:8,background:C.accentLight,fontSize:12,color:C.accent,marginBottom:12,fontFamily:F}}>{embMsg}</div>}
    <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
      <div style={{position:'relative',flex:1,minWidth:180}}><Ic n="search" s={13} c={C.text4} style={{position:'absolute',left:9,top:8}}/><Input value={search} onChange={setSearch} placeholder="Search skills…" style={{paddingLeft:30}}/></div>
      <Select value={filterCat} onChange={setFilterCat} options={allCats.map(c=>({value:c,label:c}))} placeholder="All categories" style={{width:160}}/>
      <div style={{display:'flex',border:`1.5px solid ${C.border}`,borderRadius:8,overflow:'hidden'}}>
        {['tree','list'].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:'7px 12px',border:'none',background:view===v?C.accent:'white',color:view===v?'white':C.text3,cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:600}}>{v==='tree'?'Tree':'List'}</button>)}
      </div>
    </div>
    {loading?<div style={{textAlign:'center',padding:40,color:C.text3,fontFamily:F}}>Loading…</div>
    :skills.length===0?<EmptyState icon="layers" title="No skills yet" subtitle="Load 120+ pre-built skills spanning Technology, Business, Soft Skills, Languages and more." action={<Btn onClick={handleSeed} disabled={seeding} variant="primary">{seeding?'Loading…':'Load Pre-built Taxonomy'}</Btn>}/>
    :filtered.length===0?<EmptyState icon="search" title="No matching skills" subtitle="Try a different search or filter."/>
    :view==='tree'?<SkillTree grouped={grouped} onEdit={s=>setModal({mode:'edit',skill:s})} onDelete={handleDelete}/>
    :<SkillList filtered={filtered} onEdit={s=>setModal({mode:'edit',skill:s})} onDelete={handleDelete}/>}
    {modal&&<SkillModal open skill={modal.skill} allCategories={allCats} categories={cats} onSave={handleSave} saving={saving} onClose={()=>setModal(null)}/>}
    {showExpand&&<ExpandTaxonomyModal open onClose={()=>setShowExpand(false)} environment={environment} onExpanded={()=>{setShowExpand(false);load();}}/>}
  </div>;
}

function SkillTree({grouped,onEdit,onDelete}) {
  const [exp,setExp]=useState({});
  const byCat={};
  Object.values(grouped).forEach(g=>{if(!byCat[g.category])byCat[g.category]={};byCat[g.category][g.subcategory]=g.skills;});
  return <div style={{display:'flex',flexDirection:'column',gap:12}}>
    {Object.entries(byCat).map(([cat,subs])=>{
      const color=catColor(cat); const total=Object.values(subs).flat().length; const isOpen=exp[cat]!==false;
      return <div key={cat} style={{background:'white',borderRadius:14,border:`1.5px solid ${C.border}`,overflow:'hidden'}}>
        <div onClick={()=>setExp(e=>({...e,[cat]:!isOpen}))} style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',background:`${color}08`,borderBottom:isOpen?`1px solid ${color}20`:'none'}}>
          <div style={{width:10,height:10,borderRadius:'50%',background:color,flexShrink:0}}/><span style={{fontSize:14,fontWeight:700,color:C.text1,fontFamily:F,flex:1}}>{cat}</span><Badge color={color}>{total}</Badge><Ic n={isOpen?'chevD':'chevR'} s={14} c={C.text3}/>
        </div>
        {isOpen&&Object.entries(subs).map(([sub,skills])=>{
          const subKey=`${cat}/${sub}`; const subOpen=exp[subKey]!==false;
          return <div key={sub}>
            <div onClick={()=>setExp(e=>({...e,[subKey]:!subOpen}))} style={{padding:'9px 16px 9px 32px',display:'flex',alignItems:'center',gap:8,cursor:'pointer',borderBottom:`1px solid ${C.border}`}}>
              <Ic n={subOpen?'chevD':'chevR'} s={12} c={C.text4}/><span style={{fontSize:13,fontWeight:600,color:C.text2,fontFamily:F,flex:1}}>{sub}</span><span style={{fontSize:11,color:C.text4,fontFamily:F}}>{skills.length}</span>
            </div>
            {subOpen&&<div style={{borderBottom:`1px solid ${C.border}`}}>
              {skills.map(s=><div key={s.id} style={{padding:'8px 16px 8px 48px',display:'flex',alignItems:'center',gap:8,borderBottom:`1px solid ${C.border}98`,opacity:s.is_active?1:0.45}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:s.embedding?C.green:C.border,flexShrink:0}} title={s.embedding?'Embedded':'No embedding'}/>
                <span style={{fontSize:13,color:C.text1,fontFamily:F,flex:1}}>{s.name}</span>
                {s.aliases?.length>0&&<span style={{fontSize:11,color:C.text4}}>{s.aliases.slice(0,2).join(', ')}</span>}
                {!s.is_active&&<Badge color={C.text4} light>inactive</Badge>}
                <button onClick={()=>onEdit(s)} style={{background:'none',border:'none',cursor:'pointer',padding:3}}><Ic n="edit" s={13} c={C.text4}/></button>
                <button onClick={()=>onDelete(s.id)} style={{background:'none',border:'none',cursor:'pointer',padding:3}}><Ic n="trash" s={13} c={C.red}/></button>
              </div>)}
            </div>}
          </div>;
        })}
      </div>;
    })}
  </div>;
}

function SkillList({filtered,onEdit,onDelete}) {
  return <div style={{background:'white',borderRadius:14,border:`1.5px solid ${C.border}`,overflow:'hidden'}}>
    <table style={{width:'100%',borderCollapse:'collapse',fontFamily:F,fontSize:13}}>
      <thead><tr style={{background:C.bg}}>{['','Skill','Category','Subcategory','Aliases','Status',''].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
      <tbody>{filtered.map(s=><tr key={s.id} style={{borderBottom:`1px solid ${C.border}`,opacity:s.is_active?1:0.5}}>
        <td style={{padding:'10px 8px 10px 14px'}}><div style={{width:8,height:8,borderRadius:'50%',background:s.embedding?C.green:C.border}} title={s.embedding?'Embedded':'No embedding'}/></td>
        <td style={{padding:'10px 14px',fontWeight:600,color:C.text1}}>{s.name}</td>
        <td style={{padding:'10px 14px'}}><Badge color={catColor(s.category)} light>{s.category}</Badge></td>
        <td style={{padding:'10px 14px',color:C.text3}}>{s.subcategory||'—'}</td>
        <td style={{padding:'10px 14px',color:C.text4,fontSize:12}}>{(s.aliases||[]).join(', ')||'—'}</td>
        <td style={{padding:'10px 14px'}}><Badge color={s.is_active?C.green:C.text4} light>{s.is_active?'Active':'Inactive'}</Badge></td>
        <td style={{padding:'10px 14px'}}><div style={{display:'flex',gap:4}}>
          <button onClick={()=>onEdit(s)} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="edit" s={14} c={C.text4}/></button>
          <button onClick={()=>onDelete(s.id)} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="trash" s={14} c={C.red}/></button>
        </div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function SkillModal({open,onClose,skill,allCategories,categories,onSave,saving}) {
  const [form,setForm]=useState({name:'',category:'',subcategory:'',description:'',aliases:'',proficiency_levels:['Beginner','Intermediate','Advanced','Expert']});
  useEffect(()=>{if(skill)setForm({name:skill.name,category:skill.category,subcategory:skill.subcategory||'',description:skill.description||'',aliases:(skill.aliases||[]).join(', '),proficiency_levels:skill.proficiency_levels||['Beginner','Intermediate','Advanced','Expert']}); else setForm({name:'',category:'',subcategory:'',description:'',aliases:'',proficiency_levels:['Beginner','Intermediate','Advanced','Expert']});},[skill,open]);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const subcats=form.category?(categories.find(c=>c.category===form.category)?.subcategories||[]):[];
  const LEVELS=['Awareness','Beginner','Intermediate','Advanced','Expert','Master'];
  function handleSave(){onSave({...form,aliases:form.aliases.split(',').map(a=>a.trim()).filter(Boolean)});}
  return <Modal open={open} onClose={onClose} title={skill?'Edit Skill':'Add Skill'} width={500}>
    <FormRow label="Skill Name *"><Input value={form.name} onChange={v=>set('name',v)} placeholder="e.g. React, Financial Modelling"/></FormRow>
    <FormRow label="Category *">
      <Select value={form.category} onChange={v=>set('category',v)} options={allCategories.map(c=>({value:c,label:c}))} placeholder="Select category"/>
    </FormRow>
    <FormRow label="Subcategory">
      <Select value={form.subcategory} onChange={v=>set('subcategory',v)} options={subcats.map(s=>({value:s,label:s}))} placeholder="Select subcategory (optional)"/>
    </FormRow>
    <FormRow label="Aliases (comma-separated)"><Input value={form.aliases} onChange={v=>set('aliases',v)} placeholder="e.g. ReactJS, React.js"/></FormRow>
    <FormRow label="Proficiency Levels">
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {LEVELS.map(l=>{const active=form.proficiency_levels.includes(l); return <button key={l} onClick={()=>set('proficiency_levels',active?form.proficiency_levels.filter(x=>x!==l):[...form.proficiency_levels,l])} style={{padding:'4px 10px',borderRadius:99,border:`1.5px solid ${active?C.accent:C.border}`,background:active?C.accentLight:'white',color:active?C.accent:C.text3,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F}}>{l}</button>;})}
      </div>
    </FormRow>
    <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn onClick={handleSave} variant="primary" disabled={saving||!form.name||!form.category}><Ic n="check" s={13} c="white"/>{saving?'Saving…':skill?'Save Changes':'Add Skill'}</Btn>
    </div>
  </Modal>;
}

// ── AI Discovery & ESCO Expand Taxonomy Modal ─────────────────────────────────
function ExpandTaxonomyModal({open,onClose,environment,onExpanded}) {
  const [tab,setTab]=useState('discover');
  return <Modal open={open} onClose={onClose} title="Expand Taxonomy" width={680}>
    <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,marginBottom:20,marginTop:-4}}>
      {[{id:'discover',label:'✦ AI Discovery',desc:'Find gaps in your data'},{id:'esco',label:'ESCO Library',desc:'13,890+ EU skills'},{id:'csv',label:'CSV Import',desc:'Paste spreadsheet data'}].map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'10px 8px',border:'none',background:'transparent',cursor:'pointer',fontFamily:F,textAlign:'center',borderBottom:tab===t.id?`2.5px solid ${C.accent}`:'2.5px solid transparent'}}>
          <div style={{fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?C.accent:C.text2}}>{t.label}</div>
          <div style={{fontSize:11,color:C.text4}}>{t.desc}</div>
        </button>
      ))}
    </div>
    {tab==='discover'&&<AiDiscoveryPanel environment={environment} onApplied={onExpanded}/>}
    {tab==='esco'&&<EscoImportPanel environment={environment} onImported={onExpanded}/>}
    {tab==='csv'&&<CsvImportPanel environment={environment} onImported={onExpanded}/>}
  </Modal>;
}

function AiDiscoveryPanel({environment,onApplied}) {
  const [running,setRunning]=useState(false); const [source,setSource]=useState('all'); const [result,setResult]=useState(null); const [selected,setSelected]=useState(new Set()); const [applying,setApplying]=useState(false); const [applied,setApplied]=useState(0);
  const envId=environment?.id;
  async function handleDiscover(){setRunning(true);setResult(null);setSelected(new Set());setApplied(0);const r=await api.post('/skills-import/discover',{environment_id:envId,source});setRunning(false);if(r.error){window.__toast?.alert(r.error);return;}setResult(r);setSelected(new Set((r.suggestions||[]).map((s,i)=>s.confidence==='high'?i:-1).filter(i=>i>=0)));}
  async function handleApply(){if(!selected.size)return;setApplying(true);const toAdd=[...selected].map(i=>result.suggestions[i]);const r=await api.post('/skills-import/discover/apply',{skills:toAdd,environment_id:envId});setApplying(false);if(r.error){window.__toast?.alert(r.error);return;}setApplied(r.added);setResult(prev=>({...prev,suggestions:prev.suggestions.filter((_,i)=>!selected.has(i))}));setSelected(new Set());if(onApplied)onApplied();}
  const CONF_COLOR={high:C.green,medium:C.amber,low:C.text4};
  return <div>
    <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'flex-start'}}>
      <div style={{flex:1,minWidth:260}}>
        <div style={{fontSize:14,fontWeight:700,color:C.text1,fontFamily:F,marginBottom:4}}>AI Skill Discovery</div>
        <div style={{fontSize:13,color:C.text3,fontFamily:F,lineHeight:1.5}}>Claude analyses your job descriptions and candidate records to find skills not in your taxonomy.</div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
        <Select value={source} onChange={setSource} options={[{value:'all',label:'Jobs + Candidates'},{value:'jobs',label:'Jobs only'},{value:'candidates',label:'Candidates only'}]} style={{width:160}}/>
        <Btn onClick={handleDiscover} disabled={running} variant="primary"><Ic n="zap" s={13} c="white"/>{running?'Analysing…':'Discover Skills'}</Btn>
      </div>
    </div>
    {running&&<div style={{padding:20,background:C.accentLight,borderRadius:12,textAlign:'center',fontFamily:F}}><div style={{fontSize:13,color:C.accent,fontWeight:600,marginBottom:4}}>Claude is reading your records…</div><div style={{fontSize:12,color:C.text3}}>15–30 seconds depending on record count.</div></div>}
    {result&&!running&&<div>
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        {[{label:'Analysed',val:result.analysed,c:C.accent},{label:'Suggestions',val:result.suggestions?.length||0,c:C.purple},{label:'Selected',val:selected.size,c:C.amber}].map(s=><div key={s.label} style={{padding:'10px 14px',background:'white',borderRadius:10,border:`1.5px solid ${C.border}`,textAlign:'center',minWidth:90}}><div style={{fontSize:20,fontWeight:800,color:s.c,fontFamily:F}}>{s.val}</div><div style={{fontSize:11,color:C.text3,fontFamily:F}}>{s.label}</div></div>)}
      </div>
      {result.suggestions?.length===0?<div style={{textAlign:'center',padding:24,color:C.text3,fontFamily:F}}>No new skills found — taxonomy already covers your records!</div>:<>
        <div style={{display:'flex',gap:6,marginBottom:10}}><Btn size="sm" onClick={()=>setSelected(new Set(result.suggestions.map((_,i)=>i)))}>Select all</Btn><Btn size="sm" onClick={()=>setSelected(new Set())}>Clear</Btn></div>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
          {result.suggestions.map((s,i)=>{const isSel=selected.has(i); return <div key={i} onClick={()=>setSelected(prev=>{const n=new Set(prev);n.has(i)?n.delete(i):n.add(i);return n;})} style={{padding:'10px 12px',background:isSel?C.accentLight:'white',borderRadius:10,border:`1.5px solid ${isSel?C.accent:C.border}`,cursor:'pointer',display:'flex',gap:8,alignItems:'flex-start'}}>
            <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${isSel?C.accent:C.border}`,background:isSel?C.accent:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{isSel&&<Ic n="check" s={10} c="white"/>}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:2}}><span style={{fontSize:13,fontWeight:700,color:C.text1,fontFamily:F}}>{s.name}</span><Badge color={catColor(s.category)||C.accent} light>{s.category}</Badge>{s.subcategory&&<span style={{fontSize:11,color:C.text3,fontFamily:F}}>{s.subcategory}</span>}<span style={{fontSize:10,padding:'1px 6px',borderRadius:99,background:`${CONF_COLOR[s.confidence]}18`,color:CONF_COLOR[s.confidence],fontWeight:700,fontFamily:F}}>{s.confidence}</span></div>
              {s.description&&<div style={{fontSize:12,color:C.text2,fontFamily:F,marginBottom:2}}>{s.description}</div>}
              {s.seen_in?.length>0&&<div style={{fontSize:11,color:C.text4,fontFamily:F}}>Seen in: {s.seen_in.join(', ')}</div>}
            </div>
          </div>;})}
        </div>
        {selected.size>0&&<Btn onClick={handleApply} disabled={applying} variant="primary" style={{width:'100%',justifyContent:'center'}}><Ic n="plus" s={14} c="white"/>{applying?'Adding…':`Add ${selected.size} skill${selected.size!==1?'s':''}`}</Btn>}
        {applied>0&&<div style={{marginTop:10,padding:'10px 14px',background:'#F0FDF4',borderRadius:10,border:'1px solid #BBF7D0',fontSize:13,color:C.green,fontFamily:F,fontWeight:600}}>✓ {applied} skill{applied!==1?'s':''} added. Run "Embed skills" to activate similarity search.</div>}
      </>}
    </div>}
  </div>;
}

function EscoImportPanel({environment,onImported}) {
  const [q,setQ]=useState(''); const [results,setResults]=useState([]); const [searching,setSearching]=useState(false); const [selected,setSelected]=useState(new Set()); const [catOverride,setCatOverride]=useState(''); const [importing,setImporting]=useState(false); const [importResult,setImportResult]=useState(null); const [escoError,setEscoError]=useState(null);
  const envId=environment?.id; const CATS=['Technology','Business','Design','Soft Skills','Languages','Certifications','Other'];
  async function handleSearch(){if(!q.trim())return;setSearching(true);setResults([]);setEscoError(null);setSelected(new Set());const r=await api.get(`/skills-import/esco/search?q=${encodeURIComponent(q)}&limit=30`);setSearching(false);if(r.error&&r.fallback){setEscoError('ESCO API unavailable. Try CSV import.');return;}if(r.error){setEscoError(r.error);return;}setResults(r.hits||[]);}
  async function handleImport(){if(!selected.size)return;setImporting(true);const skills=[...selected].map(i=>({...results[i],category:catOverride||undefined}));const r=await api.post('/skills-import/esco/import',{skills,environment_id:envId,category_override:catOverride||null});setImporting(false);setImportResult(r);setSelected(new Set());if(onImported)onImported();}
  return <div>
    <div style={{marginBottom:14}}><div style={{fontSize:14,fontWeight:700,color:C.text1,fontFamily:F,marginBottom:4}}>ESCO Taxonomy Import</div><div style={{fontSize:13,color:C.text3,fontFamily:F,lineHeight:1.5}}>Search the EU's official Skills framework (13,890+ skills). Free, no API key required.</div></div>
    {escoError&&<div style={{padding:'10px 14px',background:'#FEF2F2',borderRadius:10,border:'1px solid #FECACA',fontSize:13,color:C.red,fontFamily:F,marginBottom:12}}>{escoError}</div>}
    <div style={{display:'flex',gap:8,marginBottom:12}}>
      <div style={{position:'relative',flex:1}}><Ic n="search" s={13} c={C.text4} style={{position:'absolute',left:9,top:8}}/><Input value={q} onChange={setQ} placeholder="Search ESCO… e.g. 'machine learning', 'financial analysis'" style={{paddingLeft:30}} onKeyDown={e=>{if(e.key==='Enter')handleSearch();}}/></div>
      <Btn onClick={handleSearch} disabled={searching||!q.trim()} variant="primary">{searching?'Searching…':'Search ESCO'}</Btn>
    </div>
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
      {['python','data analysis','project management','machine learning','negotiation','cybersecurity','agile'].map(qk=><button key={qk} onClick={()=>setQ(qk)} style={{padding:'3px 9px',borderRadius:99,border:`1.5px solid ${C.border}`,background:'white',fontSize:12,color:C.text2,cursor:'pointer',fontFamily:F}}>{qk}</button>)}
    </div>
    {results.length>0&&<div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
        <span style={{fontSize:13,color:C.text3,fontFamily:F,flex:1}}>{results.length} results · {selected.size} selected</span>
        <Select value={catOverride} onChange={setCatOverride} options={CATS.map(c=>({value:c,label:c}))} placeholder="Override category" style={{width:180}}/>
        <Btn size="sm" onClick={()=>setSelected(new Set(results.map((_,i)=>i)))}>All</Btn><Btn size="sm" onClick={()=>setSelected(new Set())}>Clear</Btn>
      </div>
      <div style={{background:'white',borderRadius:12,border:`1.5px solid ${C.border}`,overflow:'hidden',marginBottom:12,maxHeight:300,overflowY:'auto'}}>
        {results.map((s,i)=>{const isSel=selected.has(i); return <div key={i} onClick={()=>setSelected(prev=>{const n=new Set(prev);n.has(i)?n.delete(i):n.add(i);return n;})} style={{padding:'9px 12px',display:'flex',gap:8,alignItems:'flex-start',borderBottom:`1px solid ${C.border}`,cursor:'pointer',background:isSel?C.accentLight:'white'}}>
          <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${isSel?C.accent:C.border}`,background:isSel?C.accent:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{isSel&&<Ic n="check" s={10} c="white"/>}</div>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:C.text1,fontFamily:F}}>{s.preferred_label||s.name}</div>{s.description&&<div style={{fontSize:12,color:C.text3,fontFamily:F,marginTop:1}}>{s.description.slice(0,100)}{s.description.length>100?'…':''}</div>}</div>
        </div>;})}
      </div>
      {selected.size>0&&<Btn onClick={handleImport} disabled={importing} variant="primary" style={{width:'100%',justifyContent:'center'}}><Ic n="download" s={14} c="white"/>{importing?'Importing…':`Import ${selected.size} skills from ESCO`}</Btn>}
    </div>}
    {importResult&&<div style={{marginTop:10,padding:'10px 14px',background:'#F0FDF4',borderRadius:10,border:'1px solid #BBF7D0',fontSize:13,color:C.green,fontFamily:F,fontWeight:600}}>✓ {importResult.imported} imported · {importResult.skipped} already existed</div>}
  </div>;
}

function CsvImportPanel({environment,onImported}) {
  const [text,setText]=useState(''); const [preview,setPreview]=useState([]); const [importing,setImporting]=useState(false); const [result,setResult]=useState(null);
  const envId=environment?.id;
  const TMPL=`name,category,subcategory,aliases,description\nDatabricks,Technology,Data & AI,"Spark platform",Unified analytics\nRevenue Operations,Business,Sales,"RevOps",Aligning GTM teams`;
  function parseRows(raw){const lines=raw.trim().split('\n');if(lines.length<2)return[];const hdr=lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/"/g,''));return lines.slice(1).map(line=>{const cols=line.match(/(".*?"|[^,]+)/g)||[];const obj={};hdr.forEach((h,i)=>{obj[h]=(cols[i]||'').replace(/^"|"$/g,'').trim();});return obj;}).filter(r=>r.name);}
  function handleText(val){setText(val);setPreview(parseRows(val).slice(0,5));setResult(null);}
  async function handleImport(){const rows=parseRows(text);if(!rows.length)return;setImporting(true);const r=await api.post('/skills-import/bulk-csv',{rows,environment_id:envId});setImporting(false);setResult(r);if(r.imported>0&&onImported)onImported();}
  return <div>
    <div style={{marginBottom:12}}><div style={{fontSize:14,fontWeight:700,color:C.text1,fontFamily:F,marginBottom:4}}>CSV Import</div><div style={{fontSize:13,color:C.text3,fontFamily:F}}>Paste CSV rows. Required: <code style={{background:C.bg,padding:'1px 4px',borderRadius:4}}>name</code>. Optional: category, subcategory, aliases, description.</div></div>
    <div style={{display:'flex',justifyContent:'flex-end',marginBottom:4}}><Btn size="sm" onClick={()=>handleText(TMPL)}>Load example</Btn></div>
    <textarea value={text} onChange={e=>handleText(e.target.value)} placeholder="name,category,subcategory,aliases,description" rows={6} style={{width:'100%',fontFamily:'ui-monospace,monospace',fontSize:12,padding:'10px 12px',borderRadius:10,border:`1.5px solid ${C.border}`,outline:'none',resize:'vertical',boxSizing:'border-box',color:C.text1}}/>
    {preview.length>0&&<div style={{marginBottom:10,marginTop:6}}>
      <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4,fontFamily:F}}>Preview</div>
      <div style={{background:'white',borderRadius:8,border:`1px solid ${C.border}`,overflow:'hidden'}}>{preview.map((r,i)=><div key={i} style={{padding:'7px 12px',borderBottom:i<preview.length-1?`1px solid ${C.border}`:'none',display:'flex',gap:8,alignItems:'center'}}><span style={{fontSize:13,fontWeight:700,color:C.text1,fontFamily:F,flex:1}}>{r.name}</span>{r.category&&<Badge color={catColor(r.category)} light>{r.category}</Badge>}</div>)}</div>
    </div>}
    <div style={{display:'flex',gap:8}}><Btn onClick={handleImport} disabled={importing||!text.trim()} variant="primary"><Ic n="download" s={13} c="white"/>{importing?'Importing…':`Import ${parseRows(text).length} skills`}</Btn>{text&&<Btn onClick={()=>{setText('');setPreview([]);setResult(null);}}>Clear</Btn>}</div>
    {result&&<div style={{marginTop:10,padding:'10px 14px',background:'#F0FDF4',borderRadius:10,border:'1px solid #BBF7D0',fontSize:13,color:C.green,fontFamily:F,fontWeight:600}}>✓ {result.imported} added · {result.skipped} skipped</div>}
  </div>;
}

// ── Competencies Section ──────────────────────────────────────────────────────
function CompetenciesSection({environment}) {
  const [comps,setComps]=useState([]); const [loading,setLoading]=useState(true); const [modal,setModal]=useState(null); const [saving,setSaving]=useState(false);
  const envId=environment?.id;
  const load=useCallback(async()=>{if(!envId)return;setLoading(true);const c=await api.get(`/enterprise/competencies?environment_id=${envId}`);setComps(Array.isArray(c)?c:[]);setLoading(false);},[envId]);
  useEffect(()=>{load();},[load]);
  async function handleSave(form){setSaving(true);if(modal.mode==='edit')await api.patch(`/enterprise/competencies/${modal.comp.id}`,{...form,environment_id:envId});else await api.post('/enterprise/competencies',{...form,environment_id:envId});setSaving(false);setModal(null);load();}
  return <div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
      <div><div style={{fontSize:18,fontWeight:800,color:C.text1,fontFamily:F}}>Competency Frameworks</div><div style={{fontSize:13,color:C.text3,fontFamily:F,marginTop:2}}>{comps.length} competencies</div></div>
      <Btn onClick={()=>setModal({mode:'create',comp:null})} variant="primary"><Ic n="plus" s={13} c="white"/>Add Competency</Btn>
    </div>
    {loading?<div style={{textAlign:'center',padding:40,color:C.text3,fontFamily:F}}>Loading…</div>:comps.length===0?<EmptyState icon="award" title="No competencies yet" subtitle="Define competencies used in assessments and interviews." action={<Btn onClick={()=>setModal({mode:'create',comp:null})} variant="primary">Add First</Btn>}/>:
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
      {comps.map(c=><div key={c.id} style={{background:'white',borderRadius:12,border:`1.5px solid ${C.border}`,padding:16}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
          <div><div style={{fontSize:14,fontWeight:700,color:C.text1,fontFamily:F}}>{c.name}</div><div style={{fontSize:11,color:C.text3,fontFamily:F}}>{c.category}</div></div>
          <div style={{display:'flex',gap:4}}><button onClick={()=>setModal({mode:'edit',comp:c})} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="edit" s={13} c={C.text4}/></button><button onClick={async()=>{if(confirm('Delete?')){await api.delete(`/enterprise/competencies/${c.id}`);load();}}} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="trash" s={13} c={C.red}/></button></div>
        </div>
        {c.description&&<div style={{fontSize:12,color:C.text3,fontFamily:F,marginBottom:8}}>{c.description}</div>}
        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{(c.levels||[]).map(l=><span key={l.level} style={{fontSize:10,padding:'2px 7px',borderRadius:99,background:C.accentLight,color:C.accent,fontWeight:700,fontFamily:F}}>{l.label}</span>)}</div>
      </div>)}
    </div>}
    {modal&&<CompModal open comp={modal.comp} onSave={handleSave} saving={saving} onClose={()=>setModal(null)}/>}
  </div>;
}
function CompModal({open,onClose,comp,onSave,saving}) {
  const [form,setForm]=useState({name:'',description:'',category:'General',levels:[{level:1,label:'Developing',description:''},{level:2,label:'Capable',description:''},{level:3,label:'Proficient',description:''},{level:4,label:'Expert',description:''},{level:5,label:'Mastery',description:''}]});
  useEffect(()=>{if(comp)setForm({name:comp.name,description:comp.description||'',category:comp.category||'General',levels:comp.levels||[]});else setForm({name:'',description:'',category:'General',levels:[{level:1,label:'Developing',description:''},{level:2,label:'Capable',description:''},{level:3,label:'Proficient',description:''},{level:4,label:'Expert',description:''},{level:5,label:'Mastery',description:''}]});},[comp,open]);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const setLevel=(i,k,v)=>setForm(f=>({...f,levels:f.levels.map((l,idx)=>idx===i?{...l,[k]:v}:l)}));
  return <Modal open={open} onClose={onClose} title={comp?'Edit Competency':'Add Competency'} width={520}>
    <FormRow label="Name *"><Input value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Strategic Thinking"/></FormRow>
    <FormRow label="Category"><Select value={form.category} onChange={v=>set('category',v)} options={['Leadership','Communication','Technical','Problem Solving','Collaboration','General'].map(c=>({value:c,label:c}))}/></FormRow>
    <FormRow label="Description"><Input value={form.description} onChange={v=>set('description',v)} placeholder="What this competency measures…"/></FormRow>
    <Label>Proficiency Levels</Label>
    {form.levels.map((l,i)=><div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}><span style={{fontSize:11,fontWeight:700,color:C.accent,width:50,fontFamily:F}}>Lv {l.level}</span><Input value={l.label} onChange={v=>setLevel(i,'label',v)} placeholder="Label" style={{width:110}}/><Input value={l.description} onChange={v=>setLevel(i,'description',v)} placeholder="Description"/></div>)}
    <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:14}}><Btn onClick={onClose}>Cancel</Btn><Btn onClick={()=>onSave(form)} variant="primary" disabled={saving||!form.name}><Ic n="check" s={13} c="white"/>{saving?'Saving…':'Save'}</Btn></div>
  </Modal>;
}

// ── Job Levels ─────────────────────────────────────────────────────────────────
function JobLevelsSection({environment}) {
  const [levels,setLevels]=useState([]); const [loading,setLoading]=useState(true); const [modal,setModal]=useState(null); const [saving,setSaving]=useState(false); const [seeding,setSeeding]=useState(false);
  const envId=environment?.id;
  const load=useCallback(async()=>{if(!envId)return;setLoading(true);const l=await api.get(`/enterprise/job-levels?environment_id=${envId}`);setLevels(Array.isArray(l)?l:[]);setLoading(false);},[envId]);
  useEffect(()=>{load();},[load]);
  async function handleSeed(){setSeeding(true);await api.post('/enterprise/job-levels/seed',{environment_id:envId});setSeeding(false);load();}
  async function handleSave(form){setSaving(true);if(modal.mode==='edit')await api.patch(`/enterprise/job-levels/${modal.level.id}`,{...form,environment_id:envId});else await api.post('/enterprise/job-levels',{...form,environment_id:envId});setSaving(false);setModal(null);load();}
  const groups=[{label:'Individual Contributors',prefix:'IC'},{label:'Management',prefix:'M'},{label:'Executive',prefix:'E'}];
  return <div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
      <div><div style={{fontSize:18,fontWeight:800,color:C.text1,fontFamily:F}}>Job Levels & Grades</div><div style={{fontSize:13,color:C.text3,fontFamily:F,marginTop:2}}>{levels.length} levels</div></div>
      <div style={{display:'flex',gap:8}}>{levels.length===0&&<Btn onClick={handleSeed} disabled={seeding} variant="green"><Ic n="download" s={13} c={C.green}/>{seeding?'Loading…':'Load Defaults'}</Btn>}<Btn onClick={()=>setModal({mode:'create',level:null})} variant="primary"><Ic n="plus" s={13} c="white"/>Add Level</Btn></div>
    </div>
    {loading?<div style={{textAlign:'center',padding:40,color:C.text3,fontFamily:F}}>Loading…</div>:levels.length===0?<EmptyState icon="briefcase" title="No job levels" subtitle="Load the default IC → Manager → Executive ladder or build your own." action={<Btn onClick={handleSeed} disabled={seeding} variant="primary">{seeding?'Loading…':'Load Defaults'}</Btn>}/>:
    groups.map(g=>{const items=levels.filter(l=>l.code?.startsWith(g.prefix));if(!items.length)return null;return <div key={g.prefix} style={{marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8,fontFamily:F}}>{g.label}</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>{items.map(l=><div key={l.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'white',borderRadius:10,border:`1.5px solid ${C.border}`}}>
        <div style={{width:36,height:36,borderRadius:8,background:C.accentLight,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{fontSize:11,fontWeight:800,color:C.accent,fontFamily:F}}>{l.code}</span></div>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.text1,fontFamily:F}}>{l.name}</div>{l.description&&<div style={{fontSize:11,color:C.text3,fontFamily:F}}>{l.description}</div>}</div>
        <button onClick={()=>setModal({mode:'edit',level:l})} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="edit" s={13} c={C.text4}/></button>
        <button onClick={async()=>{if(confirm('Delete?')){await api.delete(`/enterprise/job-levels/${l.id}`);load();}}} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="trash" s={13} c={C.red}/></button>
      </div>)}</div>
    </div>;})}
    {modal&&<JobLevelModal open level={modal.level} onSave={handleSave} saving={saving} onClose={()=>setModal(null)}/>}
  </div>;
}
function JobLevelModal({open,onClose,level,onSave,saving}) {
  const [form,setForm]=useState({code:'',name:'',description:'',rank:0});
  useEffect(()=>{if(level)setForm({code:level.code||'',name:level.name||'',description:level.description||'',rank:level.rank||0});else setForm({code:'',name:'',description:'',rank:0});},[level,open]);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return <Modal open={open} onClose={onClose} title={level?'Edit Level':'Add Level'} width={400}>
    <FormRow label="Code *"><Input value={form.code} onChange={v=>set('code',v)} placeholder="e.g. IC3, M1, E2"/></FormRow>
    <FormRow label="Name *"><Input value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Senior, Manager, VP"/></FormRow>
    <FormRow label="Description"><Input value={form.description} onChange={v=>set('description',v)} placeholder="Short description"/></FormRow>
    <FormRow label="Sort Order"><Input value={String(form.rank)} onChange={v=>set('rank',Number(v))} placeholder="0"/></FormRow>
    <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><Btn onClick={onClose}>Cancel</Btn><Btn onClick={()=>onSave(form)} variant="primary" disabled={saving||!form.code||!form.name}><Ic n="check" s={13} c="white"/>{saving?'Saving…':'Save'}</Btn></div>
  </Modal>;
}

// ── Locations & Comp Bands ────────────────────────────────────────────────────
const TIMEZONES=['UTC','America/New_York','America/Los_Angeles','America/Toronto','America/Sao_Paulo','Europe/London','Europe/Paris','Europe/Berlin','Europe/Amsterdam','Africa/Cairo','Asia/Dubai','Asia/Riyadh','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Asia/Shanghai','Australia/Sydney'];

function LocationsSection({environment}) {
  const [locs,setLocs]=useState([]); const [loading,setLoading]=useState(true); const [modal,setModal]=useState(null); const [saving,setSaving]=useState(false);
  const envId=environment?.id;
  const load=useCallback(async()=>{if(!envId)return;setLoading(true);const l=await api.get(`/enterprise/locations?environment_id=${envId}`);setLocs(Array.isArray(l)?l:[]);setLoading(false);},[envId]);
  useEffect(()=>{load();},[load]);
  async function handleSave(form){setSaving(true);if(modal.mode==='edit')await api.patch(`/enterprise/locations/${modal.loc.id}`,{...form,environment_id:envId});else await api.post('/enterprise/locations',{...form,environment_id:envId});setSaving(false);setModal(null);load();}
  return <div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
      <div><div style={{fontSize:18,fontWeight:800,color:C.text1,fontFamily:F}}>Locations & Offices</div><div style={{fontSize:13,color:C.text3,fontFamily:F,marginTop:2}}>{locs.length} locations</div></div>
      <Btn onClick={()=>setModal({mode:'create',loc:null})} variant="primary"><Ic n="plus" s={13} c="white"/>Add Location</Btn>
    </div>
    {loading?<div style={{textAlign:'center',padding:40,color:C.text3,fontFamily:F}}>Loading…</div>:locs.length===0?<EmptyState icon="map" title="No locations yet" subtitle="Add offices and remote locations used for candidate and job fields." action={<Btn onClick={()=>setModal({mode:'create',loc:null})} variant="primary">Add First</Btn>}/>:
    <div style={{background:'white',borderRadius:14,border:`1.5px solid ${C.border}`,overflow:'hidden'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontFamily:F,fontSize:13}}>
        <thead><tr style={{background:C.bg}}>{['Name','City','Country','Region','Timezone','Type',''].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
        <tbody>{locs.map(l=><tr key={l.id} style={{borderBottom:`1px solid ${C.border}`}}>
          <td style={{padding:'10px 14px',fontWeight:700,color:C.text1}}>{l.name}</td><td style={{padding:'10px 14px',color:C.text2}}>{l.city||'—'}</td><td style={{padding:'10px 14px',color:C.text2}}>{l.country||'—'}</td><td style={{padding:'10px 14px',color:C.text3}}>{l.region||'—'}</td><td style={{padding:'10px 14px',color:C.text3,fontSize:12}}>{l.timezone}</td>
          <td style={{padding:'10px 14px'}}><Badge color={l.is_remote?C.purple:C.green} light>{l.is_remote?'Remote':'Office'}</Badge></td>
          <td style={{padding:'10px 14px'}}><div style={{display:'flex',gap:4}}><button onClick={()=>setModal({mode:'edit',loc:l})} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="edit" s={14} c={C.text4}/></button><button onClick={async()=>{if(confirm('Delete?')){await api.delete(`/enterprise/locations/${l.id}`);load();}}} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="trash" s={14} c={C.red}/></button></div></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {modal&&<LocModal open loc={modal.loc} onSave={handleSave} saving={saving} onClose={()=>setModal(null)}/>}
  </div>;
}
function LocModal({open,onClose,loc,onSave,saving}) {
  const [form,setForm]=useState({name:'',city:'',country:'',region:'',timezone:'Asia/Dubai',is_remote:false,address:''});
  useEffect(()=>{if(loc)setForm({name:loc.name||'',city:loc.city||'',country:loc.country||'',region:loc.region||'',timezone:loc.timezone||'Asia/Dubai',is_remote:!!loc.is_remote,address:loc.address||''});else setForm({name:'',city:'',country:'',region:'',timezone:'Asia/Dubai',is_remote:false,address:''});},[loc,open]);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return <Modal open={open} onClose={onClose} title={loc?'Edit Location':'Add Location'} width={450}>
    <FormRow label="Name *"><Input value={form.name} onChange={v=>set('name',v)} placeholder="e.g. Dubai HQ, London Office"/></FormRow>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><FormRow label="City"><Input value={form.city} onChange={v=>set('city',v)} placeholder="e.g. Dubai"/></FormRow><FormRow label="Country"><Input value={form.country} onChange={v=>set('country',v)} placeholder="e.g. UAE"/></FormRow></div>
    <FormRow label="Region"><Input value={form.region} onChange={v=>set('region',v)} placeholder="e.g. MENA, EMEA, APAC"/></FormRow>
    <FormRow label="Timezone"><Select value={form.timezone} onChange={v=>set('timezone',v)} options={TIMEZONES.map(t=>({value:t,label:t}))}/></FormRow>
    <FormRow label="Type"><div style={{display:'flex',gap:8}}>{[{label:'Office',val:false},{label:'Remote',val:true}].map(o=><button key={String(o.val)} onClick={()=>set('is_remote',o.val)} style={{padding:'7px 14px',borderRadius:8,border:`1.5px solid ${form.is_remote===o.val?C.accent:C.border}`,background:form.is_remote===o.val?C.accentLight:'white',color:form.is_remote===o.val?C.accent:C.text2,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:F}}>{o.label}</button>)}</div></FormRow>
    <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><Btn onClick={onClose}>Cancel</Btn><Btn onClick={()=>onSave(form)} variant="primary" disabled={saving||!form.name}><Ic n="check" s={13} c="white"/>{saving?'Saving…':'Save'}</Btn></div>
  </Modal>;
}

// ── Comp Bands ────────────────────────────────────────────────────────────────
function CompBandsSection({environment}) {
  const [bands,setBands]=useState([]); const [levels,setLevels]=useState([]); const [locs,setLocs]=useState([]); const [loading,setLoading]=useState(true); const [modal,setModal]=useState(null); const [saving,setSaving]=useState(false);
  const envId=environment?.id;
  const load=useCallback(async()=>{if(!envId)return;setLoading(true);const [b,l,o]=await Promise.all([api.get(`/enterprise/comp-bands?environment_id=${envId}`),api.get(`/enterprise/job-levels?environment_id=${envId}`),api.get(`/enterprise/locations?environment_id=${envId}`)]);setBands(Array.isArray(b)?b:[]);setLevels(Array.isArray(l)?l:[]);setLocs(Array.isArray(o)?o:[]);setLoading(false);},[envId]);
  useEffect(()=>{load();},[load]);
  async function handleSave(form){setSaving(true);if(modal.mode==='edit')await api.patch(`/enterprise/comp-bands/${modal.band.id}`,{...form,environment_id:envId});else await api.post('/enterprise/comp-bands',{...form,environment_id:envId});setSaving(false);setModal(null);load();}
  const getLevelName=id=>levels.find(l=>l.id===id)?.name||'—'; const getLevelCode=id=>levels.find(l=>l.id===id)?.code||'—'; const getLocName=id=>id?locs.find(l=>l.id===id)?.name||'—':'Global';
  return <div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
      <div><div style={{fontSize:18,fontWeight:800,color:C.text1,fontFamily:F}}>Compensation Bands</div><div style={{fontSize:13,color:C.text3,fontFamily:F,marginTop:2}}>{bands.length} bands</div></div>
      <Btn onClick={()=>setModal({mode:'create',band:null})} variant="primary" disabled={levels.length===0}><Ic n="plus" s={13} c="white"/>Add Band</Btn>
    </div>
    {levels.length===0&&!loading&&<div style={{padding:'10px 14px',borderRadius:10,background:'#FFF7ED',border:'1.5px solid #FED7AA',fontSize:13,color:'#92400E',fontFamily:F,marginBottom:14}}>Set up Job Levels first before adding compensation bands.</div>}
    {loading?<div style={{textAlign:'center',padding:40,color:C.text3,fontFamily:F}}>Loading…</div>:bands.length===0?<EmptyState icon="dollar" title="No compensation bands" subtitle="Define salary ranges per job level and location." action={levels.length>0?<Btn onClick={()=>setModal({mode:'create',band:null})} variant="primary">Add First Band</Btn>:null}/>:
    <div style={{background:'white',borderRadius:14,border:`1.5px solid ${C.border}`,overflow:'hidden'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontFamily:F,fontSize:13}}>
        <thead><tr style={{background:C.bg}}>{['Level','Location','Currency','Min','Mid','Max','Bonus',''].map(h=><th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
        <tbody>{bands.map(b=><tr key={b.id} style={{borderBottom:`1px solid ${C.border}`}}>
          <td style={{padding:'10px 14px'}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:11,fontWeight:800,color:C.accent,background:C.accentLight,padding:'2px 6px',borderRadius:4}}>{getLevelCode(b.job_level_id)}</span><span style={{color:C.text1,fontWeight:600}}>{getLevelName(b.job_level_id)}</span></div></td>
          <td style={{padding:'10px 14px',color:C.text2}}>{getLocName(b.location_id)}</td><td style={{padding:'10px 14px',color:C.text3}}>{b.currency}</td>
          <td style={{padding:'10px 14px',color:C.green,fontWeight:600}}>{Number(b.min_salary).toLocaleString()}</td><td style={{padding:'10px 14px',fontWeight:600,color:C.text1}}>{Number(b.mid_salary).toLocaleString()}</td><td style={{padding:'10px 14px',color:C.red,fontWeight:600}}>{Number(b.max_salary).toLocaleString()}</td>
          <td style={{padding:'10px 14px',color:C.text3}}>{b.bonus_target_pct}%</td>
          <td style={{padding:'10px 14px'}}><div style={{display:'flex',gap:4}}><button onClick={()=>setModal({mode:'edit',band:b})} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="edit" s={14} c={C.text4}/></button><button onClick={async()=>{if(confirm('Delete?')){await api.delete(`/enterprise/comp-bands/${b.id}`);load();}}} style={{background:'none',border:'none',cursor:'pointer'}}><Ic n="trash" s={14} c={C.red}/></button></div></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {modal&&<CompBandModal open band={modal.band} levels={levels} locations={locs} onSave={handleSave} saving={saving} onClose={()=>setModal(null)}/>}
  </div>;
}
function CompBandModal({open,onClose,band,levels,locations,onSave,saving}) {
  const [form,setForm]=useState({job_level_id:'',location_id:'',currency:'AED',min_salary:'',mid_salary:'',max_salary:'',bonus_target_pct:0,effective_date:''});
  useEffect(()=>{if(band)setForm({job_level_id:band.job_level_id,location_id:band.location_id||'',currency:band.currency,min_salary:band.min_salary,mid_salary:band.mid_salary,max_salary:band.max_salary,bonus_target_pct:band.bonus_target_pct||0,effective_date:band.effective_date||''});else setForm({job_level_id:levels[0]?.id||'',location_id:'',currency:'AED',min_salary:'',mid_salary:'',max_salary:'',bonus_target_pct:0,effective_date:new Date().toISOString().slice(0,10)});},[band,open]);
  const set=(k,v)=>setForm(f=>{const next={...f,[k]:v};if((k==='min_salary'||k==='max_salary')&&next.min_salary&&next.max_salary)next.mid_salary=Math.round((Number(next.min_salary)+Number(next.max_salary))/2);return next;});
  const CURRS=['AED','USD','GBP','EUR','SAR','QAR','KWD','INR','SGD','AUD'];
  return <Modal open={open} onClose={onClose} title={band?'Edit Band':'Add Compensation Band'} width={480}>
    <FormRow label="Job Level *"><Select value={form.job_level_id} onChange={v=>set('job_level_id',v)} options={levels.map(l=>({value:l.id,label:`${l.code} — ${l.name}`}))} placeholder="Select level"/></FormRow>
    <FormRow label="Location"><Select value={form.location_id} onChange={v=>set('location_id',v)} options={locations.map(l=>({value:l.id,label:l.name}))} placeholder="Global"/></FormRow>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
      <FormRow label="Currency"><Select value={form.currency} onChange={v=>set('currency',v)} options={CURRS.map(c=>({value:c,label:c}))}/></FormRow>
      <FormRow label="Effective Date"><input type="date" value={form.effective_date} onChange={e=>set('effective_date',e.target.value)} style={{fontFamily:F,fontSize:13,padding:'7px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,outline:'none',width:'100%',boxSizing:'border-box'}}/></FormRow>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
      <FormRow label="Min *"><Input value={String(form.min_salary)} onChange={v=>set('min_salary',v)} placeholder="80000"/></FormRow>
      <FormRow label="Mid"><Input value={String(form.mid_salary)} onChange={v=>set('mid_salary',v)} placeholder="Auto"/></FormRow>
      <FormRow label="Max *"><Input value={String(form.max_salary)} onChange={v=>set('max_salary',v)} placeholder="120000"/></FormRow>
    </div>
    <FormRow label="Bonus Target (%)"><Input value={String(form.bonus_target_pct)} onChange={v=>set('bonus_target_pct',Number(v))} placeholder="0"/></FormRow>
    <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><Btn onClick={onClose}>Cancel</Btn><Btn onClick={()=>onSave(form)} variant="primary" disabled={saving||!form.job_level_id||!form.min_salary||!form.max_salary}><Ic n="check" s={13} c="white"/>{saving?'Saving…':'Save'}</Btn></div>
  </Modal>;
}

// ── Main Export ───────────────────────────────────────────────────────────────
const SECTIONS = [
  { id:'skills',       label:'Skills Ontology',        icon:'layers',    description:'120+ skills, embeddings, relationships' },
  { id:'competencies', label:'Competency Frameworks',  icon:'award',     description:'Define competencies and proficiency levels' },
  { id:'job-levels',   label:'Job Levels & Grades',    icon:'briefcase', description:'IC, management and executive ladder' },
  { id:'locations',    label:'Locations & Offices',    icon:'map',       description:'Global office directory with timezones' },
  { id:'comp-bands',   label:'Compensation Bands',     icon:'dollar',    description:'Salary ranges per level and location' },
];

export default function EnterpriseSettings({ environment }) {
  const [active, setActive] = useState('skills');
  return (
    <div style={{ display:'flex', gap:0, minHeight:500 }}>
      {/* Sub-nav */}
      <div style={{ width:220, flexShrink:0, borderRight:`1px solid ${C.border}`, paddingRight:16, marginRight:28 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.text4, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10, fontFamily:F }}>Enterprise Settings</div>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)} style={{
            width:'100%', textAlign:'left', padding:'9px 12px', borderRadius:8, border:'none',
            cursor:'pointer', fontFamily:F, marginBottom:2,
            background: active===s.id ? C.accentLight : 'transparent',
            color: active===s.id ? C.accent : C.text2,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Ic n={s.icon} s={14} c={active===s.id ? C.accent : C.text3}/>
              <span style={{ fontSize:13, fontWeight:active===s.id?700:500 }}>{s.label}</span>
            </div>
          </button>
        ))}
      </div>
      {/* Content */}
      <div style={{ flex:1, minWidth:0 }}>
        {active==='skills'       && <SkillsSection environment={environment}/>}
        {active==='competencies' && <CompetenciesSection environment={environment}/>}
        {active==='job-levels'   && <JobLevelsSection environment={environment}/>}
        {active==='locations'    && <LocationsSection environment={environment}/>}
        {active==='comp-bands'   && <CompBandsSection environment={environment}/>}
      </div>
    </div>
  );
}
