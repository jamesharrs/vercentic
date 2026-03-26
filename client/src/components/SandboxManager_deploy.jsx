import { useState, useEffect, useCallback, useRef } from "react";
import api from "./apiClient.js";

const F = "'DM Sans',-apple-system,sans-serif";
const C = {
  bg:"var(--t-bg,#EEF2FF)", surface:"var(--t-card,#fff)", border:"var(--t-border,#E5E7EB)",
  text1:"var(--t-text1,#111827)", text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9CA3AF)",
  accent:"var(--t-accent,#4361EE)", accentLight:"var(--t-accent-light,#EEF2FF)",
  green:"#0CAF77", red:"#EF4444", amber:"#F59E0B", purple:"#7C3AED",
};

const PATHS = {
  plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12", check:"M20 6L9 17l-5-5",
  copy:"M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4h8",
  trash:"M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  arrowRight:"M5 12h14M12 5l7 7-7 7",
  arrowLeft:"M19 12H5M12 19l-7-7 7-7",
  chevD:"M6 9l6 6 6-6",
  upload:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  download:"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  database:"M12 2C6.48 2 2 4.02 2 6.5V17.5C2 19.98 6.48 22 12 22s10-2.02 10-4.5V6.5C22 4.02 17.52 2 12 2z",
  gitBranch:"M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9",
  clock:"M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  archive:"M21 8v13H3V8M1 3h22v5H1zM10 12h4",
};
const Ic = ({n,s=16,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]||"M12 12h.01"}/>
  </svg>
);

const Btn = ({children,onClick,v="primary",sz="md",icon,disabled,style={}}) => {
  const base = {display:"inline-flex",alignItems:"center",gap:6,fontFamily:F,fontWeight:700,cursor:disabled?"not-allowed":"pointer",borderRadius:9,transition:"all .12s",border:"none",opacity:disabled?.5:1,...(sz==="sm"?{padding:"5px 12px",fontSize:11}:{padding:"8px 18px",fontSize:13})};
  const vs = {primary:{background:C.accent,color:"#fff"},secondary:{background:"#f1f5f9",color:C.text2},ghost:{background:"transparent",color:C.text2,border:`1px solid ${C.border}`},danger:{background:"#fef2f2",color:C.red,border:`1px solid #fecaca`},green:{background:C.green,color:"#fff"},amber:{background:C.amber,color:"#fff"}};
  return <button style={{...base,...vs[v],...style}} onClick={onClick} disabled={disabled}>{icon&&<Ic n={icon} s={sz==="sm"?12:14} c={v==="primary"||v==="green"||v==="amber"?"#fff":v==="danger"?C.red:C.text2}/>}{children}</button>;
};

const Badge = ({children,color=C.accent,light}) => (
  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:light?`${color}15`:color,color:light?color:"#fff",display:"inline-flex",alignItems:"center",gap:4}}>{children}</span>
);

const STATUS_COLORS = { active:C.amber, promoted:C.green, archived:C.text3, rolled_back:C.red };
const COL_LABELS = { objects:"Objects", fields:"Fields", workflows:"Workflows", email_templates:"Email Templates", portals:"Portals", saved_views:"Saved Lists", org_units:"Org Units", roles:"Roles", forms:"Forms", file_types:"File Types", interview_types:"Interview Types" };

// ═══════════════════════════════════════════════════════════════════════════════
// CLONE WIZARD
// ═══════════════════════════════════════════════════════════════════════════════
const CloneWizard = ({ environment, onClose, onCreated }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(`${environment?.name || 'Production'} Sandbox`);
  const [includeRecords, setIncludeRecords] = useState(false);
  const [recordLimit, setRecordLimit] = useState(50);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const inp = {padding:"9px 12px",borderRadius:9,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};

  const handleCreate = async () => {
    setCreating(true); setError(null);
    try {
      const res = await api.post('/sandboxes/clone', {
        source_env_id: environment.id, name,
        include_records: includeRecords, record_limit: recordLimit
      });
      setResult(res);
      setStep(2);
      if (onCreated) onCreated(res);
    } catch (e) { setError(e.message || 'Failed to create sandbox'); }
    setCreating(false);
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,23,41,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:18,width:520,maxWidth:"100%",boxShadow:"0 32px 80px rgba(0,0,0,.25)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:`${C.amber}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic n="gitBranch" s={17} c={C.amber}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:C.text1}}>Create Sandbox</div>
            <div style={{fontSize:11,color:C.text3}}>Clone {environment?.name || "production"} for safe testing</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={16}/></button>
        </div>

        {/* Steps indicator */}
        <div style={{display:"flex",padding:"12px 24px",gap:4,borderBottom:`1px solid ${C.border}`}}>
          {["Configure","Review","Done"].map((s,i)=>(
            <div key={s} style={{flex:1,textAlign:"center",padding:"6px",borderRadius:6,fontSize:11,fontWeight:i===step?700:500,
              background:i===step?`${C.amber}15`:i<step?`${C.green}10`:"transparent",
              color:i===step?C.amber:i<step?C.green:C.text3}}>
              {i<step?"✓ ":""}{s}
            </div>
          ))}
        </div>

        <div style={{padding:"20px 24px"}}>
          {error && <div style={{padding:"10px 14px",borderRadius:8,background:"#fef2f2",border:"1px solid #fecaca",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

          {step===0&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>Sandbox name</div>
              <input value={name} onChange={e=>setName(e.target.value)} style={inp} autoFocus/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>What to clone</div>
              <div style={{padding:"14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"#f8f9fc"}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text1,marginBottom:4}}>Configuration (always included)</div>
                <div style={{fontSize:11,color:C.text3,lineHeight:1.6}}>Objects, fields, workflows, portals, email templates, forms, org units, roles, interview types, saved lists, file types</div>
              </div>
              <label style={{display:"flex",alignItems:"flex-start",gap:10,marginTop:12,cursor:"pointer"}}>
                <input type="checkbox" checked={includeRecords} onChange={e=>setIncludeRecords(e.target.checked)} style={{accentColor:C.amber,marginTop:3}}/>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text1}}>Include sample records</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}>Clone a subset of records for realistic testing (people, jobs, communications, etc.)</div>
                  {includeRecords&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                    <span style={{fontSize:11,color:C.text2}}>Max records per object:</span>
                    <input type="number" value={recordLimit} onChange={e=>setRecordLimit(+e.target.value||50)} min={10} max={500} style={{...inp,width:80,padding:"5px 8px"}}/>
                  </div>}
                </div>
              </label>
            </div>
          </div>}

          {step===1&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Review before creating</div>
            <div style={{padding:"14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"#f8f9fc"}}>
              <div style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:"8px 16px",fontSize:13}}>
                <span style={{color:C.text3,fontWeight:600}}>Name</span><span style={{color:C.text1,fontWeight:700}}>{name}</span>
                <span style={{color:C.text3,fontWeight:600}}>Source</span><span style={{color:C.text1}}>{environment?.name}</span>
                <span style={{color:C.text3,fontWeight:600}}>Config</span><span style={{color:C.text1}}>All collections cloned</span>
                <span style={{color:C.text3,fontWeight:600}}>Records</span><span style={{color:C.text1}}>{includeRecords?`Up to ${recordLimit} per object`:"No records"}</span>
              </div>
            </div>
            <div style={{padding:"10px 14px",borderRadius:8,background:`${C.amber}10`,border:`1px solid ${C.amber}30`,fontSize:12,color:"#92400E"}}>
              Changes in the sandbox won't affect production until you explicitly promote them.
            </div>
          </div>}

          {step===2&&result&&<div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{width:48,height:48,borderRadius:14,background:`${C.green}15`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
              <Ic n="check" s={24} c={C.green}/>
            </div>
            <div style={{fontSize:17,fontWeight:800,color:C.text1,marginBottom:4}}>Sandbox Created</div>
            <div style={{fontSize:13,color:C.text3,marginBottom:16}}>"{name}" is ready for testing</div>
            <div style={{padding:"14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"#f8f9fc",textAlign:"left"}}>
              <div style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:"6px 16px",fontSize:12}}>
                {Object.entries(result.cloned||{}).map(([k,v])=>(
                  <React.Fragment key={k}>
                    <span style={{color:C.text3}}>{COL_LABELS[k]||k}</span>
                    <span style={{color:C.text1,fontWeight:600}}>{v} cloned</span>
                  </React.Fragment>
                ))}
                {result.records_cloned>0&&<>
                  <span style={{color:C.text3}}>Records</span>
                  <span style={{color:C.text1,fontWeight:600}}>{result.records_cloned} cloned</span>
                </>}
              </div>
            </div>
          </div>}
        </div>

        <div style={{padding:"14px 24px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}>
          {step<2?<Btn v="ghost" onClick={step===0?onClose:()=>setStep(0)}>{step===0?"Cancel":"Back"}</Btn>:<span/>}
          {step===0&&<Btn v="amber" onClick={()=>setStep(1)} disabled={!name.trim()}>Review <Ic n="arrowRight" s={12} c="#fff"/></Btn>}
          {step===1&&<Btn v="amber" onClick={handleCreate} disabled={creating}>{creating?"Creating…":"Create Sandbox"}</Btn>}
          {step===2&&<Btn onClick={onClose}>Done</Btn>}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMOTION WIZARD
// ═══════════════════════════════════════════════════════════════════════════════
const PromotionWizard = ({ sandbox, onClose, onPromoted }) => {
  const [step, setStep] = useState(0);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [includeRecords, setIncludeRecords] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/sandboxes/${sandbox.id}/diff`).then(d => {
      setDiff(d);
      // Default: select everything
      const sel = {};
      Object.entries(d).forEach(([col, items]) => {
        sel[col] = items.map(i => i.id);
      });
      setSelected(sel);
      setLoading(false);
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [sandbox.id]);

  const toggleItem = (col, id) => {
    setSelected(s => {
      const cur = s[col] || [];
      return { ...s, [col]: cur.includes(id) ? cur.filter(x=>x!==id) : [...cur, id] };
    });
  };

  const toggleAll = (col) => {
    const items = diff?.[col] || [];
    const allSelected = items.every(i => (selected[col]||[]).includes(i.id));
    setSelected(s => ({ ...s, [col]: allSelected ? [] : items.map(i=>i.id) }));
  };

  const totalSelected = Object.values(selected).reduce((s,a)=>s+a.length, 0);
  const totalChanges = diff ? Object.values(diff).reduce((s,a)=>s+a.length, 0) : 0;

  const handlePromote = async () => {
    setPromoting(true); setError(null);
    try {
      const res = await api.post(`/sandboxes/${sandbox.id}/promote`, {
        selected_changes: Object.fromEntries(
          Object.entries(selected).map(([col, ids]) => [col, ids])
        ),
        include_records: includeRecords,
      });
      setResult(res);
      setStep(3);
      if (onPromoted) onPromoted();
    } catch (e) { setError(e.message || 'Promotion failed'); }
    setPromoting(false);
  };

  const TYPE_COLORS = { added:C.green, modified:C.amber, removed:C.red };
  const TYPE_LABELS = { added:"New", modified:"Changed", removed:"Deleted" };

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,23,41,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:18,width:700,maxWidth:"100%",maxHeight:"90vh",boxShadow:"0 32px 80px rgba(0,0,0,.25)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:10,background:`${C.green}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ic n="upload" s={17} c={C.green}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:C.text1}}>Promote to Production</div>
            <div style={{fontSize:11,color:C.text3}}>"{sandbox.name}" → Production</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={16}/></button>
        </div>

        {/* Steps */}
        <div style={{display:"flex",padding:"10px 24px",gap:4,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          {["Review changes","Select","Confirm","Done"].map((s,i)=>(
            <div key={s} style={{flex:1,textAlign:"center",padding:"5px",borderRadius:6,fontSize:10,fontWeight:i===step?700:500,
              background:i===step?`${C.green}15`:i<step?`${C.green}10`:"transparent",
              color:i===step?C.green:i<step?C.green:C.text3}}>
              {i<step?"✓ ":""}{s}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"18px 24px"}}>
          {error && <div style={{padding:"10px 14px",borderRadius:8,background:"#fef2f2",border:"1px solid #fecaca",color:C.red,fontSize:13,marginBottom:14}}>{error}</div>}

          {loading && <div style={{textAlign:"center",padding:"40px 0",color:C.text3}}>Analysing changes…</div>}

          {/* Step 0: Review */}
          {step===0&&diff&&<div>
            {totalChanges===0 ? (
              <div style={{textAlign:"center",padding:"32px 0"}}>
                <Ic n="check" s={36} c={C.green}/>
                <div style={{fontSize:15,fontWeight:700,color:C.text1,marginTop:10}}>No changes detected</div>
                <div style={{fontSize:13,color:C.text3,marginTop:4}}>The sandbox configuration matches production.</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text1,marginBottom:4}}>{totalChanges} change{totalChanges!==1?"s":""} found</div>
                {Object.entries(diff).map(([col, items]) => {
                  const added = items.filter(i=>i.type==="added").length;
                  const modified = items.filter(i=>i.type==="modified").length;
                  const removed = items.filter(i=>i.type==="removed").length;
                  return (
                    <div key={col} style={{padding:"12px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"#f8f9fc"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontSize:13,fontWeight:700,color:C.text1}}>{COL_LABELS[col]||col}</span>
                        <div style={{display:"flex",gap:6}}>
                          {added>0&&<Badge color={C.green} light>+{added} new</Badge>}
                          {modified>0&&<Badge color={C.amber} light>~{modified} changed</Badge>}
                          {removed>0&&<Badge color={C.red} light>-{removed} deleted</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>}

          {/* Step 1: Cherry-pick */}
          {step===1&&diff&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Select changes to promote ({totalSelected} of {totalChanges})</div>
            {Object.entries(diff).map(([col, items]) => {
              const allSel = items.every(i=>(selected[col]||[]).includes(i.id));
              const someSel = items.some(i=>(selected[col]||[]).includes(i.id));
              return (
                <div key={col} style={{borderRadius:10,border:`1.5px solid ${C.border}`,overflow:"hidden"}}>
                  <div style={{padding:"10px 14px",background:"#f8f9fc",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.border}`}}>
                    <input type="checkbox" checked={allSel} ref={el=>{if(el)el.indeterminate=someSel&&!allSel;}} onChange={()=>toggleAll(col)} style={{accentColor:C.accent}}/>
                    <span style={{fontSize:13,fontWeight:700,color:C.text1,flex:1}}>{COL_LABELS[col]||col}</span>
                    <span style={{fontSize:11,color:C.text3}}>{(selected[col]||[]).length}/{items.length}</span>
                  </div>
                  {items.map(item => {
                    const isSel = (selected[col]||[]).includes(item.id);
                    return (
                      <div key={item.id} onClick={()=>toggleItem(col,item.id)}
                        style={{padding:"8px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",
                          background:isSel?"#f0fdf4":"transparent",borderBottom:`1px solid ${C.border}`,transition:"background .1s"}}
                        onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background="#fafafa";}}
                        onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background="transparent";}}>
                        <input type="checkbox" checked={isSel} readOnly style={{accentColor:C.accent,pointerEvents:"none"}}/>
                        <Badge color={TYPE_COLORS[item.type]} light>{TYPE_LABELS[item.type]}</Badge>
                        <span style={{fontSize:12,fontWeight:600,color:C.text1,flex:1}}>{item.name}</span>
                        {item.type==="modified"&&item.changed_fields&&(
                          <span style={{fontSize:10,color:C.text3}}>{item.changed_fields.length} field{item.changed_fields.length!==1?"s":""} changed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <label style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,cursor:"pointer",marginTop:4}}>
              <input type="checkbox" checked={includeRecords} onChange={e=>setIncludeRecords(e.target.checked)} style={{accentColor:C.amber,marginTop:3}}/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.text1}}>Also migrate records</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>Copy sandbox records to production (creates new records, doesn't overwrite)</div>
              </div>
            </label>
          </div>}

          {/* Step 2: Confirm */}
          {step===2&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Confirm promotion</div>
            <div style={{padding:"14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"#f8f9fc"}}>
              <div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:"6px 16px",fontSize:12}}>
                <span style={{color:C.text3,fontWeight:600}}>Source</span><span style={{color:C.text1,fontWeight:700}}>{sandbox.name} (sandbox)</span>
                <span style={{color:C.text3,fontWeight:600}}>Target</span><span style={{color:C.text1,fontWeight:700}}>Production</span>
                <span style={{color:C.text3,fontWeight:600}}>Changes</span><span style={{color:C.text1}}>{totalSelected} items</span>
                <span style={{color:C.text3,fontWeight:600}}>Records</span><span style={{color:C.text1}}>{includeRecords?"Yes — will be copied":"No"}</span>
              </div>
            </div>
            <div style={{padding:"12px 14px",borderRadius:10,background:`${C.green}08`,border:`1.5px solid ${C.green}30`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <Ic n="shield" s={14} c={C.green}/>
                <span style={{fontSize:13,fontWeight:700,color:C.green}}>Rollback available</span>
              </div>
              <div style={{fontSize:12,color:"#166534",lineHeight:1.5}}>
                A snapshot of production will be saved before changes are applied. You can roll back to this snapshot at any time from the sandbox detail view.
              </div>
            </div>
          </div>}

          {/* Step 3: Done */}
          {step===3&&result&&<div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{width:48,height:48,borderRadius:14,background:`${C.green}15`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
              <Ic n="check" s={24} c={C.green}/>
            </div>
            <div style={{fontSize:17,fontWeight:800,color:C.text1,marginBottom:4}}>Promotion Complete</div>
            <div style={{fontSize:13,color:C.text3,marginBottom:16}}>Changes have been applied to production</div>
            <div style={{padding:"14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"#f8f9fc",textAlign:"left"}}>
              {Object.entries(result.results||{}).map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12}}>
                  <span style={{color:C.text3}}>{COL_LABELS[k]||k}</span>
                  <span style={{color:C.text1,fontWeight:600}}>{v} promoted</span>
                </div>
              ))}
            </div>
            <div style={{fontSize:11,color:C.text3,marginTop:12}}>Rollback snapshot saved — you can revert from the sandbox detail page.</div>
          </div>}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 24px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",flexShrink:0}}>
          {step<3?<Btn v="ghost" onClick={step===0?onClose:()=>setStep(s=>s-1)}>{step===0?"Cancel":"Back"}</Btn>:<span/>}
          {step===0&&totalChanges>0&&<Btn v="green" onClick={()=>setStep(1)}>Select changes <Ic n="arrowRight" s={12} c="#fff"/></Btn>}
          {step===1&&<Btn v="green" onClick={()=>setStep(2)} disabled={totalSelected===0}>Confirm ({totalSelected}) <Ic n="arrowRight" s={12} c="#fff"/></Btn>}
          {step===2&&<Btn v="green" onClick={handlePromote} disabled={promoting}>{promoting?"Promoting…":"Promote to Production"}</Btn>}
          {step===3&&<Btn onClick={onClose}>Done</Btn>}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SANDBOX DETAIL
// ═══════════════════════════════════════════════════════════════════════════════
const SandboxDetail = ({ sandbox, onBack, onRefresh }) => {
  const [tab, setTab] = useState("overview");
  const [diff, setDiff] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");

  const loadDiff = useCallback(() => {
    setLoadingDiff(true);
    api.get(`/sandboxes/${sandbox.id}/diff`).then(d=>{setDiff(d);setLoadingDiff(false);}).catch(()=>setLoadingDiff(false));
  }, [sandbox.id]);

  const loadSnapshots = useCallback(() => {
    api.get(`/sandboxes/${sandbox.id}/snapshots`).then(setSnapshots).catch(()=>{});
  }, [sandbox.id]);

  useEffect(() => { loadDiff(); loadSnapshots(); }, [loadDiff, loadSnapshots]);

  const handleRollback = async () => {
    if (!confirm("This will revert ALL production config to the state before the last promotion. Are you sure?")) return;
    setRollingBack(true);
    try {
      await api.post(`/sandboxes/${sandbox.id}/rollback`, {});
      alert("Production has been rolled back successfully.");
      onRefresh?.();
    } catch (e) { alert("Rollback failed: " + e.message); }
    setRollingBack(false);
  };

  const handleSaveSnapshot = async () => {
    setSavingSnapshot(true);
    try {
      await api.post(`/sandboxes/${sandbox.id}/snapshot`, { label: snapshotLabel || undefined });
      setSnapshotLabel("");
      loadSnapshots();
    } catch {}
    setSavingSnapshot(false);
  };

  const handleArchive = async () => {
    if (!confirm(`Archive "${sandbox.name}"? This will mark it as archived and optionally clean up sandbox data.`)) return;
    try {
      await api.delete(`/sandboxes/${sandbox.id}?cleanup=true`);
      onBack?.();
    } catch (e) { alert("Archive failed: " + e.message); }
  };

  const changes = sandbox.changes || {};
  const totalChanges = diff ? Object.values(diff).reduce((s,a)=>s+a.length, 0) : changes.total || 0;
  const TYPE_COLORS = { added:C.green, modified:C.amber, removed:C.red };

  const inp = {padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",color:C.text1,background:C.surface,boxSizing:"border-box"};

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,display:"flex",alignItems:"center",gap:5,fontSize:13,fontWeight:600,fontFamily:F}}>
          <Ic n="arrowLeft" s={14}/> All sandboxes
        </button>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
        <div style={{width:42,height:42,borderRadius:12,background:`${STATUS_COLORS[sandbox.status]}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic n="gitBranch" s={20} c={STATUS_COLORS[sandbox.status]}/>
        </div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.text1}}>{sandbox.name}</h2>
            <Badge color={STATUS_COLORS[sandbox.status]} light>{sandbox.status}</Badge>
          </div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>
            Created {new Date(sandbox.created_at).toLocaleDateString()}
            {sandbox.promoted_at && ` · Promoted ${new Date(sandbox.promoted_at).toLocaleDateString()}`}
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {sandbox.status==="active"&&<Btn v="green" icon="upload" onClick={()=>setShowPromote(true)}>Promote</Btn>}
          {sandbox.rollback_snapshot_id&&sandbox.status==="promoted"&&(
            <Btn v="danger" icon="refresh" onClick={handleRollback} disabled={rollingBack}>{rollingBack?"Rolling back…":"Rollback"}</Btn>
          )}
          <Btn v="ghost" icon="archive" onClick={handleArchive}>Archive</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:`2px solid ${C.border}`,marginBottom:20}}>
        {[["overview","Overview"],["changes","Changes"],["snapshots","Snapshots"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"9px 18px",border:"none",background:"transparent",cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:tab===id?700:500,color:tab===id?C.accent:C.text3,borderBottom:`2px solid ${tab===id?C.accent:"transparent"}`,marginBottom:-2}}>
            {label}{id==="changes"&&totalChanges>0&&<span style={{marginLeft:6,fontSize:10,fontWeight:700,background:`${C.amber}15`,color:C.amber,padding:"1px 6px",borderRadius:99}}>{totalChanges}</span>}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{padding:"16px 18px",borderRadius:12,border:`1.5px solid ${C.border}`,background:C.surface}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Configuration</div>
          {Object.entries(sandbox.cloned_counts||{}).map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12}}>
              <span style={{color:C.text2}}>{COL_LABELS[k]||k}</span><span style={{fontWeight:600,color:C.text1}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{padding:"16px 18px",borderRadius:12,border:`1.5px solid ${C.border}`,background:C.surface}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Change Summary</div>
          {totalChanges===0?<div style={{fontSize:12,color:C.text3}}>No changes from baseline</div>:
            Object.entries(changes.collections||{}).map(([k,ch])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12}}>
                <span style={{color:C.text2}}>{COL_LABELS[k]||k}</span>
                <div style={{display:"flex",gap:4}}>
                  {ch.added>0&&<Badge color={C.green} light>+{ch.added}</Badge>}
                  {ch.modified>0&&<Badge color={C.amber} light>~{ch.modified}</Badge>}
                  {ch.removed>0&&<Badge color={C.red} light>-{ch.removed}</Badge>}
                </div>
              </div>
            ))
          }
        </div>
        {sandbox.promotion_results&&<div style={{gridColumn:"1/-1",padding:"16px 18px",borderRadius:12,border:`1.5px solid ${C.green}30`,background:`${C.green}05`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Last Promotion Results</div>
          {Object.entries(sandbox.promotion_results).map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:12}}>
              <span style={{color:C.text2}}>{COL_LABELS[k]||k}</span><span style={{fontWeight:600,color:C.green}}>{v} promoted</span>
            </div>
          ))}
        </div>}
      </div>}

      {/* Changes tab — detailed diff */}
      {tab==="changes"&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Detailed changes</div>
          <Btn v="ghost" sz="sm" icon="refresh" onClick={loadDiff} disabled={loadingDiff}>{loadingDiff?"Loading…":"Refresh"}</Btn>
        </div>
        {loadingDiff ? <div style={{textAlign:"center",padding:"32px 0",color:C.text3}}>Analysing…</div>
        : !diff || Object.keys(diff).length===0 ? <div style={{textAlign:"center",padding:"32px 0",color:C.text3}}>No changes detected</div>
        : Object.entries(diff).map(([col, items]) => (
          <div key={col} style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
              {COL_LABELS[col]||col}
              <span style={{fontSize:11,color:C.text3,fontWeight:500}}>{items.length} change{items.length!==1?"s":""}</span>
            </div>
            {items.map(item => (
              <div key={item.id} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,marginBottom:6,background:C.surface}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:item.changed_fields?.length?8:0}}>
                  <Badge color={TYPE_COLORS[item.type]} light>{item.type==="added"?"New":item.type==="removed"?"Deleted":"Changed"}</Badge>
                  <span style={{fontSize:12,fontWeight:700,color:C.text1}}>{item.name}</span>
                </div>
                {item.changed_fields?.map(cf => (
                  <div key={cf.key} style={{display:"flex",gap:8,fontSize:11,padding:"4px 0",borderTop:`1px solid ${C.border}`,marginTop:4}}>
                    <span style={{color:C.text3,fontWeight:600,minWidth:100}}>{cf.key}</span>
                    <span style={{color:C.red,textDecoration:"line-through",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{typeof cf.before==="object"?JSON.stringify(cf.before):String(cf.before??"—")}</span>
                    <span style={{color:C.text3}}>→</span>
                    <span style={{color:C.green,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{typeof cf.after==="object"?JSON.stringify(cf.after):String(cf.after??"—")}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>}

      {/* Snapshots tab */}
      {tab==="snapshots"&&<div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16}}>
          <input value={snapshotLabel} onChange={e=>setSnapshotLabel(e.target.value)} placeholder="Snapshot label (optional)" style={{...inp,flex:1}}/>
          <Btn v="ghost" sz="sm" icon="copy" onClick={handleSaveSnapshot} disabled={savingSnapshot}>{savingSnapshot?"Saving…":"Save snapshot"}</Btn>
        </div>
        {snapshots.length===0?<div style={{textAlign:"center",padding:"24px 0",color:C.text3,fontSize:12}}>No snapshots yet</div>
        : snapshots.map(s=>(
          <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,marginBottom:6}}>
            <div style={{width:28,height:28,borderRadius:8,background:s.type==="baseline"?`${C.accent}15`:s.type==="pre_promote"?`${C.green}15`:`${C.amber}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Ic n={s.type==="baseline"?"database":s.type==="pre_promote"?"shield":"copy"} s={13} c={s.type==="baseline"?C.accent:s.type==="pre_promote"?C.green:C.amber}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{s.label}</div>
              <div style={{fontSize:10,color:C.text3}}>{new Date(s.created_at).toLocaleString()} · {(s.size/1024).toFixed(0)} KB</div>
            </div>
            <Badge color={s.type==="baseline"?C.accent:s.type==="pre_promote"?C.green:C.amber} light>{s.type}</Badge>
          </div>
        ))}
      </div>}

      {showPromote&&<PromotionWizard sandbox={sandbox} onClose={()=>{setShowPromote(false);loadDiff();}} onPromoted={()=>{onRefresh?.();loadDiff();loadSnapshots();}}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function SandboxManager({ environment }) {
  const [sandboxes, setSandboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClone, setShowClone] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    if (!environment?.id) return;
    api.get(`/sandboxes?environment_id=${environment.id}`).then(d => {
      setSandboxes(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  if (selected) {
    const sb = sandboxes.find(s=>s.id===selected) || { id:selected };
    return <SandboxDetail sandbox={sb} onBack={()=>{setSelected(null);load();}} onRefresh={load}/>;
  }

  return (
    <div style={{maxWidth:800}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h2 style={{margin:"0 0 4px",fontSize:18,fontWeight:800,color:C.text1}}>Sandbox Manager</h2>
          <p style={{margin:0,fontSize:13,color:C.text3}}>Clone your environment for safe testing, then promote changes to production.</p>
        </div>
        <Btn v="amber" icon="gitBranch" onClick={()=>setShowClone(true)}>Create Sandbox</Btn>
      </div>

      {/* How it works */}
      {sandboxes.length===0&&!loading&&<div style={{padding:"28px",borderRadius:14,border:`2px dashed ${C.border}`,textAlign:"center",marginBottom:20}}>
        <div style={{width:48,height:48,borderRadius:14,background:`${C.amber}12`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
          <Ic n="gitBranch" s={22} c={C.amber}/>
        </div>
        <div style={{fontSize:15,fontWeight:700,color:C.text1,marginBottom:6}}>No sandboxes yet</div>
        <div style={{fontSize:13,color:C.text3,lineHeight:1.6,maxWidth:420,margin:"0 auto 16px"}}>
          Create a sandbox to safely test configuration changes — new fields, workflows, portal designs — without affecting production data.
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:20,marginBottom:16}}>
          {[["Clone","Copy your current config to a sandbox","gitBranch",C.amber],
            ["Test","Make changes safely in isolation","settings",C.accent],
            ["Promote","Cherry-pick and push changes live","upload",C.green]
          ].map(([title,desc,icon,col])=>(
            <div key={title} style={{textAlign:"center",maxWidth:140}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${col}12`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px"}}>
                <Ic n={icon} s={16} c={col}/>
              </div>
              <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{title}</div>
              <div style={{fontSize:10,color:C.text3,marginTop:2}}>{desc}</div>
            </div>
          ))}
        </div>
        <Btn v="amber" icon="gitBranch" onClick={()=>setShowClone(true)}>Create first sandbox</Btn>
      </div>}

      {loading&&<div style={{textAlign:"center",padding:"40px 0",color:C.text3}}>Loading sandboxes…</div>}

      {/* Sandbox list */}
      {sandboxes.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {sandboxes.map(sb=>(
          <div key={sb.id} onClick={()=>setSelected(sb.id)}
            style={{padding:"16px 18px",borderRadius:12,border:`1.5px solid ${C.border}`,background:C.surface,cursor:"pointer",transition:"all .12s",display:"flex",alignItems:"center",gap:14}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.06)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
            <div style={{width:38,height:38,borderRadius:10,background:`${STATUS_COLORS[sb.status]}12`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Ic n="gitBranch" s={18} c={STATUS_COLORS[sb.status]}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{sb.name}</span>
                <Badge color={STATUS_COLORS[sb.status]} light>{sb.status}</Badge>
              </div>
              <div style={{fontSize:11,color:C.text3,marginTop:2}}>
                Created {new Date(sb.created_at).toLocaleDateString()}
                {sb.changes?.total>0&&` · ${sb.changes.total} pending change${sb.changes.total!==1?"s":""}`}
                {sb.promoted_at&&` · Promoted ${new Date(sb.promoted_at).toLocaleDateString()}`}
              </div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {sb.status==="active"&&sb.changes?.total>0&&(
                <Badge color={C.amber}>{sb.changes.total} changes</Badge>
              )}
              <Ic n="arrowRight" s={14} c={C.text3}/>
            </div>
          </div>
        ))}
      </div>}

      {showClone&&<CloneWizard environment={environment} onClose={()=>setShowClone(false)} onCreated={()=>{setShowClone(false);load();}}/>}
    </div>
  );
}
