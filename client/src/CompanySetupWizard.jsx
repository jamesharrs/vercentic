import { tFetch } from "./apiClient.js";
// client/src/CompanySetupWizard.jsx
import { useState } from "react";

const C = {
  bg:"#F0F2FF", card:"#FFFFFF", accent:"#4361EE", accentLight:"#EEF0FD",
  text1:"#0F1729", text2:"#374151", text3:"#9CA3AF", border:"#E5E7EB",
  green:"#0CAF77", amber:"#F59E0B", red:"#EF4444",
};
const F = "'DM Sans', -apple-system, sans-serif";
const FW = "'Space Grotesk', sans-serif";

// Vercentic logo — white version (matches LoginPage)
const VIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <path d="M8 52 L40 36 L72 52 L40 68 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M8 52 L8 62 L40 78 L40 68 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M72 52 L72 62 L40 78 L40 68 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.3"/>
    <path d="M20 34 L40 24 L60 34 L40 44 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M20 34 L20 42 L40 52 L40 44 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M60 34 L60 42 L40 52 L40 44 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.3"/>
    <path d="M28 18 L40 12 L52 18 L40 24 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M28 18 L28 24 L40 30 L40 24 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M52 18 L52 24 L40 30 L40 24 Z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.3"/>
  </svg>
);

const PATHS = {
  search:"M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  check:"M5 13l4 4L19 7",
  x:"M6 18L18 6M6 6l12 12",
  edit:"M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  map:"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  mail:"M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  star:"M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zm-9-2h2v2H11V5zm-2 0a2 2 0 012-2h2a2 2 0 012 2v2H9V5z",
  sparkle:"M12 3v1m0 16v1M3 12h1m16 0h1m-2.222-6.364l-.707.707M4.929 19.071l.707-.707M4.929 4.929l.707.707m13.435 13.435l-.707-.707M9 12a3 3 0 116 0 3 3 0 01-6 0z",
  loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  building:"M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
};
const Ic = ({ n, s=16, c="currentColor" }) => {
  const d = PATHS[n]; if (!d) return null;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
};

const PulseLoader = ({ label="Researching..." }) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"60px 0"}}>
    <div style={{position:"relative",width:80,height:80}}>
      {[0,1,2].map(i=>(
        <div key={i} style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",animation:`pulse-csw ${1.5+i*0.3}s ease-in-out infinite`,animationDelay:`${i*0.2}s`,transform:`scale(${1+i*0.4})`}}/>
      ))}
      <div style={{position:"absolute",inset:0,borderRadius:"50%",background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <VIcon size={32}/>
      </div>
    </div>
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:18,fontWeight:700,color:"white",marginBottom:8,fontFamily:FW}}>{label}</div>
      <div style={{fontSize:14,color:"rgba(255,255,255,0.6)",marginBottom:6}}>Vercentic is searching the web and analysing your company…</div>
      <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>This takes about a minute — we're building your full company profile, EVP and email templates.</div>
    </div>
    <style>{`@keyframes pulse-csw{0%,100%{opacity:0.3}50%{opacity:0.1}}`}</style>
  </div>
);

const StepIndicator = ({ steps, current }) => (
  <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:36}}>
    {steps.map((s,i)=>(
      <div key={i} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:0}}>
        <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:i<current?C.green:i===current?C.accent:C.border,color:i<=current?"white":C.text3,fontSize:12,fontWeight:700,transition:"all 0.3s"}}>
          {i<current?<Ic n="check" s={14} c="white"/>:i+1}
        </div>
        <div style={{marginLeft:8,marginRight:16,flexShrink:0}}>
          <div style={{fontSize:11,fontWeight:700,color:i===current?C.accent:i<current?C.green:C.text3,lineHeight:1.2}}>{s}</div>
        </div>
        {i<steps.length-1&&<div style={{flex:1,height:2,background:i<current?C.green:C.border,marginRight:16,transition:"background 0.3s"}}/>}
      </div>
    ))}
  </div>
);

const LocationPill = ({ loc }) => (
  <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:99,background:loc.is_hq?C.accentLight:"#F3F4F6",border:`1.5px solid ${loc.is_hq?C.accent:C.border}`,fontSize:12,color:loc.is_hq?C.accent:C.text2,fontWeight:loc.is_hq?700:400}}>
    <Ic n="map" s={11} c={loc.is_hq?C.accent:C.text3}/>{loc.city}, {loc.country}{loc.is_hq&&<span style={{fontSize:10}}> HQ</span>}
  </div>
);

const FieldSuggestionRow = ({ field, checked, onChange }) => (
  <label style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,border:`1.5px solid ${checked?C.accent:C.border}`,background:checked?C.accentLight:C.card,cursor:"pointer",transition:"all 0.15s"}}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{accentColor:C.accent,width:16,height:16}}/>
    <div style={{flex:1}}>
      <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{field.name}</div>
      <div style={{fontSize:11,color:C.text3,marginTop:2}}>{field.field_type}{field.options?` · ${field.options.slice(0,3).join(', ')}…`:''}</div>
    </div>
    <span style={{padding:"2px 8px",borderRadius:99,background:"#F3F4F6",fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase"}}>{field.field_type}</span>
  </label>
);

const EmailTemplateCard = ({ template, checked, onChange }) => (
  <label style={{display:"flex",gap:12,padding:"14px",borderRadius:12,border:`1.5px solid ${checked?C.accent:C.border}`,background:checked?C.accentLight:C.card,cursor:"pointer",transition:"all 0.15s"}}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{accentColor:C.accent,width:16,height:16,marginTop:3,flexShrink:0}}/>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:4}}>{template.name}</div>
      <div style={{fontSize:12,color:C.text3,fontStyle:"italic",marginBottom:6}}>"{template.subject}"</div>
      <div style={{fontSize:11,color:C.text2,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{template.body?.slice(0,120)}…</div>
    </div>
    <span style={{padding:"2px 8px",borderRadius:99,background:"#F3F4F6",fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",flexShrink:0,height:"fit-content"}}>{template.category}</span>
  </label>
);

export default function CompanySetupWizard({ environmentId, environmentName, onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState(environmentName || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [suggestedFields, setSuggestedFields] = useState([]);
  const [editedProfile, setEditedProfile] = useState(null);
  const [selectedTemplates, setSelectedTemplates] = useState(new Set());
  const [selectedFields, setSelectedFields] = useState(new Set());
  const STEPS = ["Search","Company Profile","Configure","Apply"];

  const handleResearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await tFetch('/api/company-research/research', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ company_name: query, environment_id: environmentId })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProfile(data.profile); setEditedProfile(data.profile);
      setEmailTemplates(data.email_templates||[]);
      setSuggestedFields(data.suggested_fields||[]);
      setSelectedTemplates(new Set((data.email_templates||[]).map((_,i)=>i)));
      setSelectedFields(new Set((data.suggested_fields||[]).map((_,i)=>i)));
      setStep(1);
    } catch(e) { setError(e.message||"Research failed. Please try again."); }
    finally { setLoading(false); }
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      const selectedTpls = emailTemplates.filter((_,i)=>selectedTemplates.has(i));
      const res = await tFetch('/api/company-research/save', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ environment_id:environmentId, profile:editedProfile, email_templates:selectedTpls, apply_templates:selectedTpls.length>0 })
      });
      if (!res.ok) throw new Error(await res.text());
      setStep(3);
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  };

  // Step 0: Search
  if (step===0) return (
    <div style={{minHeight:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:40,fontFamily:F,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#1a1a2e 0%,#3b5bdb 100%)"}}>
      {/* Radial glow — matches login page */}
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 20% 30%,rgba(99,102,241,0.35) 0%,transparent 55%),radial-gradient(ellipse at 80% 70%,rgba(67,97,238,0.25) 0%,transparent 50%)",pointerEvents:"none"}}/>
      {/* Subtle grid overlay */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none"}}/>

      <div style={{maxWidth:560,width:"100%",textAlign:"center",position:"relative",zIndex:1}}>
        {/* Vercentic logo */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:32}}>
          <VIcon size={36}/>
          <span style={{fontFamily:FW,fontSize:22,fontWeight:700,letterSpacing:"-0.5px",color:"white"}}>Vercentic</span>
        </div>

        <h1 style={{fontSize:30,fontWeight:800,color:"white",margin:"0 0 12px",fontFamily:FW,letterSpacing:"-0.5px"}}>Set up your workspace</h1>
        <p style={{fontSize:15,color:"rgba(255,255,255,0.6)",lineHeight:1.7,margin:"0 0 40px"}}>Enter your company name and our AI will research your organisation — finding your logo, locations, EVP, and setting up personalised email templates.</p>

        <div style={{display:"flex",gap:12,background:"rgba(255,255,255,0.1)",borderRadius:16,padding:8,border:"1.5px solid rgba(255,255,255,0.15)",backdropFilter:"blur(10px)"}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleResearch()}
            placeholder="Enter your company name…" autoFocus
            style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:16,color:"white",padding:"8px 12px",fontFamily:F}}/>
          <button onClick={handleResearch} disabled={!query.trim()||loading}
            style={{padding:"10px 24px",borderRadius:10,border:"none",background:query.trim()?"#4361EE":"rgba(255,255,255,0.2)",color:"white",fontSize:14,fontWeight:700,cursor:query.trim()?"pointer":"default",display:"flex",alignItems:"center",gap:8,fontFamily:F,transition:"background 0.15s"}}>
            <Ic n="search" s={16} c="white"/>Research
          </button>
        </div>

        {loading&&<PulseLoader/>}
        {error&&<div style={{marginTop:20,padding:"12px 16px",borderRadius:10,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",color:"#fca5a5",fontSize:13}}>{error}</div>}
        {onSkip&&!loading&&<button onClick={onSkip} style={{marginTop:24,background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:13,cursor:"pointer",fontFamily:F}}>Skip for now →</button>}
      </div>
    </div>
  );

  // Step 1: Review profile
  if (step===1&&editedProfile) return (
    <div style={{maxWidth:800,margin:"0 auto",padding:40,fontFamily:F}}>
      <StepIndicator steps={STEPS} current={1}/>
      <div style={{display:"flex",alignItems:"flex-start",gap:20,marginBottom:28}}>
        <div style={{width:80,height:80,borderRadius:16,border:`1.5px solid ${C.border}`,background:"#F9FAFB",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
          {editedProfile.logo_url?<img src={editedProfile.logo_url} alt="logo" style={{width:"100%",height:"100%",objectFit:"contain",padding:8}} onError={e=>e.target.style.display="none"}/>:<Ic n="building" s={32} c={C.text3}/>}
        </div>
        <div style={{flex:1}}>
          <h2 style={{fontSize:22,fontWeight:800,color:C.text1,margin:"0 0 4px"}}>{editedProfile.name}</h2>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            {editedProfile.industry&&<span style={{padding:"3px 10px",borderRadius:99,background:C.accentLight,color:C.accent,fontSize:12,fontWeight:600}}>{editedProfile.industry}</span>}
            {editedProfile.size&&<span style={{padding:"3px 10px",borderRadius:99,background:"#F3F4F6",color:C.text2,fontSize:12}}>{editedProfile.size}</span>}
            {editedProfile.founded&&<span style={{padding:"3px 10px",borderRadius:99,background:"#F3F4F6",color:C.text2,fontSize:12}}>Est. {editedProfile.founded}</span>}
            {editedProfile.tone&&<span style={{padding:"3px 10px",borderRadius:99,background:"#FEF9C3",color:"#92400E",fontSize:12}}>Tone: {editedProfile.tone}</span>}
          </div>
          <p style={{fontSize:14,color:C.text2,lineHeight:1.6,margin:0}}>{editedProfile.description}</p>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
        <div style={{padding:20,borderRadius:14,border:`1.5px solid ${C.border}`,background:C.card,gridColumn:"1 / -1"}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Employer Value Proposition</div>
          <div style={{fontSize:16,fontWeight:700,color:C.text1,marginBottom:8}}>"{editedProfile.evp?.headline}"</div>
          <p style={{fontSize:13,color:C.text2,lineHeight:1.6,margin:"0 0 12px"}}>{editedProfile.evp?.statement}</p>
          {editedProfile.evp?.pillars?.length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {editedProfile.evp.pillars.map((p,i)=><span key={i} style={{padding:"4px 12px",borderRadius:99,background:`${C.accent}12`,color:C.accent,fontSize:12,fontWeight:600}}>{p}</span>)}
          </div>}
        </div>
        <div style={{padding:20,borderRadius:14,border:`1.5px solid ${C.border}`,background:C.card}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Locations</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(editedProfile.locations||[]).map((loc,i)=><LocationPill key={i} loc={loc}/>)}</div>
        </div>
        <div style={{padding:20,borderRadius:14,border:`1.5px solid ${C.border}`,background:C.card}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Typical Roles Hired</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(editedProfile.typical_roles||[]).map((r,i)=><span key={i} style={{padding:"4px 10px",borderRadius:99,background:"#F3F4F6",color:C.text2,fontSize:12}}>{r}</span>)}</div>
        </div>
      </div>
      <div style={{padding:"10px 16px",borderRadius:10,background:"#FFFBEB",border:"1px solid #FCD34D",fontSize:12,color:"#92400E",marginBottom:28}}>
        Review the information above — researched by AI and may need adjustments. You can edit everything in Settings after setup.
      </div>
      <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
        <button onClick={()=>setStep(0)} style={{padding:"10px 20px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:F}}>← Back</button>
        <button onClick={()=>setStep(2)} style={{padding:"10px 24px",borderRadius:10,border:"none",background:C.accent,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:F}}>Looks good → Configure</button>
      </div>
    </div>
  );

  // Step 2: Configure
  if (step===2) return (
    <div style={{maxWidth:800,margin:"0 auto",padding:40,fontFamily:F}}>
      <StepIndicator steps={STEPS} current={2}/>
      <h2 style={{fontSize:20,fontWeight:800,color:C.text1,margin:"0 0 6px"}}>Configure your workspace</h2>
      <p style={{fontSize:14,color:C.text3,margin:"0 0 32px"}}>Choose which AI-generated content to apply. You can change these any time in Settings.</p>
      {emailTemplates.length>0&&(
        <div style={{marginBottom:32}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div><div style={{fontSize:14,fontWeight:700,color:C.text1}}>✉️ Email Templates</div><div style={{fontSize:12,color:C.text3}}>AI-generated in your company's voice</div></div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setSelectedTemplates(new Set(emailTemplates.map((_,i)=>i)))} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontFamily:F}}>All</button>
              <span style={{color:C.border}}>|</span>
              <button onClick={()=>setSelectedTemplates(new Set())} style={{fontSize:12,color:C.text3,background:"none",border:"none",cursor:"pointer",fontFamily:F}}>None</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {emailTemplates.map((tpl,i)=><EmailTemplateCard key={i} template={tpl} checked={selectedTemplates.has(i)} onChange={()=>{const n=new Set(selectedTemplates);n.has(i)?n.delete(i):n.add(i);setSelectedTemplates(n);}}/>)}
          </div>
        </div>
      )}
      {suggestedFields.length>0&&(
        <div style={{marginBottom:32}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div><div style={{fontSize:14,fontWeight:700,color:C.text1}}>📋 Suggested Fields</div><div style={{fontSize:12,color:C.text3}}>Industry-specific fields for your People records</div></div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setSelectedFields(new Set(suggestedFields.map((_,i)=>i)))} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontFamily:F}}>All</button>
              <span style={{color:C.border}}>|</span>
              <button onClick={()=>setSelectedFields(new Set())} style={{fontSize:12,color:C.text3,background:"none",border:"none",cursor:"pointer",fontFamily:F}}>None</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {suggestedFields.map((field,i)=><FieldSuggestionRow key={i} field={field} checked={selectedFields.has(i)} onChange={()=>{const n=new Set(selectedFields);n.has(i)?n.delete(i):n.add(i);setSelectedFields(n);}}/>)}
          </div>
        </div>
      )}
      {error&&<div style={{padding:"12px 16px",borderRadius:10,background:"#FEF2F2",border:"1px solid #FECACA",color:C.red,fontSize:13,marginBottom:20}}>{error}</div>}
      <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
        <button onClick={()=>setStep(1)} style={{padding:"10px 20px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:F}}>← Back</button>
        <button onClick={handleApply} disabled={saving} style={{padding:"10px 28px",borderRadius:10,border:"none",background:C.green,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:8}}>
          {saving?<><Ic n="loader" s={14} c="white"/>Applying…</>:<><Ic n="check" s={14} c="white"/>Apply & Finish</>}
        </button>
      </div>
    </div>
  );

  // Step 3: Success
  if (step===3) return (
    <div style={{maxWidth:540,margin:"0 auto",padding:40,fontFamily:F,textAlign:"center"}}>
      <div style={{width:80,height:80,borderRadius:"50%",background:"#D1FAE5",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px"}}>
        <Ic n="check" s={36} c={C.green}/>
      </div>
      <h2 style={{fontSize:24,fontWeight:800,color:C.text1,margin:"0 0 12px"}}>{editedProfile?.name} is set up!</h2>
      <p style={{fontSize:14,color:C.text3,lineHeight:1.7,margin:"0 0 32px"}}>
        Your workspace has been personalised with your company's brand, locations, EVP, and templates.
        The AI Copilot will now use this context when writing emails and job descriptions.
      </p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:32}}>
        {[{label:"Locations",value:(editedProfile?.locations||[]).length,icon:"map"},{label:"Templates",value:selectedTemplates.size,icon:"mail"},{label:"Fields Added",value:selectedFields.size,icon:"star"}].map((s,i)=>(
          <div key={i} style={{padding:"16px 12px",borderRadius:12,background:C.card,border:`1.5px solid ${C.border}`}}>
            <Ic n={s.icon} s={20} c={C.accent}/>
            <div style={{fontSize:24,fontWeight:800,color:C.text1,margin:"8px 0 4px"}}>{s.value}</div>
            <div style={{fontSize:12,color:C.text3}}>{s.label}</div>
          </div>
        ))}
      </div>
      <button onClick={onComplete} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:C.accent,color:"white",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:F}}>
        Continue to your workspace →
      </button>
    </div>
  );

  return null;
}
