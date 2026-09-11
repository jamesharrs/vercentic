import api, { tFetch } from "./apiClient.js";
// client/src/CompanySetupWizard.jsx
import React, { useState, useEffect } from "react";

const C = {
  bg:"#F0F2FF", card:"#FFFFFF", accent:"#4361EE", accentLight:"#EEF0FD",
  text1:"#0F1729", text2:"#374151", text3:"#9CA3AF", border:"#E5E7EB",
  green:"#0CAF77", amber:"#F59E0B", red:"#EF4444",
};
const F = "'DM Sans', -apple-system, sans-serif";
const FW = "'Space Grotesk', sans-serif";

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
  sparkle:"M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17zM19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75L19 3z",
  loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  building:"M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  palette:"M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 01-4.95-14.32A8 8 0 0112 4c4.42 0 8 3.58 8 8 0 1.1-.22 2.15-.6 3.12-.38.96-1.13 1.88-2.4 1.88-1.38 0-2-1-2-2V9.5c0-.28-.22-.5-.5-.5h-1c-.28 0-.5.22-.5.5V15c0 1.66 1.34 3 3 3 .97 0 1.84-.44 2.43-1.13A8 8 0 0112 20z",
  link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71",
  type:"M4 6h16M4 12h16M4 18h7",
};
const Ic = ({ n, s=16, c="currentColor" }) => {
  const d = PATHS[n]; if (!d) return null;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
};

// Renders <img>, but falls back to `fallback` on load failure — tracked in
// React state (keyed off `src`) rather than by imperatively mutating the DOM
// node's style. The old `onError={e=>{e.target.style.display="none"}}`
// pattern left the element hidden forever even after `src` changed to a
// working URL, since React never re-applies a style it doesn't own — this
// was why the logo preview box could get "stuck" empty after a failed load.
const SafeImg = ({ src, alt="", style, fallback=null }) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) return fallback;
  return <img src={src} alt={alt} style={style} onError={()=>setFailed(true)}/>;
};

// Dynamically loads a Google Font stylesheet at runtime (idempotent — checks
// for an existing <link> by id first). Some fonts offered in the Brand Kit
// font picker (Poppins, Lato, Nunito, Roboto, Geist) aren't loaded anywhere
// else in the app, so without this the picker's live preview silently fell
// back to the browser default sans-serif for those choices.
function loadGoogleFont(fontName) {
  if (!fontName || typeof document === "undefined") return;
  const clean = fontName.replace(/'/g, "").split(",")[0].trim();
  const id = "gf-" + clean.replace(/\s+/g, "-").toLowerCase();
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id; link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(clean) + ":wght@300;400;500;600;700;800&display=swap";
  document.head.appendChild(link);
}
const FONT_OPTIONS = ["Inter","DM Sans","Space Grotesk","Geist","Roboto","Poppins","Lato","Nunito"];

// Kept in sync with the identical list in BrandKitSettings.jsx / Portals.jsx's
// BrandKitAgent — resolved server-side via resolveBrandKit(..., surface) in
// server/utils/brandKit.js whenever a template/portal doesn't have an
// explicit brand_kit_id of its own.
const AUTO_APPLY_SURFACES = [
  { id: "email", label: "Email templates" },
  { id: "career_site", label: "Career site" },
  { id: "hiring_manager", label: "Hiring manager portal" },
];

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
  <div style={{display:"flex",alignItems:"center",marginBottom:24,padding:"0 4px"}}>
    {steps.map((s,i)=>(
      <React.Fragment key={i}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
            background:i<current?C.green:i===current?C.accent:"#E5E7EB",
            color:i<=current?"white":C.text3,fontSize:11,fontWeight:700,transition:"all 0.3s"}}>
            {i<current?<Ic n="check" s={12} c="white"/>:i+1}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:i===current?C.accent:i<current?C.green:C.text3,whiteSpace:"nowrap"}}>{s}</div>
        </div>
        {i<steps.length-1&&(
          <div style={{flex:1,height:2,background:i<current?C.green:"#E5E7EB",margin:"0 8px",minWidth:16,transition:"background 0.3s"}}/>
        )}
      </React.Fragment>
    ))}
  </div>
);

const LocationPill = ({ loc }) => (
  <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:99,background:loc.is_hq?C.accentLight:"#F3F4F6",border:`1.5px solid ${loc.is_hq?C.accent:C.border}`,fontSize:12,color:loc.is_hq?C.accent:C.text2,fontWeight:loc.is_hq?700:400}}>
    <Ic n="map" s={11} c={loc.is_hq?C.accent:C.text3}/>{loc.city}, {loc.country}{loc.is_hq&&<span style={{fontSize:10}}> HQ</span>}
  </div>
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

const LogoCandidate = ({ candidate, selected, onSelect, onEnlarge }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  if (failed) return null;
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{position:"relative",flexShrink:0}}>
      <div onClick={() => loaded && onSelect(candidate.url)}
        title={candidate.label}
        style={{ width:64,height:64,borderRadius:10,border:`2px solid ${selected?"#4361EE":"#E5E7EB"}`,
          background:selected?"#EEF0FD":"#F9FAFB",display:"flex",alignItems:"center",justifyContent:"center",
          overflow:"hidden",cursor:loaded?"pointer":"default",transition:"all 0.15s",
          opacity:loaded?1:0.4,
          boxShadow:selected?"0 0 0 3px rgba(67,97,238,0.15)":"none",
          transform:selected?"scale(1.05)":"scale(1)" }}>
        <img src={candidate.url} alt={candidate.label}
          style={{width:"100%",height:"100%",objectFit:"contain",padding:5}}
          onLoad={()=>setLoaded(true)}
          onError={()=>setFailed(true)}/>
      </div>
      {loaded && hover && (
        <button onClick={e=>{e.stopPropagation(); onEnlarge?.(candidate.url);}} title="View larger"
          style={{position:"absolute",top:-6,right:-6,width:22,height:22,borderRadius:"50%",border:"1.5px solid white",
            background:C.text1,color:"white",display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer",padding:0,boxShadow:"0 1px 4px rgba(0,0,0,0.25)"}}>
          <Ic n="search" s={11} c="white"/>
        </button>
      )}
    </div>
  );
};

// Small inline-editable input styled as a pill (industry/size/founded/tone)
const EditablePill = ({ value, onChange, placeholder, bg, color, prefix="" }) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:99,background:bg,fontSize:12}}>
    {prefix&&<span style={{color,fontWeight:600,marginRight:2}}>{prefix}</span>}
    <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      size={Math.max((value||placeholder||"").length,4)}
      style={{border:"none",outline:"none",background:"transparent",fontSize:12,fontFamily:F,color,fontWeight:600,padding:0}}/>
  </span>
);

// Editable single-line text with a subtle dashed underline hinting it's editable
const EditableText = ({ value, onChange, placeholder, style }) => (
  <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    onFocus={e=>e.currentTarget.style.borderBottomColor=C.accent}
    onBlur={e=>e.currentTarget.style.borderBottomColor="transparent"}
    style={{border:"none",borderBottom:"1.5px dashed transparent",outline:"none",background:"transparent",fontFamily:F,
      width:"100%",padding:"2px 0",boxSizing:"border-box",transition:"border-color 0.15s",...style}}/>
);

// Editable multi-line text with the same subtle affordance
const EditableTextarea = ({ value, onChange, placeholder, rows=3, style }) => (
  <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    onFocus={e=>e.currentTarget.style.borderColor=C.accent}
    onBlur={e=>e.currentTarget.style.borderColor=C.border}
    style={{border:`1.5px dashed ${C.border}`,borderRadius:8,outline:"none",background:"transparent",fontFamily:F,
      width:"100%",padding:"8px 10px",resize:"vertical",boxSizing:"border-box",transition:"border-color 0.15s",...style}}/>
);

// Add/remove tag list editor — used for EVP pillars and Typical Roles
const TagListEditor = ({ items, onChange, addLabel="Add", tagBg, tagColor }) => {
  const [draft, setDraft] = React.useState("");
  const list = items || [];
  const addTag = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...list, v]);
    setDraft("");
  };
  const removeTag = (i) => onChange(list.filter((_,idx)=>idx!==i));
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      {list.map((tag,i)=>(
        <span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 6px 4px 12px",borderRadius:99,background:tagBg,color:tagColor,fontSize:12,fontWeight:600}}>
          {tag}
          <button onClick={()=>removeTag(i)} title="Remove" style={{border:"none",background:"rgba(0,0,0,0.08)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0,color:tagColor}}>
            <Ic n="x" s={9} c={tagColor}/>
          </button>
        </span>
      ))}
      <input value={draft} onChange={e=>setDraft(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); addTag(); } }}
        placeholder={addLabel}
        style={{border:`1.5px dashed ${C.border}`,borderRadius:99,padding:"4px 12px",fontSize:12,fontFamily:F,outline:"none",background:"transparent",color:C.text2,minWidth:90}}/>
      {draft.trim() && (
        <button onClick={addTag} style={{border:"none",background:C.accent,color:"white",borderRadius:99,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:0,fontSize:14,fontWeight:700,lineHeight:1}}>+</button>
      )}
    </div>
  );
};

// Structured add/remove editor for office locations
const LocationsEditor = ({ locations, onChange }) => {
  const list = locations || [];
  const update = (i, field, val) => onChange(list.map((loc,idx)=>idx===i?{...loc,[field]:val}:loc));
  const remove = (i) => onChange(list.filter((_,idx)=>idx!==i));
  const add = () => onChange([...list, { city:"", country:"", is_hq:list.length===0 }]);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {list.map((loc,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#F9FAFB"}}>
          <Ic n="map" s={11} c={loc.is_hq?C.accent:C.text3}/>
          <input value={loc.city||""} onChange={e=>update(i,"city",e.target.value)} placeholder="City"
            style={{border:"none",outline:"none",background:"transparent",fontSize:12,fontFamily:F,color:C.text1,width:70}}/>
          <span style={{color:C.text3,fontSize:12}}>,</span>
          <input value={loc.country||""} onChange={e=>update(i,"country",e.target.value)} placeholder="Country"
            style={{border:"none",outline:"none",background:"transparent",fontSize:12,fontFamily:F,color:C.text1,width:80,flex:1}}/>
          <label style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:loc.is_hq?C.accent:C.text3,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
            <input type="checkbox" checked={!!loc.is_hq} onChange={e=>update(i,"is_hq",e.target.checked)} style={{accentColor:C.accent,width:12,height:12}}/>
            HQ
          </label>
          <button onClick={()=>remove(i)} title="Remove location" style={{border:"none",background:"transparent",cursor:"pointer",padding:2,display:"flex",color:C.text3}}>
            <Ic n="x" s={13} c={C.text3}/>
          </button>
        </div>
      ))}
      <button onClick={add} style={{alignSelf:"flex-start",display:"flex",alignItems:"center",gap:5,border:`1.5px dashed ${C.border}`,borderRadius:8,padding:"5px 10px",background:"transparent",color:C.text2,fontSize:12,fontFamily:F,cursor:"pointer"}}>
        <span style={{fontSize:14,fontWeight:700,lineHeight:1}}>+</span> Add location
      </button>
    </div>
  );
};

// Swatch for brand kit colour picker
const ColorSwatch = ({ color, label, onChange }) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
    <label style={{position:"relative",cursor:"pointer"}}>
      <div style={{width:40,height:40,borderRadius:10,background:color||"#E5E7EB",border:"1.5px solid rgba(0,0,0,0.1)",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",transition:"transform 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.08)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
      <input type="color" value={color||"#4361EE"} onChange={e=>onChange(e.target.value)}
        style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
    </label>
    <div style={{fontSize:9,color:C.text3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",textAlign:"center",maxWidth:44,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
  </div>
);

export default function CompanySetupWizard({ environmentId, environmentName, onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [editedProfile, setEditedProfile] = useState(null);
  const [selectedTemplates, setSelectedTemplates] = useState(new Set());
  const [createBrandKit, setCreateBrandKit] = useState(true);
  const [lightboxLogo, setLightboxLogo] = useState(null);

  // Which surfaces the new brand kit should auto-apply to (server resolves
  // this via resolveBrandKit(..., surface) whenever a template/portal has no
  // explicit brand_kit_id of its own — see server/utils/brandKit.js). Default
  // to all three so the wizard's out-of-the-box behaviour matches what an
  // is_default kit already did implicitly, but now it's visible and the user
  // can opt individual surfaces out before anything is created.
  const [autoApplySurfaces, setAutoApplySurfaces] = useState(["email","career_site","hiring_manager"]);
  // Deliberately overwrite an already-published career site's theme with this
  // kit. Portal branding only fills in fields the portal doesn't already have
  // a value for (see server/utils/portalBranding.js), so a portal seeded with
  // default colours at creation time never picks up a new kit on its own —
  // this is the explicit, opt-in escape hatch for that.
  const [overwriteCareerSite, setOverwriteCareerSite] = useState(false);
  const [existingPortals, setExistingPortals] = useState([]);

  // Brand kit state — pre-filled from research data
  const [brandKit, setBrandKit] = useState({
    name:"", primaryColor:"#4361EE", secondaryColor:"#7C3AED",
    accentColor:"#F79009", bgColor:"#FFFFFF", textColor:"#0F1729",
    fontFamily:"Inter", logo_url:"",
  });

  const STEPS = ["Search","Company Profile","Brand Kit","Apply"];

  useEffect(() => {
    if (!environmentId) return;
    api.get(`/company-research?environment_id=${environmentId}`)
      .then(data => { if (data?.name) setQuery(data.name); })
      .catch(() => {});
  }, [environmentId]);

  // Load every font offered in the Brand Kit picker up front so the picker's
  // live preview is accurate the moment the user reaches that step, not just
  // for whichever fonts happen to already be loaded elsewhere in the app.
  useEffect(() => { FONT_OPTIONS.forEach(loadGoogleFont); }, []);

  // Fetch any career-site portals already published for this environment, so
  // the Brand Kit step can offer to overwrite their theme — and so we know
  // whether that offer is even relevant (no point showing it with nothing to
  // apply to).
  useEffect(() => {
    if (!environmentId) return;
    api.get(`/portals?environment_id=${environmentId}`)
      .then(rows => setExistingPortals(Array.isArray(rows) ? rows.filter(p => (p.type||"career_site")==="career_site") : []))
      .catch(() => {});
  }, [environmentId]);

  // Sync brand kit when profile loads/changes
  useEffect(() => {
    if (!editedProfile) return;
    setBrandKit(prev => ({
      ...prev,
      name: editedProfile.name || prev.name,
      logo_url: editedProfile.logo_url || prev.logo_url,
      primaryColor: editedProfile.brand_color || prev.primaryColor,
      company_name: editedProfile.name || prev.company_name,
      company_website: editedProfile.website || prev.company_website,
    }));
  }, [editedProfile]);

  const handleResearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null);
    try {
      const data = await api.post('/company-research/research', {
        company_name: query, environment_id: environmentId,
      });
      setProfile(data.profile); setEditedProfile(data.profile);
      setEmailTemplates(data.email_templates||[]);
      setSelectedTemplates(new Set((data.email_templates||[]).map((_,i)=>i)));
      setStep(1);
      api.post('/company-research/save', {
        environment_id: environmentId, profile: data.profile,
        email_templates: [], apply_templates: false,
      }).catch(e => console.warn('[Wizard] draft save failed:', e));
    } catch(e) { setError(e.message||"Research failed. Please try again."); }
    finally { setLoading(false); }
  };

  const handleApply = async () => {
    setSaving(true); setError(null);
    try {
      const selectedTpls = emailTemplates.filter((_,i)=>selectedTemplates.has(i));
      await api.post('/company-research/save', {
        environment_id: environmentId, profile: editedProfile,
        email_templates: selectedTpls, apply_templates: selectedTpls.length > 0,
      });
      // Create brand kit if toggled on
      if (createBrandKit && brandKit.name) {
        try {
          await api.post('/brand-kits', {
            ...brandKit,
            environment_id: environmentId,
            is_default: true,
            ai_generated: true,
            source: 'setup_wizard',
            auto_apply_surfaces: autoApplySurfaces,
          });
          // Explicit, opt-in overwrite of already-published career sites —
          // mergePortalBranding() is fallback-only, so a portal that already
          // has (even default, unpicked) colours never adopts a new kit's
          // styling on its own. This deliberately replaces those fields.
          if (overwriteCareerSite && existingPortals.length) {
            const kitThemeFields = {
              primaryColor: brandKit.primaryColor, secondaryColor: brandKit.secondaryColor,
              accentColor: brandKit.accentColor, bgColor: brandKit.bgColor,
              textColor: brandKit.textColor, fontFamily: brandKit.fontFamily,
            };
            for (const portal of existingPortals) {
              try {
                await api.patch(`/portals/${portal.id}`, { theme: { ...(portal.theme||{}), ...kitThemeFields } });
              } catch (pErr) { console.warn('[Wizard] Failed to apply brand kit to portal', portal.id, pErr); }
            }
          }
        } catch(bkErr) { console.warn('[Wizard] Brand kit creation failed:', bkErr); }
      }
      setStep(3);
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  };

  // ── Step 0: Search ─────────────────────────────────────────────────────────
  if (step===0) return (
    <div style={{minHeight:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:"28px 32px",fontFamily:F,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#1a1a2e 0%,#3b5bdb 100%)"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 20% 30%,rgba(99,102,241,0.35) 0%,transparent 55%),radial-gradient(ellipse at 80% 70%,rgba(67,97,238,0.25) 0%,transparent 50%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none"}}/>
      <div style={{maxWidth:560,width:"100%",textAlign:"center",position:"relative",zIndex:1}}>
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
            <Ic n="sparkle" s={16} c="white"/>Research
          </button>
        </div>
        {loading&&<PulseLoader/>}
        {error&&<div style={{marginTop:20,padding:"12px 16px",borderRadius:10,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",color:"#fca5a5",fontSize:13}}>{error}</div>}
        {onSkip&&!loading&&<button onClick={onSkip} style={{marginTop:24,background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:13,cursor:"pointer",fontFamily:F}}>Skip for now →</button>}
      </div>
    </div>
  );

  // ── Step 1: Company Profile ────────────────────────────────────────────────
  if (step===1&&editedProfile) return (
    <div style={{padding:"24px 28px",fontFamily:F,background:"#ffffff",minHeight:"100%"}}>
      <StepIndicator steps={STEPS} current={1}/>
      <div style={{display:"flex",alignItems:"flex-start",gap:20,marginBottom:24}}>

        {/* Logo picker — left column */}
        <div style={{flexShrink:0,width:168}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Logo</div>

          {/* Preview box — clicking a candidate updates this */}
          <div style={{width:88,height:88,borderRadius:16,border:`1.5px solid ${C.border}`,background:"#F9FAFB",
            display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",marginBottom:10,
            boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
            <SafeImg src={editedProfile.logo_url} alt="logo" style={{width:"100%",height:"100%",objectFit:"contain",padding:10}}
              fallback={<Ic n="building" s={32} c={C.text3}/>}/>
          </div>

          {/* Candidate thumbnails — horizontally scrollable row, click to select, hover 🔍 to enlarge */}
          {(editedProfile.logo_candidates||[]).length > 0 && (
            <>
              <div style={{fontSize:9,color:C.text3,marginBottom:6}}>Click to use · hover 🔍 to enlarge</div>
              <div style={{display:"flex",gap:8,overflowX:"auto",width:168,paddingBottom:6,marginBottom:8}}>
                {(editedProfile.logo_candidates||[]).map((cand,i)=>(
                  <LogoCandidate key={i} candidate={cand}
                    selected={editedProfile.logo_url===cand.url}
                    onSelect={url=>setEditedProfile(p=>({...p,logo_url:url}))}
                    onEnlarge={setLightboxLogo}/>
                ))}
              </div>
            </>
          )}

          {/* Paste logo URL */}
          <div style={{marginTop:6,display:"flex",alignItems:"center",gap:5,padding:"6px 8px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"#F9FAFB",cursor:"text",width:"100%",boxSizing:"border-box"}}
            onClick={e=>e.currentTarget.querySelector("input").focus()}>
            <Ic n="link" s={11} c={C.text3}/>
            <input placeholder="Paste logo URL…" value={editedProfile.logo_url||""} onChange={e=>setEditedProfile(p=>({...p,logo_url:e.target.value}))}
              style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:10,fontFamily:F,color:C.text1,minWidth:0}}/>
          </div>
          <div style={{fontSize:9,color:C.text3,marginTop:3,textAlign:"center",letterSpacing:"0.02em"}}>or paste URL above</div>
        </div>

        {/* Company info */}
        <div style={{flex:1}}>
          <EditableText value={editedProfile.name} onChange={v=>setEditedProfile(p=>({...p,name:v}))}
            placeholder="Company name" style={{fontSize:22,fontWeight:800,color:C.text1,marginBottom:4}}/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
            <EditablePill value={editedProfile.industry} onChange={v=>setEditedProfile(p=>({...p,industry:v}))} placeholder="Industry" bg={C.accentLight} color={C.accent}/>
            <EditablePill value={editedProfile.size} onChange={v=>setEditedProfile(p=>({...p,size:v}))} placeholder="Company size" bg="#F3F4F6" color={C.text2}/>
            <EditablePill value={editedProfile.founded} onChange={v=>setEditedProfile(p=>({...p,founded:v}))} placeholder="Year" bg="#F3F4F6" color={C.text2} prefix="Est. "/>
            <EditablePill value={editedProfile.tone} onChange={v=>setEditedProfile(p=>({...p,tone:v}))} placeholder="Tone" bg="#FEF9C3" color="#92400E" prefix="Tone: "/>
          </div>
          <EditableTextarea value={editedProfile.description} onChange={v=>setEditedProfile(p=>({...p,description:v}))}
            placeholder="Company description…" rows={3} style={{fontSize:14,color:C.text2,lineHeight:1.6}}/>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
        <div style={{padding:20,borderRadius:14,border:`1.5px solid ${C.border}`,background:C.card,gridColumn:"1 / -1"}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Employer Value Proposition</div>
          <div style={{display:"flex",alignItems:"baseline",gap:2,marginBottom:8}}>
            <span style={{fontSize:16,fontWeight:700,color:C.text1}}>"</span>
            <EditableText value={editedProfile.evp?.headline} onChange={v=>setEditedProfile(p=>({...p,evp:{...(p.evp||{}),headline:v}}))}
              placeholder="EVP headline…" style={{fontSize:16,fontWeight:700,color:C.text1}}/>
            <span style={{fontSize:16,fontWeight:700,color:C.text1}}>"</span>
          </div>
          <EditableTextarea value={editedProfile.evp?.statement} onChange={v=>setEditedProfile(p=>({...p,evp:{...(p.evp||{}),statement:v}}))}
            placeholder="EVP statement…" rows={2} style={{fontSize:13,color:C.text2,lineHeight:1.6,marginBottom:12}}/>
          <TagListEditor items={editedProfile.evp?.pillars} addLabel="Add pillar…" tagBg={`${C.accent}12`} tagColor={C.accent}
            onChange={v=>setEditedProfile(p=>({...p,evp:{...(p.evp||{}),pillars:v}}))}/>
        </div>
        <div style={{padding:20,borderRadius:14,border:`1.5px solid ${C.border}`,background:C.card}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Locations</div>
          <LocationsEditor locations={editedProfile.locations} onChange={v=>setEditedProfile(p=>({...p,locations:v}))}/>
        </div>
        <div style={{padding:20,borderRadius:14,border:`1.5px solid ${C.border}`,background:C.card}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>Typical Roles Hired</div>
          <TagListEditor items={editedProfile.typical_roles} addLabel="Add role…" tagBg="#F3F4F6" tagColor={C.text2}
            onChange={v=>setEditedProfile(p=>({...p,typical_roles:v}))}/>
        </div>
      </div>

      <div style={{padding:"10px 16px",borderRadius:10,background:"#FFFBEB",border:"1px solid #FCD34D",fontSize:12,color:"#92400E",marginBottom:28}}>
        This profile was researched by AI — click any field above to edit it before continuing.
      </div>
      <div style={{display:"flex",gap:12,justifyContent:"flex-end"}}>
        <button onClick={()=>setStep(0)} style={{padding:"10px 20px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:F}}>← Back</button>
        <button onClick={()=>setStep(2)} style={{padding:"10px 24px",borderRadius:10,border:"none",background:C.accent,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:F}}>Looks good → Brand Kit</button>
      </div>

      {/* Click-to-enlarge lightbox for logo candidates */}
      {lightboxLogo && (
        <div onClick={()=>setLightboxLogo(null)}
          style={{position:"fixed",inset:0,background:"rgba(15,23,41,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,cursor:"zoom-out",padding:40}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:"white",borderRadius:16,padding:24,maxWidth:"90vw",maxHeight:"90vh",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <img src={lightboxLogo} alt="Logo preview" style={{maxWidth:"70vw",maxHeight:"60vh",objectFit:"contain"}}/>
            <button onClick={()=>setLightboxLogo(null)} style={{padding:"8px 20px",borderRadius:8,border:"none",background:C.accent,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 2: Brand Kit & Templates ──────────────────────────────────────────
  if (step===2) return (
    <div style={{padding:"24px 28px",fontFamily:F,background:"#ffffff",minHeight:"100%"}}>
      <StepIndicator steps={STEPS} current={2}/>
      <h2 style={{fontSize:20,fontWeight:800,color:C.text1,margin:"0 0 6px"}}>Brand Kit & Email Templates</h2>
      <p style={{fontSize:14,color:C.text3,margin:"0 0 24px"}}>We've pre-filled your brand colours and logo from our research, and drafted email templates in your company's voice. Adjust anything before finishing — you can change all of this any time in Settings.</p>

      {emailTemplates.length>0&&(
        <div style={{marginBottom:32}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.text1}}>✉️ Email Templates</div>
              <div style={{fontSize:12,color:C.text3}}>AI-generated in your company's voice</div>
            </div>
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

      {/* Toggle */}
      <label style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:12,border:`1.5px solid ${createBrandKit?C.accent:C.border}`,background:createBrandKit?C.accentLight:C.card,cursor:"pointer",marginBottom:24,transition:"all 0.15s"}}>
        <input type="checkbox" checked={createBrandKit} onChange={e=>setCreateBrandKit(e.target.checked)} style={{accentColor:C.accent,width:18,height:18}}/>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Create brand kit for {editedProfile?.name||"this workspace"}</div>
          <div style={{fontSize:12,color:C.text3}}>Saved to Settings → Brand Kits. Used for portals, emails and career sites.</div>
        </div>
      </label>

      {createBrandKit && (
        <>
          {/* Logo preview + name */}
          <div style={{display:"flex",alignItems:"center",gap:16,padding:"16px",borderRadius:12,background:"#F9FAFB",border:`1.5px solid ${C.border}`,marginBottom:24}}>
            <div style={{width:60,height:60,borderRadius:12,border:`1.5px solid ${C.border}`,background:"white",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
              <SafeImg src={brandKit.logo_url} alt="logo" style={{width:"100%",height:"100%",objectFit:"contain",padding:6}}
                fallback={<Ic n="building" s={28} c={C.text3}/>}/>
            </div>
            <div style={{flex:1}}>
              <label style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:4}}>Kit Name</label>
              <input value={brandKit.name} onChange={e=>setBrandKit(p=>({...p,name:e.target.value}))}
                placeholder={`${editedProfile?.name||""} Brand Kit`}
                style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F,color:C.text1,boxSizing:"border-box",outline:"none"}}/>
            </div>
          </div>

          {/* Colour swatches */}
          <div style={{marginBottom:24}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
              <Ic n="palette" s={15} c={C.accent}/> Brand Colours
            </div>
            <div style={{fontSize:12,color:C.text3,marginBottom:14}}>Click any swatch to change the colour.</div>
            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              <ColorSwatch color={brandKit.primaryColor}   label="Primary"   onChange={v=>setBrandKit(p=>({...p,primaryColor:v}))}/>
              <ColorSwatch color={brandKit.secondaryColor} label="Secondary" onChange={v=>setBrandKit(p=>({...p,secondaryColor:v}))}/>
              <ColorSwatch color={brandKit.accentColor}    label="Accent"    onChange={v=>setBrandKit(p=>({...p,accentColor:v}))}/>
              <ColorSwatch color={brandKit.bgColor}        label="Background" onChange={v=>setBrandKit(p=>({...p,bgColor:v}))}/>
              <ColorSwatch color={brandKit.textColor}      label="Text"      onChange={v=>setBrandKit(p=>({...p,textColor:v}))}/>
            </div>
          </div>

          {/* Font */}
          <div style={{marginBottom:24}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
              <Ic n="type" s={15} c={C.accent}/> Font Family
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {FONT_OPTIONS.map(font=>(
                <button key={font} onClick={()=>setBrandKit(p=>({...p,fontFamily:font}))}
                  style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${brandKit.fontFamily===font?C.accent:C.border}`,background:brandKit.fontFamily===font?C.accentLight:"transparent",color:brandKit.fontFamily===font?C.accent:C.text2,fontSize:13,fontWeight:brandKit.fontFamily===font?700:400,cursor:"pointer",fontFamily:font,transition:"all 0.1s"}}>
                  {font}
                </button>
              ))}
            </div>
          </div>

          {/* Where this applies automatically */}
          <div style={{marginBottom:24}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
              <Ic n="sparkle" s={15} c={C.accent}/> Apply automatically to
            </div>
            <div style={{fontSize:12,color:C.text3,marginBottom:14}}>Choose where this brand kit should be used without you having to select it manually each time.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {AUTO_APPLY_SURFACES.map(s=>{
                const on = autoApplySurfaces.includes(s.id);
                return (
                  <button key={s.id} type="button"
                    onClick={()=>setAutoApplySurfaces(prev=>prev.includes(s.id)?prev.filter(x=>x!==s.id):[...prev,s.id])}
                    style={{padding:"7px 14px",borderRadius:99,fontSize:12,fontWeight:on?700:500,cursor:"pointer",fontFamily:F,
                      border:`1.5px solid ${on?C.accent:C.border}`,background:on?C.accentLight:"transparent",color:on?C.accent:C.text2,
                      display:"flex",alignItems:"center",gap:6}}>
                    {on&&<Ic n="check" s={12} c={C.accent}/>}{s.label}
                  </button>
                );
              })}
            </div>

            {autoApplySurfaces.includes("career_site") && existingPortals.length > 0 && (
              <label style={{display:"flex",alignItems:"flex-start",gap:10,marginTop:14,padding:"12px 14px",borderRadius:10,border:`1.5px solid ${overwriteCareerSite?C.accent:C.border}`,background:overwriteCareerSite?C.accentLight:"#F9FAFB",cursor:"pointer"}}>
                <input type="checkbox" checked={overwriteCareerSite} onChange={e=>setOverwriteCareerSite(e.target.checked)} style={{accentColor:C.accent,width:16,height:16,marginTop:2,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text1}}>
                    Also update {existingPortals.length===1?"your existing career site":`your ${existingPortals.length} existing career sites`} now
                  </div>
                  <div style={{fontSize:11,color:C.text3,lineHeight:1.5,marginTop:2}}>
                    {(existingPortals.map(p=>p.name).filter(Boolean).join(", "))||"Your published career site"} already has its own saved colours, so opting in above won't change {existingPortals.length===1?"it":"them"} automatically — check this to overwrite {existingPortals.length===1?"its":"their"} colours and font with this brand kit right now.
                  </div>
                </div>
              </label>
            )}
          </div>

          {/* Preview strip */}
          <div style={{padding:16,borderRadius:12,border:`1.5px solid ${C.border}`,background:brandKit.bgColor||"#fff",marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <SafeImg src={brandKit.logo_url} alt="" style={{height:24,maxWidth:80,objectFit:"contain"}} fallback={null}/>
              <span style={{fontSize:16,fontWeight:700,color:brandKit.primaryColor,fontFamily:brandKit.fontFamily}}>{brandKit.name||editedProfile?.name}</span>
            </div>
            <p style={{fontSize:13,color:brandKit.textColor,fontFamily:brandKit.fontFamily,margin:"0 0 12px",lineHeight:1.5}}>This is how your brand will look in emails and portals.</p>
            <button style={{padding:"8px 18px",borderRadius:8,border:"none",background:brandKit.primaryColor,color:"white",fontSize:13,fontWeight:600,fontFamily:brandKit.fontFamily,cursor:"default"}}>Primary Button</button>
            <button style={{marginLeft:8,padding:"8px 18px",borderRadius:8,border:`1.5px solid ${brandKit.accentColor}`,background:"transparent",color:brandKit.accentColor,fontSize:13,fontWeight:600,fontFamily:brandKit.fontFamily,cursor:"default"}}>Accent Button</button>
          </div>
        </>
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

  // ── Step 3: Success ────────────────────────────────────────────────────────
  if (step===3) return (
    <div style={{padding:"24px 28px",fontFamily:F,textAlign:"center",background:"#ffffff",minHeight:"100%"}}>
      <div style={{width:80,height:80,borderRadius:"50%",background:"#D1FAE5",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px"}}>
        <Ic n="check" s={36} c={C.green}/>
      </div>
      <h2 style={{fontSize:24,fontWeight:800,color:C.text1,margin:"0 0 12px"}}>{editedProfile?.name} is set up!</h2>
      <p style={{fontSize:14,color:C.text3,lineHeight:1.7,margin:"0 0 32px"}}>
        Your workspace has been personalised with your company's brand, locations, EVP, and templates.
        The AI Copilot will now use this context when writing emails and job descriptions.
      </p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:32}}>
        {[
          {label:"Locations",    value:(editedProfile?.locations||[]).length,      icon:"map"},
          {label:"Templates",    value:selectedTemplates.size,                     icon:"mail"},
          {label:"EVP Pillars",  value:(editedProfile?.evp?.pillars||[]).length,   icon:"star"},
          {label:"Brand Kit",    value:createBrandKit?"✓":"—",                     icon:"palette"},
        ].map((s,i)=>(
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
