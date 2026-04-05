// client/src/settings/AiMatchingSettings.jsx
// Configuration for the AI matching engine — which fields are used and their weights
import { useState, useEffect } from "react";

const F = "'Geist', -apple-system, sans-serif";
const C = { surface:"#FFFFFF", border:"#E8ECF8", text1:"#0F1729", text2:"#4B5675", text3:"#9DA8C7", accent:"#4361EE", accentLight:"#EEF2FF", green:"#0CAF77", amber:"#F79009", purple:"#7C3AED" };

const STORAGE_KEY = "talentos_matching_config";

const DEFAULT_CONFIG = {
  criteria: [
    { id:"title",       label:"Job Title Match",      field_candidate:"current_title", field_job:"job_title", weight:15, enabled:true,  description:"Exact or fuzzy match between candidate's current title and the role title (noise words like Senior/Junior stripped)" },
    { id:"skills",      label:"Skills Match",         field_candidate:"skills", field_job:"required_skills", weight:35, enabled:true,  description:"Overlap between candidate skills and required job skills" },
    { id:"location",    label:"Location Match",        field_candidate:"location", field_job:"location",    weight:15, enabled:true,  description:"Candidate location vs job location (or remote eligibility)" },
    { id:"experience",  label:"Years of Experience",  field_candidate:"years_experience", field_job:"",     weight:15, enabled:true,  description:"Experience level weighting (5y+ = full, 2-4y = partial)" },
    { id:"availability",label:"Availability Status",  field_candidate:"status", field_job:"",              weight:10, enabled:true,  description:"Active > Passive > Not Looking" },
    { id:"rating",      label:"Candidate Rating",     field_candidate:"rating", field_job:"",              weight:10, enabled:true,  description:"Internal star rating (4-5★ = bonus points)" },
  ],
  min_score_threshold: 30,
  show_reasons: true,
  show_gaps: true,
};

const Ic = ({n,s=16,c="currentColor"}) => {
  const P = { zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z", check:"M20 6L9 17l-5-5", info:"M12 22a10 10 0 100-20 10 10 0 000 20zM12 8h.01M12 12v4", sliders:"M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6", refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15", "chevron-up":"M18 15l-6-6-6 6" };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]||""}/></svg>;
};

export default function AiMatchingSettings() {
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; }
  });
  const [saved, setSaved] = useState(false);
  const [totalWeight, setTotalWeight] = useState(0);

  useEffect(() => {
    const enabledTotal = config.criteria.filter(c=>c.enabled).reduce((s,c)=>s+Number(c.weight),0);
    setTotalWeight(enabledTotal);
  }, [config.criteria]);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => { setConfig(DEFAULT_CONFIG); };

  const setCriteria = (id, updates) => {
    setConfig(c => ({ ...c, criteria: c.criteria.map(cr => cr.id === id ? {...cr, ...updates} : cr) }));
  };

  const weightColor = totalWeight === 100 ? C.green : totalWeight > 100 ? "#ef4444" : C.amber;

  return (
    <div style={{fontFamily:F, maxWidth:720}}>
      {/* Header */}
      <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24}}>
        <div>
          <div style={{fontSize:20, fontWeight:800, color:C.text1}}>AI Matching Configuration</div>
          <div style={{fontSize:13, color:C.text3, marginTop:4}}>
            Configure which fields and weightings the recommendation engine uses when scoring candidates against jobs, and vice versa.
          </div>
        </div>
        <div style={{display:"flex", gap:8, flexShrink:0}}>
          <button onClick={reset} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:9,border:`1px solid ${C.border}`,background:"transparent",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F,color:C.text2}}>
            <Ic n="refresh" s={12}/> Reset defaults
          </button>
          <button onClick={save} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:9,border:"none",background:saved?C.green:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F,transition:"background .2s"}}>
            <Ic n="check" s={13} c="white"/> {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Weight summary bar */}
      <div style={{background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, padding:"16px 20px", marginBottom:20}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
          <div style={{fontSize:13, fontWeight:700, color:C.text2}}>Total Weight</div>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <span style={{fontSize:18, fontWeight:800, color:weightColor}}>{totalWeight}%</span>
            {totalWeight !== 100 && <span style={{fontSize:11, color:weightColor, fontWeight:600}}>{totalWeight < 100 ? `${100-totalWeight}% unallocated` : `${totalWeight-100}% over`}</span>}
            {totalWeight === 100 && <span style={{fontSize:11, color:C.green, fontWeight:600}}>✓ Balanced</span>}
          </div>
        </div>
        <div style={{display:"flex", height:8, borderRadius:99, overflow:"hidden", background:"#f1f5f9", gap:2}}>
          {config.criteria.filter(c=>c.enabled).map(c => {
            const colors = {skills:"#4361EE", location:"#0CAF77", experience:"#F79009", availability:"#7C3AED", rating:"#ef4444"};
            return <div key={c.id} style={{width:`${(c.weight/totalWeight)*100}%`, background:colors[c.id]||C.accent, transition:"width .3s", borderRadius:2}}/>;
          })}
        </div>
        <div style={{display:"flex", gap:12, marginTop:8, flexWrap:"wrap"}}>
          {config.criteria.filter(c=>c.enabled).map(c => {
            const colors = {skills:"#4361EE", location:"#0CAF77", experience:"#F79009", availability:"#7C3AED", rating:"#ef4444"};
            return <div key={c.id} style={{display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.text3}}>
              <div style={{width:8, height:8, borderRadius:2, background:colors[c.id]||C.accent, flexShrink:0}}/>
              {c.label}: {c.weight}%
            </div>;
          })}
        </div>
      </div>

      {/* Criteria list */}
      <div style={{background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden", marginBottom:20}}>
        <div style={{padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:8}}>
          <Ic n="sliders" s={15} c={C.accent}/>
          <span style={{fontSize:14, fontWeight:700, color:C.text1}}>Matching Criteria</span>
          <span style={{fontSize:12, color:C.text3, marginLeft:"auto"}}>{config.criteria.filter(c=>c.enabled).length} active criteria</span>
        </div>

        {config.criteria.map((criterion, idx) => (
          <div key={criterion.id} style={{padding:"18px 20px", borderBottom: idx < config.criteria.length-1 ? `1px solid ${C.border}` : "none", opacity:criterion.enabled?1:0.5, transition:"opacity .15s"}}>
            <div style={{display:"flex", alignItems:"flex-start", gap:16}}>
              {/* Toggle */}
              <div onClick={()=>setCriteria(criterion.id, {enabled:!criterion.enabled})}
                style={{width:40, height:22, borderRadius:99, background:criterion.enabled?C.accent:"#d1d5db", position:"relative", cursor:"pointer", flexShrink:0, marginTop:2, transition:"background .2s"}}>
                <div style={{width:18, height:18, borderRadius:"50%", background:"white", position:"absolute", top:2, left:criterion.enabled?20:2, transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </div>

              <div style={{flex:1, minWidth:0}}>
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4}}>
                  <span style={{fontSize:14, fontWeight:700, color:C.text1}}>{criterion.label}</span>
                  <span style={{fontSize:11, padding:"2px 7px", borderRadius:99, background:C.accentLight, color:C.accent, fontWeight:600}}>{criterion.weight}%</span>
                </div>
                <div style={{fontSize:12, color:C.text3, marginBottom:12}}>{criterion.description}</div>

                {/* Field mapping info */}
                <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:12}}>
                  {criterion.field_candidate && (
                    <div style={{padding:"4px 10px", borderRadius:7, background:"#f1f5f9", border:`1px solid ${C.border}`, fontSize:11, color:C.text2}}>
                      <span style={{color:C.text3}}>Candidate field: </span>
                      <code style={{fontFamily:"monospace", fontWeight:600}}>{criterion.field_candidate}</code>
                    </div>
                  )}
                  {criterion.field_job && (
                    <div style={{padding:"4px 10px", borderRadius:7, background:"#f1f5f9", border:`1px solid ${C.border}`, fontSize:11, color:C.text2}}>
                      <span style={{color:C.text3}}>Job field: </span>
                      <code style={{fontFamily:"monospace", fontWeight:600}}>{criterion.field_job}</code>
                    </div>
                  )}
                  {!criterion.field_job && <div style={{padding:"4px 10px", borderRadius:7, background:"#f8f9fc", border:`1px solid ${C.border}`, fontSize:11, color:C.text3, fontStyle:"italic"}}>Candidate field only</div>}
                </div>

                {/* Weight slider */}
                {criterion.enabled && (
                  <div style={{display:"flex", alignItems:"center", gap:10}}>
                    <span style={{fontSize:11, color:C.text3, flexShrink:0, width:60}}>Weight</span>
                    <input type="range" min={0} max={60} step={5} value={criterion.weight}
                      onChange={e=>setCriteria(criterion.id, {weight:Number(e.target.value)})}
                      style={{flex:1, accentColor:C.accent, cursor:"pointer"}}/>
                    <span style={{fontSize:13, fontWeight:700, color:C.accent, width:36, textAlign:"right", flexShrink:0}}>{criterion.weight}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Display options */}
      <div style={{background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden", marginBottom:20}}>
        <div style={{padding:"14px 20px", borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:14, fontWeight:700, color:C.text1}}>Display Options</span>
        </div>
        <div style={{padding:"16px 20px"}}>
          {[
            {key:"show_reasons", label:"Show recommendation reasons", help:"Display why a candidate scored well (e.g. 'Location match', 'Matches 3/5 skills')"},
            {key:"show_gaps",    label:"Show match gaps",    help:"Display what's missing (e.g. 'Missing: Python, AWS')"},
          ].map(opt=>(
            <div key={opt.key} style={{display:"flex", alignItems:"flex-start", gap:14, padding:"10px 0", borderBottom:`1px solid ${C.border}`, lastChild:{borderBottom:"none"}}}>
              <div onClick={()=>setConfig(c=>({...c,[opt.key]:!c[opt.key]}))}
                style={{width:40, height:22, borderRadius:99, background:config[opt.key]?C.accent:"#d1d5db", position:"relative", cursor:"pointer", flexShrink:0, marginTop:2, transition:"background .2s"}}>
                <div style={{width:18, height:18, borderRadius:"50%", background:"white", position:"absolute", top:2, left:config[opt.key]?20:2, transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </div>
              <div>
                <div style={{fontSize:13, fontWeight:600, color:C.text1}}>{opt.label}</div>
                <div style={{fontSize:12, color:C.text3, marginTop:2}}>{opt.help}</div>
              </div>
            </div>
          ))}

          {/* Minimum score threshold */}
          <div style={{display:"flex", alignItems:"center", gap:12, paddingTop:16}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:600, color:C.text1}}>Minimum score threshold</div>
              <div style={{fontSize:12, color:C.text3, marginTop:2}}>Hide candidates or jobs below this match percentage in results</div>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              <input type="range" min={0} max={80} step={5} value={config.min_score_threshold}
                onChange={e=>setConfig(c=>({...c,min_score_threshold:Number(e.target.value)}))}
                style={{width:120, accentColor:C.accent, cursor:"pointer"}}/>
              <span style={{fontSize:14, fontWeight:700, color:C.accent, width:44, textAlign:"right"}}>{config.min_score_threshold}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info callout */}
      <div style={{padding:"14px 18px", borderRadius:12, background:"#eff6ff", border:"1px solid #bfdbfe", fontSize:12, color:"#1e40af", display:"flex", gap:10, alignItems:"flex-start"}}>
        <Ic n="info" s={14} c="#3b82f6" style={{flexShrink:0, marginTop:1}}/>
        <div>
          <strong>How recommendations work:</strong> Each enabled criterion contributes its weighted percentage to a 0–100 fit score. The score is used in the Recommendations panel on record detail pages, the pipeline people view, and the Copilot when suggesting candidates for a role. Changes take effect immediately after saving — no restart needed.
        </div>
      </div>
    </div>
  );
}
