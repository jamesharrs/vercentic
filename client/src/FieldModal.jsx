import React, { useState, useEffect } from "react";
import { tFetch } from "./apiClient.js";

// ─── Icon system ──────────────────────────────────────────────────────────────
const ICON_PATHS = {
  text:       "M4 6h16M4 12h10M4 18h6",
  alignLeft:  "M21 10H3M21 6H3M15 14H3M21 18H3",
  bold:       "M6 4h8a4 4 0 010 8H6zM6 12h9a4 4 0 010 8H6z",
  hash:       "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
  dollarSign: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  percent:    "M19 5L5 19M6.5 6.5a1 1 0 100-2 1 1 0 000 2zM17.5 17.5a1 1 0 100-2 1 1 0 000 2z",
  function:   "M15.5 3H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2V8.5L15.5 3zM15 3v6h6M10 13l-2 4 2 4M14 13l2 4-2 4",
  barChart:   "M18 20V10M12 20V4M6 20v-6",
  calendar:   "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  clock:      "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  calRange:   "M3 6h18M3 10h18M3 14h18M8 2v4M16 2v4M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  timer:      "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2M12 2v2",
  list:       "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  listCheck:  "M10 6H21M10 12H21M10 18H21M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  circleDot:  "M12 22a10 10 0 100-20 10 10 0 000 20zM12 12a1 1 0 100-2 1 1 0 000 2z",
  toggleLeft: "M22 12h-4l-3 9L9 3l-3 9H2",
  star:       "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  atSign:     "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 019-9",
  phone:      "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  phoneCall:  "M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  link:       "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  globe:      "M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20",
  mapPin:     "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 7a3 3 0 110 6 3 3 0 010-6z",
  users:      "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  link2:      "M15 7h3a5 5 0 010 10h-3m-6 0H6A5 5 0 010 12h3M8 12h8",
  sigma:      "M18 7H6l6 5-6 5h12",
  flag:       "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  table:      "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  fingerprint:"M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10M5.243 17.5A8 8 0 0112 4a8 8 0 016.757 3.5M12 20v-8m-4 4V8a4 4 0 018 0v8",
  database:   "M12 2C6.477 2 2 4.477 2 7s4.477 5 10 5 10-2.477 10-5S17.523 2 12 2zM2 7v5c0 2.761 4.477 5 10 5s10-2.239 10-5V7M2 12v5c0 2.761 4.477 5 10 5s10-2.239 10-5v-5",
  zap:        "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  minus:      "M5 12h14",
  search:     "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  check:      "M20 6L9 17l-5-5",
  x:          "M18 6L6 18M6 6l12 12",
  eyeOff:     "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
  eye:        "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
};
const Ic = ({n,s=16,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={ICON_PATHS[n]||ICON_PATHS.text}/>
  </svg>
);

const F = "'Plus Jakarta Sans', -apple-system, sans-serif";
const C = { bg:"#f8f9fc", surface:"#ffffff", surface2:"#f9fafb", border:"#e8eaed",
  text1:"#111827", text2:"#4b5563", text3:"#9ca3af", text4:"#d1d5db",
  accent:"#3b5bdb", accentLight:"#eef2ff", green:"#0ca678", red:"#ef4444",
  amber:"#f79009", purple:"#7c3aed" };

const api = {
  get:  u => tFetch(`/api${u}`).then(r=>r.json()),
  post: (u,b) => tFetch(`/api${u}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:(u,b) => tFetch(`/api${u}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  put:  (u,b) => tFetch(`/api${u}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  del:  (u)   => tFetch(`/api${u}`,{method:"DELETE"}).then(r=>r.json()),
};

// ─── Field Type Registry ──────────────────────────────────────────────────────
const FIELD_TYPE_GROUPS = [
  { key:"text", label:"Text", types:[
    {value:"text",      label:"Text",      icon:"text",      desc:"Short single-line text input"},
    {value:"textarea",  label:"Long Text",  icon:"alignLeft", desc:"Multi-line paragraph text"},
    {value:"rich_text", label:"Rich Text",  icon:"bold",      desc:"Formatted text with bold, lists, links"},
  ]},
  { key:"number", label:"Numbers", types:[
    {value:"number",   label:"Number",   icon:"hash",       desc:"Whole or decimal numbers"},
    {value:"currency", label:"Currency", icon:"dollarSign", desc:"Money values with currency symbol"},
    {value:"percent",  label:"Percent",  icon:"percent",    desc:"Percentage with % display"},
    {value:"formula",  label:"Formula",  icon:"function",   desc:"Calculated from other numeric fields"},
    {value:"progress", label:"Progress", icon:"barChart",   desc:"Visual progress bar 0–100%"},
  ]},
  { key:"date", label:"Date & Time", types:[
    {value:"date",       label:"Date",       icon:"calendar",  desc:"Calendar date picker"},
    {value:"datetime",   label:"Date & Time", icon:"clock",    desc:"Date with time selection"},
    {value:"date_range", label:"Date Range",  icon:"calRange", desc:"Start and end date pair"},
    {value:"duration",   label:"Duration",    icon:"timer",    desc:"Time span in hours, days, or weeks"},
  ]},
  { key:"choice", label:"Selection", types:[
    {value:"select",       label:"Select",       icon:"list",       desc:"Pick one option from a dropdown"},
    {value:"multi_select", label:"Multi Select",  icon:"listCheck",  desc:"Pick multiple options as tags"},
    {value:"status",       label:"Status",        icon:"circleDot",  desc:"Coloured status indicator with pipeline support"},
    {value:"boolean",      label:"Boolean",       icon:"toggleLeft", desc:"Yes / No toggle switch"},
    {value:"rating",       label:"Rating",        icon:"star",       desc:"Star rating from 1 to 5"},
  ]},
  { key:"contact", label:"Contact", types:[
    {value:"email",      label:"Email",      icon:"atSign",    desc:"Validated email address"},
    {value:"phone",      label:"Phone",       icon:"phone",    desc:"Local phone number"},
    {value:"phone_intl", label:"Phone (Intl)", icon:"phoneCall", desc:"International phone with country code"},
    {value:"url",        label:"URL",          icon:"link",     desc:"Web link, opens in new tab"},
    {value:"social",     label:"Social Link",  icon:"globe",    desc:"LinkedIn, Twitter/X, GitHub profile"},
    {value:"address",    label:"Address",       icon:"mapPin",  desc:"Structured address with country"},
  ]},
  { key:"reference", label:"References", types:[
    {value:"people",  label:"People",  icon:"users",   desc:"Link to person records with search"},
    {value:"lookup",  label:"Lookup",  icon:"link2",   desc:"Pull a value from a related record"},
    {value:"rollup",  label:"Rollup",  icon:"sigma",   desc:"Aggregate data across related records"},
    {value:"country", label:"Country", icon:"flag",    desc:"Country picker with flag display"},
  ]},
  { key:"advanced", label:"Advanced", types:[
    {value:"table",       label:"Table",       icon:"table",       desc:"Multi-row table with configurable columns — work history, education, languages"},
    {value:"auto_number", label:"Auto Number", icon:"hash",        desc:"Auto-incrementing sequence (e.g. CAN-001)"},
    {value:"unique_id",   label:"Unique ID",   icon:"fingerprint", desc:"Auto-generated unique identifier"},
    {value:"dataset",     label:"Data Set",    icon:"database",    desc:"Options from a shared, reusable data set"},
    {value:"skills",      label:"Skills",      icon:"zap",         desc:"Skill tags with optional proficiency levels"},
  ]},
  { key:"layout", label:"Layout", types:[
    {value:"section_separator", label:"Section", icon:"minus", desc:"Visual divider to group fields together"},
  ]},
];

const ALL_TYPES = FIELD_TYPE_GROUPS.flatMap(g => g.types);
const findType = v => ALL_TYPES.find(t => t.value === v) || ALL_TYPES[0];

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = [
  {code:"USD",symbol:"$",name:"US Dollar"},{code:"GBP",symbol:"£",name:"British Pound"},
  {code:"EUR",symbol:"€",name:"Euro"},{code:"AED",symbol:"د.إ",name:"UAE Dirham"},
  {code:"SAR",symbol:"﷼",name:"Saudi Riyal"},{code:"QAR",symbol:"﷼",name:"Qatari Riyal"},
  {code:"KWD",symbol:"د.ك",name:"Kuwaiti Dinar"},{code:"BHD",symbol:"BD",name:"Bahraini Dinar"},
  {code:"OMR",symbol:"﷼",name:"Omani Rial"},{code:"EGP",symbol:"£",name:"Egyptian Pound"},
  {code:"INR",symbol:"₹",name:"Indian Rupee"},{code:"JPY",symbol:"¥",name:"Japanese Yen"},
  {code:"CNY",symbol:"¥",name:"Chinese Yuan"},{code:"AUD",symbol:"$",name:"Australian Dollar"},
  {code:"CAD",symbol:"$",name:"Canadian Dollar"},{code:"CHF",symbol:"Fr",name:"Swiss Franc"},
  {code:"SGD",symbol:"$",name:"Singapore Dollar"},{code:"ZAR",symbol:"R",name:"South African Rand"},
  {code:"BRL",symbol:"R$",name:"Brazilian Real"},{code:"TRY",symbol:"₺",name:"Turkish Lira"},
];
const SOCIAL_PLATFORMS = [
  {id:"linkedin",label:"LinkedIn"},{id:"twitter",label:"Twitter/X"},{id:"github",label:"GitHub"},
  {id:"facebook",label:"Facebook"},{id:"instagram",label:"Instagram"},{id:"website",label:"Website"},
];
const DATE_FORMATS = [
  {value:"DD/MM/YYYY",label:"DD/MM/YYYY (UK/MENA)"},
  {value:"MM/DD/YYYY",label:"MM/DD/YYYY (US)"},
  {value:"YYYY-MM-DD",label:"YYYY-MM-DD (ISO)"},
];
const ADDRESS_FIELDS_OPTIONS = [
  {key:"street",label:"Street Address"},{key:"city",label:"City"},
  {key:"state",label:"State / Region"},{key:"postal_code",label:"Postal / ZIP Code"},
  {key:"country",label:"Country"},
];
const COUNTRY_REGIONS = [
  {value:"all",label:"All countries"},{value:"mena",label:"MENA"},
  {value:"europe",label:"Europe"},{value:"americas",label:"Americas"},
  {value:"apac",label:"Asia Pacific"},{value:"africa",label:"Africa"},
];

// ─── Shared tiny components ───────────────────────────────────────────────────
const Lbl = ({children}) => <label style={{display:"block",fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>{children}</label>;

const Inp = ({label,type="text",value,onChange,placeholder,disabled,required,multiline,mono}) => (
  <div>
    {label && <Lbl>{label}{required&&<span style={{color:C.red}}> *</span>}</Lbl>}
    {multiline
      ? <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} disabled={disabled}
          style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:mono?"'SF Mono','Fira Code',monospace":F,color:C.text1,resize:"vertical",boxSizing:"border-box",background:disabled?"#f3f4f6":C.surface,lineHeight:1.6}}/>
      : <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,boxSizing:"border-box",background:disabled?"#f3f4f6":C.surface}}/>
    }
  </div>
);

const Sel = ({label,value,onChange,options,placeholder}) => (
  <div>
    {label && <Lbl>{label}</Lbl>}
    <select value={value||""} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,cursor:"pointer",boxSizing:"border-box",background:C.surface}}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => typeof o==="string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Tog = ({label,checked,onChange}) => (
  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:C.text2}}>
    <div onClick={()=>onChange(!checked)} style={{width:36,height:20,borderRadius:10,background:checked?C.accent:"#d1d5db",position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
      <div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:2,left:checked?18:2,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
    </div>
    {label}
  </label>
);

const Chip = ({label,active,onClick}) => (
  <button onClick={onClick} style={{padding:"4px 10px",borderRadius:99,border:`1.5px solid ${active?C.accent:C.border}`,background:active?C.accentLight:"transparent",color:active?C.accent:C.text3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,transition:"all .15s"}}>{label}</button>
);

const HelpBox = ({children}) => <div style={{padding:"10px 14px",background:"#FFFBEB",borderRadius:8,border:"1px solid #FDE68A",fontSize:11,color:"#92400E",lineHeight:1.6,marginTop:4}}>{children}</div>;

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Type Picker
// ═══════════════════════════════════════════════════════════════════════════════
function TypePicker({ selected, onSelect }) {
  const [search, setSearch] = useState("");
  const lc = search.toLowerCase();
  const filtered = FIELD_TYPE_GROUPS.map(g => ({
    ...g,
    types: g.types.filter(t => t.label.toLowerCase().includes(lc) || t.desc.toLowerCase().includes(lc) || t.value.includes(lc))
  })).filter(g => g.types.length > 0);

  return (
    <div>
      <div style={{position:"relative",marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search field types…" autoFocus
          style={{width:"100%",padding:"10px 14px 10px 36px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,boxSizing:"border-box",background:C.surface2}}/>
        <span style={{position:"absolute",left:12,top:11,color:C.text4,display:"flex"}}><Ic n="search" s={14} c={C.text4}/></span>
      </div>
      <div style={{maxHeight:480,overflowY:"auto",paddingRight:4}}>
        {filtered.map(group => (
          <div key={group.key} style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:800,color:C.text3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,paddingLeft:2}}>{group.label}</div>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {group.types.map(t => {
                const active = selected === t.value;
                return (
                  <button key={t.value} onClick={()=>onSelect(t.value)}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,
                      border:`2px solid ${active?C.accent:"transparent"}`,background:active?C.accentLight:C.surface,
                      cursor:"pointer",textAlign:"left",fontFamily:F,transition:"all .12s",width:"100%"}}
                    onMouseEnter={e=>{if(!active)e.currentTarget.style.background=C.surface2}}
                    onMouseLeave={e=>{if(!active)e.currentTarget.style.background=C.surface}}>
                    <div style={{width:36,height:36,borderRadius:9,background:active?C.accent:`${C.accent}12`,
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                      color:active?"white":C.accent}}>
                      <Ic n={t.icon} s={16} c={active?"white":C.accent}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:active?C.accent:C.text1,lineHeight:1.2}}>{t.label}</div>
                      <div style={{fontSize:11,color:C.text3,lineHeight:1.4,marginTop:1}}>{t.desc}</div>
                    </div>
                    {active && <div style={{width:20,height:20,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic n="check" s={11} c="white"/></div>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length===0 && <div style={{textAlign:"center",padding:32,color:C.text3,fontSize:13}}>No field types match "{search}"</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Type-specific Configuration Panels
// ═══════════════════════════════════════════════════════════════════════════════

function TextConfig({ form, set }) {
  return <>
    <Inp label="Max Length" type="number" value={form.max_length} onChange={v=>set("max_length",v)} placeholder="No limit"/>
    <Inp label="Default Value" value={form.default_value} onChange={v=>set("default_value",v)} placeholder="Pre-filled value (optional)"/>
    <Inp label="Validation Pattern (Regex)" value={form.validation_pattern} onChange={v=>set("validation_pattern",v)} placeholder="e.g. ^[A-Z].*"/>
    <HelpBox>Short single-line text. Use for names, titles, short identifiers. The regex pattern validates input format if set.</HelpBox>
  </>;
}

function TextareaConfig({ form, set }) {
  return <>
    <Inp label="Max Length" type="number" value={form.max_length} onChange={v=>set("max_length",v)} placeholder="No limit"/>
    <Sel label="Default Rows" value={form.min_rows||"3"} onChange={v=>set("min_rows",v)}
      options={[{value:"2",label:"2 rows"},{value:"3",label:"3 rows"},{value:"5",label:"5 rows"},{value:"8",label:"8 rows"}]}/>
    <Tog label="Enable Markdown formatting" checked={!!form.enable_markdown} onChange={v=>set("enable_markdown",v)}/>
    <HelpBox>Multi-line text for descriptions, notes, bios. Markdown lets users add bold, italic, and lists.</HelpBox>
  </>;
}

function RichTextConfig({ form, set }) {
  return <>
    <Inp label="Max Length" type="number" value={form.max_length} onChange={v=>set("max_length",v)} placeholder="No limit"/>
    <div>
      <Lbl>Toolbar Options</Lbl>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {["Bold","Italic","Lists","Links","Images","Headings","Code"].map(opt => {
          const enabled = (form.toolbar_options||["Bold","Italic","Lists","Links"]).includes(opt);
          return <Chip key={opt} label={opt} active={enabled} onClick={()=>{
            const cur = form.toolbar_options||["Bold","Italic","Lists","Links"];
            set("toolbar_options", enabled ? cur.filter(o=>o!==opt) : [...cur, opt]);
          }}/>;
        })}
      </div>
    </div>
    <HelpBox>Full rich text editor with formatting toolbar. Choose which formatting options to enable.</HelpBox>
  </>;
}

function NumberConfig({ form, set }) {
  return <>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Inp label="Minimum" type="number" value={form.min_value} onChange={v=>set("min_value",v)} placeholder="No min"/>
      <Inp label="Maximum" type="number" value={form.max_value} onChange={v=>set("max_value",v)} placeholder="No max"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Sel label="Decimal Places" value={form.decimal_places||"0"} onChange={v=>set("decimal_places",v)}
        options={[{value:"0",label:"0 (integer)"},{value:"1",label:"1"},{value:"2",label:"2"},{value:"3",label:"3"},{value:"4",label:"4"}]}/>
      <Inp label="Step Increment" type="number" value={form.step_increment} onChange={v=>set("step_increment",v)} placeholder="1"/>
    </div>
    <Tog label="Show thousands separator (1,000)" checked={!!form.show_separator} onChange={v=>set("show_separator",v)}/>
    <HelpBox>Plain number input. Set min/max for validation, decimal places for precision, and separator for readability.</HelpBox>
  </>;
}

function CurrencyConfig({ form, set }) {
  return <>
    <Sel label="Currency" value={form.currency_code||"USD"} onChange={v=>set("currency_code",v)}
      options={CURRENCIES.map(c=>({value:c.code,label:`${c.symbol} ${c.code} — ${c.name}`}))}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Sel label="Decimal Places" value={form.decimal_places||"2"} onChange={v=>set("decimal_places",v)}
        options={[{value:"0",label:"0"},{value:"2",label:"2"},{value:"3",label:"3"}]}/>
      <div style={{paddingTop:22}}><Tog label="Show currency symbol" checked={form.show_symbol!==false} onChange={v=>set("show_symbol",v)}/></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Inp label="Minimum" type="number" value={form.min_value} onChange={v=>set("min_value",v)} placeholder="No min"/>
      <Inp label="Maximum" type="number" value={form.max_value} onChange={v=>set("max_value",v)} placeholder="No max"/>
    </div>
    <HelpBox>Money values with a currency symbol. Supports 20 currencies including AED, SAR, GBP, EUR.</HelpBox>
  </>;
}

function PercentConfig({ form, set }) {
  return <>
    <Sel label="Decimal Places" value={form.decimal_places||"0"} onChange={v=>set("decimal_places",v)}
      options={[{value:"0",label:"0"},{value:"1",label:"1"},{value:"2",label:"2"}]}/>
    <Tog label="Restrict to 0–100% range" checked={form.restrict_range!==false} onChange={v=>set("restrict_range",v)}/>
    <Tog label="Show % symbol in display" checked={form.show_symbol!==false} onChange={v=>set("show_symbol",v)}/>
    <HelpBox>Percentage value. Optionally restrict to 0–100 range. The % symbol appears in list and detail views.</HelpBox>
  </>;
}

function FormulaConfig({ form, set, objectFields }) {
  const numericFields = (objectFields||[]).filter(f=>["number","currency","percent","rating","progress","duration"].includes(f.field_type));
  return <>
    <div>
      <Lbl>Formula Expression</Lbl>
      <textarea value={form.formula_expression||""} onChange={e=>set("formula_expression",e.target.value)}
        placeholder="e.g. {salary_max} - {salary_min}" rows={3}
        style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,
          fontFamily:"'SF Mono','Fira Code',monospace",color:"#e0e7ff",resize:"vertical",
          boxSizing:"border-box",background:"#1e1e2e",lineHeight:1.6}}/>
    </div>
    {numericFields.length > 0 && <div>
      <Lbl>Available Fields (click to insert)</Lbl>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {numericFields.map(f=>(
          <button key={f.api_key} onClick={()=>set("formula_expression",(form.formula_expression||"")+`{${f.api_key}}`)}
            style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,
              fontSize:11,fontFamily:"monospace",color:C.accent,cursor:"pointer"}}>{`{${f.api_key}}`}</button>
        ))}
      </div>
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Sel label="Output Format" value={form.formula_output_type||"number"} onChange={v=>set("formula_output_type",v)}
        options={[{value:"number",label:"Number"},{value:"currency",label:"Currency"},{value:"percent",label:"Percent"},{value:"auto",label:"Auto-detect"}]}/>
      <Sel label="Decimal Places" value={form.decimal_places||"2"} onChange={v=>set("decimal_places",v)}
        options={[{value:"0",label:"0"},{value:"1",label:"1"},{value:"2",label:"2"},{value:"4",label:"4"}]}/>
    </div>
    <HelpBox>Calculated field. Use {`{field_api_key}`} to reference fields. Operators: + − * / ( ). Functions: SUM, AVG, MIN, MAX, IF, ROUND.</HelpBox>
  </>;
}

function ProgressConfig({ form, set }) {
  return <>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Inp label="Minimum" type="number" value={form.min_value||"0"} onChange={v=>set("min_value",v)}/>
      <Inp label="Maximum" type="number" value={form.max_value||"100"} onChange={v=>set("max_value",v)}/>
    </div>
    <div>
      <Lbl>Colour Thresholds</Lbl>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        <div style={{padding:8,borderRadius:8,background:"#FEE2E2",textAlign:"center"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#DC2626",marginBottom:4}}>RED</div>
          <Inp type="number" value={form.threshold_red||"30"} onChange={v=>set("threshold_red",v)} placeholder="< 30"/>
        </div>
        <div style={{padding:8,borderRadius:8,background:"#FEF3C7",textAlign:"center"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#D97706",marginBottom:4}}>AMBER</div>
          <Inp type="number" value={form.threshold_amber||"70"} onChange={v=>set("threshold_amber",v)} placeholder="< 70"/>
        </div>
        <div style={{padding:8,borderRadius:8,background:"#D1FAE5",textAlign:"center"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#059669",marginBottom:4}}>GREEN</div>
          <div style={{fontSize:11,color:"#059669",marginTop:12}}>≥ {form.threshold_amber||"70"}</div>
        </div>
      </div>
    </div>
    <HelpBox>Visual progress bar. Colours shift automatically based on the thresholds you set.</HelpBox>
  </>;
}

function DateConfig({ form, set }) {
  return <>
    <Sel label="Display Format" value={form.date_format||"DD/MM/YYYY"} onChange={v=>set("date_format",v)} options={DATE_FORMATS}/>
    <div style={{display:"flex",gap:16}}>
      <Tog label="Allow past dates" checked={form.allow_past!==false} onChange={v=>set("allow_past",v)}/>
      <Tog label="Allow future dates" checked={form.allow_future!==false} onChange={v=>set("allow_future",v)}/>
    </div>
    <Tog label="Default to today's date" checked={!!form.default_today} onChange={v=>set("default_today",v)}/>
    <HelpBox>Calendar date picker. Restrict to past-only (e.g. date of birth) or future-only (e.g. start date) if needed.</HelpBox>
  </>;
}

function DateTimeConfig({ form, set }) {
  return <>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Sel label="Date Format" value={form.date_format||"DD/MM/YYYY"} onChange={v=>set("date_format",v)} options={DATE_FORMATS}/>
      <Sel label="Time Format" value={form.time_format||"24h"} onChange={v=>set("time_format",v)}
        options={[{value:"24h",label:"24-hour (14:00)"},{value:"12h",label:"12-hour (2:00 PM)"}]}/>
    </div>
    <Sel label="Timezone Handling" value={form.timezone||"local"} onChange={v=>set("timezone",v)}
      options={[{value:"local",label:"User's local timezone"},{value:"utc",label:"UTC"},{value:"fixed",label:"Fixed timezone"}]}/>
    <HelpBox>Full date + time picker. Choose between 12h and 24h format.</HelpBox>
  </>;
}

function DateRangeConfig({ form, set }) {
  return <>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Inp label="Start Label" value={form.date_range_start_label||"From"} onChange={v=>set("date_range_start_label",v)}/>
      <Inp label="End Label" value={form.date_range_end_label||"To"} onChange={v=>set("date_range_end_label",v)}/>
    </div>
    <Sel label="Date Format" value={form.date_format||"DD/MM/YYYY"} onChange={v=>set("date_format",v)} options={DATE_FORMATS}/>
    <Tog label="Auto-calculate duration between dates" checked={!!form.calc_duration} onChange={v=>set("calc_duration",v)}/>
    <HelpBox>Captures a start and end date. Optionally auto-calculates the duration in days. Great for employment history, project timelines.</HelpBox>
  </>;
}

function DurationConfig({ form, set }) {
  return <>
    <Sel label="Unit" value={form.duration_unit||"days"} onChange={v=>set("duration_unit",v)}
      options={[{value:"minutes",label:"Minutes"},{value:"hours",label:"Hours"},{value:"days",label:"Days"},{value:"weeks",label:"Weeks"},{value:"months",label:"Months"}]}/>
    <Sel label="Input Format" value={form.duration_input||"number"} onChange={v=>set("duration_input",v)}
      options={[{value:"number",label:"Single number (e.g. 5 days)"},{value:"hhmm",label:"Hours:Minutes (e.g. 2:30)"}]}/>
    <HelpBox>Time span value. Pick the unit that makes sense — minutes for call duration, days for notice period, months for contract length.</HelpBox>
  </>;
}

function SelectConfig({ form, set }) {
  return <>
    <div>
      <Lbl>Options (one per line)</Lbl>
      <textarea value={form.options||""} onChange={e=>set("options",e.target.value)} placeholder={"Option A\nOption B\nOption C"} rows={5}
        style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,resize:"vertical",boxSizing:"border-box",lineHeight:1.6}}/>
      <div style={{fontSize:10,color:C.text3,marginTop:4}}>{(form.options||"").split("\n").filter(Boolean).length} options defined</div>
    </div>
    <Inp label="Default Value" value={form.default_value} onChange={v=>set("default_value",v)} placeholder="None"/>
    <Tog label='Allow "Other" with free text' checked={!!form.allow_other} onChange={v=>set("allow_other",v)}/>
    <HelpBox>Dropdown with one selection allowed. Enable "Other" to let users type a custom value not in the list.</HelpBox>
  </>;
}

function MultiSelectConfig({ form, set }) {
  return <>
    <div>
      <Lbl>Options (one per line)</Lbl>
      <textarea value={form.options||""} onChange={e=>set("options",e.target.value)} placeholder={"Tag 1\nTag 2\nTag 3"} rows={5}
        style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,resize:"vertical",boxSizing:"border-box",lineHeight:1.6}}/>
    </div>
    <Inp label="Max Selections" type="number" value={form.max_selections} onChange={v=>set("max_selections",v)} placeholder="No limit"/>
    <Tog label='Allow "Other" with free text' checked={!!form.allow_other} onChange={v=>set("allow_other",v)}/>
    <HelpBox>Tag-style multi-picker. Users select multiple options as coloured chips. Set a max to limit how many can be chosen.</HelpBox>
  </>;
}

function StatusConfig({ form, set }) {
  return <>
    <div>
      <Lbl>Status Options (one per line)</Lbl>
      <textarea value={form.options||""} onChange={e=>set("options",e.target.value)} placeholder={"New\nIn Progress\nDone\nClosed"} rows={5}
        style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text1,resize:"vertical",boxSizing:"border-box",lineHeight:1.6}}/>
    </div>
    <Inp label="Default Status" value={form.default_value} onChange={v=>set("default_value",v)} placeholder="First option"/>
    <Inp label='Closed / Done Status' value={form.closed_status} onChange={v=>set("closed_status",v)} placeholder="e.g. Closed, Filled"/>
    <HelpBox>Coloured status badge. The "closed" status tells pipelines and workflows when a record is complete.</HelpBox>
  </>;
}

function BooleanConfig({ form, set }) {
  return <>
    <Sel label="Display Style" value={form.bool_display||"toggle"} onChange={v=>set("bool_display",v)}
      options={[{value:"toggle",label:"Toggle switch"},{value:"checkbox",label:"Checkbox"},{value:"yesno",label:"Yes / No buttons"}]}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Inp label='Label for "True"' value={form.true_label||"Yes"} onChange={v=>set("true_label",v)}/>
      <Inp label='Label for "False"' value={form.false_label||"No"} onChange={v=>set("false_label",v)}/>
    </div>
    <HelpBox>True/false field. Customise labels — e.g. "Active / Inactive", "Eligible / Not Eligible".</HelpBox>
  </>;
}

function RatingConfig({ form, set }) {
  return <>
    <Sel label="Max Stars" value={form.max_rating||"5"} onChange={v=>set("max_rating",v)}
      options={[{value:"3",label:"3 stars"},{value:"5",label:"5 stars"},{value:"10",label:"10 stars"}]}/>
    <Sel label="Icon Style" value={form.rating_style||"stars"} onChange={v=>set("rating_style",v)}
      options={[{value:"stars",label:"★ Stars"},{value:"hearts",label:"♥ Hearts"},{value:"thumbs",label:"👍 Thumbs"}]}/>
    <Tog label="Allow half-star ratings" checked={!!form.half_stars} onChange={v=>set("half_stars",v)}/>
    <HelpBox>Visual rating input. Users click to set a score. Half-stars double the granularity (e.g. 3.5 out of 5).</HelpBox>
  </>;
}

function EmailConfig({ form, set }) {
  return <>
    <Tog label="Validate email format" checked={form.validate_email!==false} onChange={v=>set("validate_email",v)}/>
    <Tog label="Allow multiple emails" checked={!!form.allow_multiple} onChange={v=>set("allow_multiple",v)}/>
    <HelpBox>Email address field. Validates format (name@domain.com) by default. Displays as a clickable mailto: link.</HelpBox>
  </>;
}

function PhoneConfig({ form, set }) {
  return <>
    <Inp label="Validation Format" value={form.phone_format} onChange={v=>set("phone_format",v)} placeholder="e.g. +### ## ### ####"/>
    <Tog label="Allow multiple numbers" checked={!!form.allow_multiple} onChange={v=>set("allow_multiple",v)}/>
    <HelpBox>Local phone number field. Set a format pattern to guide users. Multiple numbers let you store work + mobile.</HelpBox>
  </>;
}

function PhoneIntlConfig({ form, set }) {
  return <>
    <Sel label="Default Country Code" value={form.default_country||"AE"} onChange={v=>set("default_country",v)}
      options={[
        {value:"AE",label:"🇦🇪 +971 UAE"},{value:"SA",label:"🇸🇦 +966 Saudi"},{value:"QA",label:"🇶🇦 +974 Qatar"},
        {value:"KW",label:"🇰🇼 +965 Kuwait"},{value:"BH",label:"🇧🇭 +973 Bahrain"},{value:"OM",label:"🇴🇲 +968 Oman"},
        {value:"EG",label:"🇪🇬 +20 Egypt"},{value:"GB",label:"🇬🇧 +44 UK"},{value:"US",label:"🇺🇸 +1 US"},
        {value:"IN",label:"🇮🇳 +91 India"},{value:"PK",label:"🇵🇰 +92 Pakistan"},{value:"PH",label:"🇵🇭 +63 Philippines"},
      ]}/>
    <Tog label="Validate international format" checked={form.validate_intl!==false} onChange={v=>set("validate_intl",v)}/>
    <HelpBox>International phone with country code selector. Pre-selects the default country. Validates E.164 format (+971501234567).</HelpBox>
  </>;
}

function UrlConfig({ form, set }) {
  return <>
    <Tog label="Open in new tab when clicked" checked={form.open_new_tab!==false} onChange={v=>set("open_new_tab",v)}/>
    <Sel label="URL Display" value={form.url_display||"full"} onChange={v=>set("url_display",v)}
      options={[{value:"full",label:"Show full URL"},{value:"domain",label:"Show domain only"},{value:"text",label:"Show as link text"}]}/>
    <Tog label="Require HTTPS" checked={!!form.require_https} onChange={v=>set("require_https",v)}/>
    <HelpBox>Web URL field. Renders as a clickable link. "Domain only" shows just example.com instead of the full path.</HelpBox>
  </>;
}

function SocialConfig({ form, set }) {
  return <>
    <Sel label="Platform" value={form.social_platform||"linkedin"} onChange={v=>set("social_platform",v)}
      options={SOCIAL_PLATFORMS.map(p=>({value:p.id,label:p.label}))}/>
    <HelpBox>Social profile link. Select the platform and users just type their username or profile URL. Auto-formats to the correct URL.</HelpBox>
  </>;
}

function AddressConfig({ form, set }) {
  const active = form.address_fields || ["street","city","country","postal_code"];
  return <>
    <div>
      <Lbl>Address Sub-fields</Lbl>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {ADDRESS_FIELDS_OPTIONS.map(f => {
          const on = active.includes(f.key);
          return (
            <label key={f.key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,
              border:`1px solid ${on?C.accent:C.border}`,background:on?C.accentLight:C.surface,cursor:"pointer",
              fontSize:12,color:on?C.accent:C.text2,fontWeight:on?600:400}}>
              <input type="checkbox" checked={on} onChange={()=>set("address_fields", on ? active.filter(k=>k!==f.key) : [...active, f.key])} style={{accentColor:C.accent}}/>
              {f.label}
            </label>
          );
        })}
      </div>
    </div>
    <Sel label="Default Country" value={form.default_country||""} onChange={v=>set("default_country",v)} placeholder="No default"
      options={[{value:"AE",label:"🇦🇪 UAE"},{value:"SA",label:"🇸🇦 Saudi Arabia"},{value:"GB",label:"🇬🇧 UK"},{value:"US",label:"🇺🇸 USA"},{value:"IN",label:"🇮🇳 India"}]}/>
    <Tog label="Enable geocoding / map lookup" checked={!!form.enable_geocoding} onChange={v=>set("enable_geocoding",v)}/>
    <HelpBox>Structured address with customisable sub-fields. Enable geocoding to auto-fill from a map pin (future).</HelpBox>
  </>;
}

function PeopleConfig({ form, set, objects, selEnv }) {
  const [savedLists, setSavedLists] = useState([]);
  const [linkedFields, setLinkedFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [peopleRecords, setPeopleRecords] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [pSearch, setPSearch] = useState("");

  const slug = form.related_object_slug || "people";

  // Load saved lists + fields + distinct values from the linked object
  useEffect(() => {
    if (!selEnv?.id) return;
    tFetch(`/api/objects?environment_id=${selEnv.id}`).then(r => r.json()).then(objs => {
      const obj = (Array.isArray(objs) ? objs : []).find(o => o.slug === slug);
      if (!obj) return;
      tFetch(`/api/saved-views?object_id=${obj.id}&environment_id=${selEnv.id}`).then(r => r.json())
        .then(lists => setSavedLists(Array.isArray(lists) ? lists : [])).catch(()=>{});
      tFetch(`/api/fields?object_id=${obj.id}`).then(r => r.json()).then(fields => {
        setLinkedFields(Array.isArray(fields) ? fields : []);
      });
      tFetch(`/api/records?object_id=${obj.id}&environment_id=${selEnv.id}&limit=300`).then(r => r.json()).then(res => {
        const recs = Array.isArray(res) ? res : (res?.records || []);
        const vals = {};
        recs.forEach(r => Object.entries(r.data||{}).forEach(([k,v]) => {
          if (!vals[k]) vals[k] = new Set();
          if (Array.isArray(v)) v.forEach(i => vals[k].add(String(i)));
          else if (v !== null && v !== undefined && v !== "") vals[k].add(String(v));
        }));
        const result = {};
        Object.entries(vals).forEach(([k,s]) => { result[k] = [...s].sort(); });
        setFieldValues(result);
      });
    }).catch(()=>{});
  }, [selEnv?.id, slug]);

  // Load people records when mode is "specific"
  useEffect(() => {
    if (form.people_selection_mode !== "specific" || !selEnv?.id || peopleRecords.length > 0) return;
    setLoadingPeople(true);
    tFetch(`/api/objects?environment_id=${selEnv.id}`).then(r => r.json()).then(objs => {
      const obj = (Array.isArray(objs) ? objs : []).find(o => o.slug === slug);
      if (!obj) { setLoadingPeople(false); return; }
      tFetch(`/api/records?object_id=${obj.id}&environment_id=${selEnv.id}&limit=500`).then(r => r.json()).then(res => {
        const recs = Array.isArray(res) ? res : (res?.records || []);
        setPeopleRecords(recs.map(r => ({
          id: r.id,
          name: [r.data?.first_name, r.data?.last_name].filter(Boolean).join(" ") || r.data?.name || r.data?.email || r.id,
          subtitle: [r.data?.job_title, r.data?.department, r.data?.person_type].filter(Boolean).join(" · "),
        })));
        setLoadingPeople(false);
      });
    }).catch(() => setLoadingPeople(false));
  }, [form.people_selection_mode, selEnv?.id, slug, peopleRecords.length]);

  const allowedSet = new Set(form.people_allowed_ids || []);
  const togglePerson = id => {
    const next = allowedSet.has(id)
      ? (form.people_allowed_ids||[]).filter(i => i !== id)
      : [...(form.people_allowed_ids||[]), id];
    set("people_allowed_ids", next);
  };
  const filteredPeople = peopleRecords.filter(p =>
    p.name.toLowerCase().includes(pSearch.toLowerCase()) ||
    (p.subtitle||"").toLowerCase().includes(pSearch.toLowerCase())
  );

  const MODE_OPTIONS = [
    { v:"all",        l:"All",           desc:"Everyone from the linked object" },
    { v:"saved_list", l:"Saved list",    desc:"Use a saved list as the source" },
    { v:"filter",     l:"Filter",        desc:"Match a field value" },
    { v:"specific",   l:"Specific",      desc:"Hand-pick who appears" },
  ];

  const inputStyle = { width:"100%", padding:"6px 8px", borderRadius:8, border:"1px solid #e8eaed",
    fontSize:12, fontFamily:"inherit", background:"white", color:"#1a1a2e", outline:"none" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <Sel label="Reference Object" value={slug} onChange={v=>set("related_object_slug",v)}
        options={(objects||[]).map(o=>({value:o.slug,label:o.plural_name||o.name}))}/>
      <Sel label="Selection Mode" value={form.people_multi?"multi":"single"} onChange={v=>set("people_multi",v==="multi")}
        options={[{value:"single",label:"Single select (one person)"},{value:"multi",label:"Multi select (team, panel)"}]}/>
      <Sel label="Display Format" value={form.people_display||"avatar_name"} onChange={v=>set("people_display",v)}
        options={[{value:"name",label:"Name only"},{value:"avatar_name",label:"Avatar + Name"},{value:"avatar_name_title",label:"Avatar + Name + Title"}]}/>

      {/* Picker restriction */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.04em" }}>Who appears in the picker</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {MODE_OPTIONS.map(m => (
            <button key={m.v} onClick={()=>{ set("people_selection_mode", m.v); }}
              title={m.desc}
              style={{ padding:"7px 8px", borderRadius:8, border:`2px solid ${(form.people_selection_mode||"all")===m.v?"#3b5bdb":"#e8eaed"}`,
                background:(form.people_selection_mode||"all")===m.v?"#3b5bdb":"#fff",
                color:(form.people_selection_mode||"all")===m.v?"#fff":"#6b7280",
                cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit", textAlign:"center" }}>
              {m.l}
            </button>
          ))}
        </div>

        {/* Saved list picker */}
        {(form.people_selection_mode||"all") === "saved_list" && (
          <div style={{ background:"#f8f9fc", borderRadius:8, border:"1px solid #e8eaed", padding:"10px" }}>
            {savedLists.length === 0 ? (
              <div style={{ textAlign:"center", color:"#9ca3af", fontSize:12, padding:"8px 0" }}>
                No saved lists found. Create one from the records page first.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {savedLists.map(list => {
                  const isSel = form.people_saved_list_id === list.id;
                  return (
                    <div key={list.id} onClick={()=>set("people_saved_list_id", isSel ? "" : list.id)}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8,
                        cursor:"pointer", border:`2px solid ${isSel?"#3b5bdb":"#e8eaed"}`,
                        background:isSel?"#eef2ff":"white", transition:"all .15s" }}>
                      <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${isSel?"#3b5bdb":"#d1d5db"}`,
                        background:isSel?"#3b5bdb":"white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {isSel && <div style={{ width:6, height:6, borderRadius:"50%", background:"white" }}/>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:isSel?700:500, color:"#1a1a2e" }}>{list.name}</div>
                        <div style={{ fontSize:10, color:"#9ca3af" }}>{(list.filters||[]).length} filter{(list.filters||[]).length!==1?"s":""} · {list.is_shared?"Shared":"Private"}</div>
                      </div>
                      {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  );
                })}
              </div>
            )}
            {form.people_saved_list_id && (
              <div style={{ marginTop:6, padding:"5px 8px", background:"#eef2ff", borderRadius:6, fontSize:11, color:"#3b5bdb", fontWeight:500 }}>
                People matching "{savedLists.find(l=>l.id===form.people_saved_list_id)?.name||"…"}" will appear
              </div>
            )}
          </div>
        )}

        {/* Filter by field value */}
        {(form.people_selection_mode||"all") === "filter" && (
          <div style={{ padding:"10px", background:"#f8f9fc", borderRadius:8, border:"1px solid #e8eaed" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:600, color:"#6b7280", display:"block", marginBottom:3 }}>WHERE FIELD</label>
                <select value={form.people_filter_field||""} onChange={e=>{set("people_filter_field",e.target.value);set("people_filter_value","");}} style={inputStyle}>
                  <option value="">Select field…</option>
                  {linkedFields.filter(f=>["select","multi_select","status","text","email","boolean"].includes(f.field_type)).map(f=>(
                    <option key={f.id} value={f.api_key}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:600, color:"#6b7280", display:"block", marginBottom:3 }}>EQUALS</label>
                {(() => {
                  const selField = linkedFields.find(f => f.api_key === form.people_filter_field);
                  const opts = selField && Array.isArray(selField.options) && selField.options.length > 0
                    ? selField.options
                    : (fieldValues[form.people_filter_field] || []);
                  if (opts.length > 0) return (
                    <select value={form.people_filter_value||""} onChange={e=>set("people_filter_value",e.target.value)} style={inputStyle}>
                      <option value="">Select value…</option>
                      {opts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  );
                  return <input value={form.people_filter_value||""} onChange={e=>set("people_filter_value",e.target.value)}
                    placeholder={form.people_filter_field?"Type a value…":"Select a field first"} style={inputStyle}/>;
                })()}
              </div>
            </div>
            {form.people_filter_field && form.people_filter_value && (
              <div style={{ marginTop:6, padding:"5px 8px", background:"#eef2ff", borderRadius:6, fontSize:11, color:"#3b5bdb", fontWeight:500 }}>
                Only people where <strong>{linkedFields.find(f=>f.api_key===form.people_filter_field)?.name||form.people_filter_field}</strong> = <strong>{form.people_filter_value}</strong>
              </div>
            )}
          </div>
        )}

        {/* Specific people picker */}
        {(form.people_selection_mode||"all") === "specific" && (
          <div style={{ background:"white", borderRadius:8, border:"1px solid #e8eaed", overflow:"hidden" }}>
            <div style={{ padding:"6px 8px", borderBottom:"1px solid #f0f0f0" }}>
              <input value={pSearch} onChange={e=>setPSearch(e.target.value)} placeholder="Search people…"
                style={{ ...inputStyle, padding:"5px 8px" }}/>
            </div>
            <div style={{ padding:"4px 10px", fontSize:11, color:"#3b5bdb", fontWeight:600, background:"#eef2ff", borderBottom:"1px solid #e8eaed", display:"flex", alignItems:"center", gap:8 }}>
              {allowedSet.size} selected
              {allowedSet.size > 0 && <button onClick={()=>set("people_allowed_ids",[])} style={{ background:"none", border:"none", color:"#ef4444", fontSize:11, fontWeight:600, cursor:"pointer" }}>Clear all</button>}
            </div>
            <div style={{ maxHeight:180, overflowY:"auto" }}>
              {loadingPeople ? (
                <div style={{ padding:12, color:"#9ca3af", fontSize:12, textAlign:"center" }}>Loading…</div>
              ) : filteredPeople.length === 0 ? (
                <div style={{ padding:12, color:"#9ca3af", fontSize:12, textAlign:"center" }}>{pSearch?"No matches":"No records found"}</div>
              ) : filteredPeople.map(p => {
                const checked = allowedSet.has(p.id);
                return (
                  <div key={p.id} onClick={()=>togglePerson(p.id)}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", cursor:"pointer",
                      borderBottom:"1px solid #f8f8f8", background:checked?"#eef2ff":"transparent" }}>
                    <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${checked?"#3b5bdb":"#d1d5db"}`,
                      background:checked?"#3b5bdb":"white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div style={{ width:24, height:24, borderRadius:"50%", background:checked?"#3b5bdb":"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ color:"white", fontSize:9, fontWeight:700 }}>{(p.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:checked?700:500, color:"#1a1a2e", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                      {p.subtitle && <div style={{ fontSize:10, color:"#9ca3af", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.subtitle}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <HelpBox>Links to records in another object. Use for Hiring Manager, Interviewers, Assigned To etc. Restrict who appears using "Saved list", "Filter", or "Specific" modes.</HelpBox>
    </div>
  );
}

function LookupConfig({ form, set, objects }) {
  return <>
    <Sel label="Source Object" value={form.lookup_object_slug||""} onChange={v=>set("lookup_object_slug",v)}
      placeholder="Select object…" options={(objects||[]).map(o=>({value:o.slug,label:o.plural_name||o.name}))}/>
    <Inp label="Source Field to Display" value={form.lookup_field||""} onChange={v=>set("lookup_field",v)} placeholder="e.g. department"/>
    <Sel label="Selection" value={form.lookup_multi?"multi":"single"} onChange={v=>set("lookup_multi",v==="multi")}
      options={[{value:"single",label:"Single"},{value:"multi",label:"Multiple"}]}/>
    <HelpBox>Pulls a display value from a related record. For example, show the candidate's department from their linked job.</HelpBox>
  </>;
}

function RollupConfig({ form, set, objects }) {
  return <>
    <Sel label="Source Relationship" value={form.rollup_object_slug||""} onChange={v=>set("rollup_object_slug",v)}
      placeholder="Select object…" options={(objects||[]).map(o=>({value:o.slug,label:o.plural_name||o.name}))}/>
    <Inp label="Field to Aggregate" value={form.rollup_field||""} onChange={v=>set("rollup_field",v)} placeholder="e.g. salary"/>
    <Sel label="Aggregation" value={form.rollup_function||"count"} onChange={v=>set("rollup_function",v)}
      options={[{value:"count",label:"COUNT"},{value:"sum",label:"SUM"},{value:"avg",label:"AVG"},{value:"min",label:"MIN"},{value:"max",label:"MAX"}]}/>
    <HelpBox>Aggregates data across related records. COUNT counts linked records, SUM/AVG/MIN/MAX calculate from a numeric field.</HelpBox>
  </>;
}

function CountryConfig({ form, set }) {
  return <>
    <Sel label="Region Filter" value={form.country_region||"all"} onChange={v=>set("country_region",v)} options={COUNTRY_REGIONS}/>
    <Sel label="Display Format" value={form.country_display||"flag_name"} onChange={v=>set("country_display",v)}
      options={[{value:"name",label:"Name only"},{value:"flag_name",label:"Flag + Name"},{value:"code",label:"ISO Code"}]}/>
    <HelpBox>Country picker with flag icons. Filter by region to show only relevant countries.</HelpBox>
  </>;
}

function AutoNumberConfig({ form, set }) {
  return <>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Inp label="Prefix" value={form.auto_number_prefix||""} onChange={v=>set("auto_number_prefix",v)} placeholder="e.g. CAN-"/>
      <Inp label="Starting Number" type="number" value={form.auto_number_start||"1"} onChange={v=>set("auto_number_start",v)}/>
    </div>
    <Sel label="Zero-padding" value={form.auto_number_padding||"4"} onChange={v=>set("auto_number_padding",v)}
      options={[{value:"0",label:"None (1, 2, 3)"},{value:"3",label:"3 digits (001)"},{value:"4",label:"4 digits (0001)"},{value:"6",label:"6 digits (000001)"}]}/>
    <HelpBox>Auto-incrementing number. Preview: <strong>{form.auto_number_prefix||"CAN-"}{String(form.auto_number_start||1).padStart(Number(form.auto_number_padding||4),"0")}</strong></HelpBox>
  </>;
}

function UniqueIdConfig({ form, set }) {
  return <>
    <Inp label="Format Pattern" value={form.unique_id_format||"{PREFIX}-{YYYY}-{SEQ}"} onChange={v=>set("unique_id_format",v)} placeholder="{PREFIX}-{YYYY}-{SEQ}"/>
    <Tog label="Auto-generate on record creation" checked={form.auto_generate!==false} onChange={v=>set("auto_generate",v)}/>
    <HelpBox>Unique identifier with custom format. Tokens: {"{PREFIX}"}, {"{YYYY}"}, {"{MM}"}, {"{SEQ}"}, {"{UUID}"}.</HelpBox>
  </>;
}

function DatasetConfig({ form, set, datasets }) {
  return <>
    <Sel label="Data Set Source" value={form.dataset_id||""} onChange={v=>set("dataset_id",v)}
      placeholder="Select a data set…" options={(datasets||[]).map(d=>({value:d.id,label:d.name}))}/>
    <Sel label="Selection Mode" value={form.dataset_multi?"multi":"single"} onChange={v=>set("dataset_multi",v==="multi")}
      options={[{value:"single",label:"Single select"},{value:"multi",label:"Multi select"}]}/>
    <HelpBox>Options come from a shared Data Set. Update the data set once and all linked fields update automatically.</HelpBox>
  </>;
}

function SkillsConfig({ form, set }) {
  return <>
    <Sel label="Input Mode" value={form.skills_input||"freetext"} onChange={v=>set("skills_input",v)}
      options={[{value:"freetext",label:"Free text (users type skills)"},{value:"predefined",label:"Predefined list only"},{value:"both",label:"Predefined + free text"}]}/>
    <Tog label="Allow multiple skills" checked={form.skills_multi!==false} onChange={v=>set("skills_multi",v)}/>
    <Tog label="Show proficiency level (Beginner / Intermediate / Expert)" checked={!!form.show_proficiency} onChange={v=>set("show_proficiency",v)}/>
    <Inp label="Max Skills" type="number" value={form.max_skills} onChange={v=>set("max_skills",v)} placeholder="No limit"/>
    <HelpBox>Skill tags for candidates, jobs, or roles. Enable proficiency to track skill depth.</HelpBox>
  </>;
}

function SectionConfig({ form, set }) {
  return <>
    <Inp label="Section Label" value={form.section_label||form.name||""} onChange={v=>set("section_label",v)} placeholder="e.g. Employment Details"/>
    <Tog label="Collapsible (users can hide/show)" checked={form.collapsible!==false} onChange={v=>set("collapsible",v)}/>
    <Tog label="Create as standalone panel" checked={!!form.as_panel} onChange={v=>set("as_panel",v)}/>
    {form.as_panel && (
      <div style={{ padding:"10px 12px", background:"#EEF2FF", borderRadius:8, fontSize:12, color:"#4361EE", lineHeight:1.5 }}>
        Fields in this section will appear as a separate draggable panel on the record page — independent from Profile Fields and moveable by each user.
      </div>
    )}
    <HelpBox>Visual divider in the record detail. Groups related fields under a labelled heading. No data is stored — purely for layout.</HelpBox>
  </>;
}

// ── Config panel router ───────────────────────────────────────────────────────
function TypeConfig({ fieldType, form, set, objectFields, objects, datasets, selEnv }) {
  const p = { form, set, objectFields, objects, datasets, selEnv };
  switch (fieldType) {
    case "text":             return <TextConfig {...p}/>;
    case "textarea":         return <TextareaConfig {...p}/>;
    case "rich_text":        return <RichTextConfig {...p}/>;
    case "number":           return <NumberConfig {...p}/>;
    case "currency":         return <CurrencyConfig {...p}/>;
    case "percent":          return <PercentConfig {...p}/>;
    case "formula":          return <FormulaConfig {...p}/>;
    case "progress":         return <ProgressConfig {...p}/>;
    case "date":             return <DateConfig {...p}/>;
    case "datetime":         return <DateTimeConfig {...p}/>;
    case "date_range":       return <DateRangeConfig {...p}/>;
    case "duration":         return <DurationConfig {...p}/>;
    case "select":           return <SelectConfig {...p}/>;
    case "multi_select":     return <MultiSelectConfig {...p}/>;
    case "status":           return <StatusConfig {...p}/>;
    case "boolean":          return <BooleanConfig {...p}/>;
    case "rating":           return <RatingConfig {...p}/>;
    case "email":            return <EmailConfig {...p}/>;
    case "phone":            return <PhoneConfig {...p}/>;
    case "phone_intl":       return <PhoneIntlConfig {...p}/>;
    case "url":              return <UrlConfig {...p}/>;
    case "social":           return <SocialConfig {...p}/>;
    case "address":          return <AddressConfig {...p}/>;
    case "people":           return <PeopleConfig {...p}/>;
    case "lookup":           return <LookupConfig {...p}/>;
    case "rollup":           return <RollupConfig {...p}/>;
    case "country":          return <CountryConfig {...p}/>;
    case "auto_number":      return <AutoNumberConfig {...p}/>;
    case "unique_id":        return <UniqueIdConfig {...p}/>;
    case "dataset":          return <DatasetConfig {...p}/>;
    case "skills":           return <SkillsConfig {...p}/>;
    case "section_separator": return <SectionConfig {...p}/>;
    case "table": return <TableConfig form={p.form} set={p.set}/>;
    default:                 return <HelpBox>No additional configuration needed for this field type.</HelpBox>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL — Two-step flow
// Props match existing interface: field, selEnv, selObj, onSaved, onClose
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Table column types ────────────────────────────────────────────────────────
const TABLE_COLUMN_TYPES = [
  {value:"text",    label:"Text"},
  {value:"number",  label:"Number"},
  {value:"date",    label:"Date"},
  {value:"select",  label:"Select"},
  {value:"boolean", label:"Yes/No"},
  {value:"url",     label:"URL"},
];

const TABLE_TEMPLATES = [
  { id:"work_history", label:"Work History", columns:[
    {id:"wh1",name:"Company",     type:"text",   width:180},
    {id:"wh2",name:"Job Title",   type:"text",   width:160},
    {id:"wh3",name:"From",        type:"date",   width:110},
    {id:"wh4",name:"To",          type:"date",   width:110},
    {id:"wh5",name:"Current",     type:"boolean",width:80},
    {id:"wh6",name:"Description", type:"text",   width:220},
  ]},
  { id:"education", label:"Education", columns:[
    {id:"ed1",name:"Institution",  type:"text",  width:180},
    {id:"ed2",name:"Degree",       type:"text",  width:160},
    {id:"ed3",name:"Field of Study",type:"text", width:160},
    {id:"ed4",name:"From",         type:"date",  width:110},
    {id:"ed5",name:"To",           type:"date",  width:110},
    {id:"ed6",name:"Grade",        type:"text",  width:100},
  ]},
  { id:"languages", label:"Languages", columns:[
    {id:"lg1",name:"Language",    type:"text",  width:160},
    {id:"lg2",name:"Proficiency", type:"select",width:140, options:["Native","Fluent","Intermediate","Basic"]},
    {id:"lg3",name:"Certified",   type:"boolean",width:90},
  ]},
  { id:"certifications", label:"Certifications", columns:[
    {id:"ce1",name:"Name",         type:"text",  width:200},
    {id:"ce2",name:"Issuer",       type:"text",  width:160},
    {id:"ce3",name:"Issued",       type:"date",  width:110},
    {id:"ce4",name:"Expiry",       type:"date",  width:110},
    {id:"ce5",name:"Credential ID",type:"text",  width:140},
  ]},
  { id:"publications", label:"Publications", columns:[
    {id:"pb1",name:"Title",     type:"text",  width:200},
    {id:"pb2",name:"Publisher", type:"text",  width:160},
    {id:"pb3",name:"Date",      type:"date",  width:110},
    {id:"pb4",name:"URL",       type:"url",   width:180},
  ]},
];

const _uid = () => Math.random().toString(36).slice(2,10);

const TableConfig = ({ form, set }) => {
  const cols = Array.isArray(form.table_columns) ? form.table_columns : [];
  const setCols = c => set("table_columns", c);
  const addCol = () => setCols([...cols, {id:_uid(),name:"Column",type:"text",width:150,options:[]}]);
  const removeCol = id => setCols(cols.filter(c=>c.id!==id));
  const updateCol = (id,k,v) => setCols(cols.map(c=>c.id===id?{...c,[k]:v}:c));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Start from template</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {TABLE_TEMPLATES.map(t=>(
            <button key={t.id} onClick={()=>{setCols(t.columns.map(c=>({...c,id:_uid()})));set("table_template",t.id);}}
              style={{padding:"4px 10px",borderRadius:8,border:`1.5px solid ${form.table_template===t.id?C.accent:C.border}`,
                background:form.table_template===t.id?C.accentLight:"white",
                fontSize:11,fontWeight:600,color:form.table_template===t.id?C.accent:C.text2,cursor:"pointer",fontFamily:F}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Columns ({cols.length})</div>
        {cols.length===0&&<div style={{padding:"12px",textAlign:"center",color:C.text3,fontSize:12,border:`1.5px dashed ${C.border}`,borderRadius:8}}>Pick a template above or add columns manually</div>}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {cols.map((col,i)=>(
            <div key={col.id} style={{display:"flex",alignItems:"center",gap:6,background:C.surface2,borderRadius:8,border:`1px solid ${C.border}`,padding:"8px 10px"}}>
              <span style={{color:C.text4,fontSize:12,width:18,flexShrink:0,textAlign:"center"}}>{i+1}</span>
              <input value={col.name} onChange={e=>updateCol(col.id,"name",e.target.value)} placeholder="Column name"
                style={{flex:2,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,color:C.text1,outline:"none",minWidth:0}}/>
              <select value={col.type} onChange={e=>updateCol(col.id,"type",e.target.value)}
                style={{flex:1,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,color:C.text1,background:"white",outline:"none",minWidth:0}}>
                {TABLE_COLUMN_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {col.type==="select"&&(
                <input value={(col.options||[]).join(", ")} onChange={e=>updateCol(col.id,"options",e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}
                  placeholder="Options: A, B, C"
                  style={{flex:2,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:11,fontFamily:F,color:C.text1,outline:"none",minWidth:0}}/>
              )}
              <button onClick={()=>removeCol(col.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,padding:"2px 4px",borderRadius:4,flexShrink:0,fontSize:14,lineHeight:1}}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={addCol} style={{marginTop:8,padding:"6px 14px",borderRadius:8,border:`1.5px dashed ${C.accent}`,background:C.accentLight,color:C.accent,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F,width:"100%"}}>+ Add column</button>
      </div>
      <HelpBox>Each record stores its own rows. Columns apply to all records using this field.</HelpBox>
    </div>
  );
};

// ─── Conditions (criteria) builder ────────────────────────────────────────────
const CONDITION_OPERATORS = [
  {value:"equals",       label:"equals",           showValue:true},
  {value:"not_equals",   label:"does not equal",   showValue:true},
  {value:"contains",     label:"contains",          showValue:true},
  {value:"not_contains", label:"does not contain",  showValue:true},
  {value:"starts_with",  label:"starts with",       showValue:true},
  {value:"is_empty",     label:"is empty",          showValue:false},
  {value:"is_not_empty", label:"is not empty",      showValue:false},
  {value:"greater_than", label:"is greater than",   showValue:true},
  {value:"less_than",    label:"is less than",      showValue:true},
  {value:"in",           label:"is one of (comma-separated)", showValue:true},
];

const ConditionsConfig = ({ form, set, objectFields }) => {
  const conditions = (form.conditions && form.conditions.rules) ? form.conditions : { logic:"AND", rules:[] };
  const setCond = c => set("conditions", c);
  const otherFields = objectFields.filter(f => f.api_key !== form.api_key && f.field_type !== "section_separator" && f.field_type !== "table");
  const addRule = () => setCond({...conditions, rules:[...conditions.rules,{field:"",operator:"equals",value:""}]});
  const removeRule = i => setCond({...conditions, rules:conditions.rules.filter((_,j)=>j!==i)});
  const updateRule = (i,k,v) => setCond({...conditions, rules:conditions.rules.map((r,j)=>j===i?{...r,[k]:v}:r)});

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em"}}>Visibility Conditions</div>
      <div style={{fontSize:12,color:C.text3,lineHeight:1.5}}>This field is hidden unless ALL (or ANY) of these conditions are met. Leave empty to always show.</div>
      {conditions.rules.length>0&&(
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:C.text2,fontWeight:600}}>Show when</span>
          {["AND","OR"].map(op=>(
            <button key={op} onClick={()=>setCond({...conditions,logic:op})}
              style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,
                border:`1.5px solid ${conditions.logic===op?C.accent:C.border}`,
                background:conditions.logic===op?C.accentLight:"white",
                color:conditions.logic===op?C.accent:C.text3,cursor:"pointer",fontFamily:F}}>
              {op}
            </button>
          ))}
          <span style={{fontSize:12,color:C.text2,fontWeight:600}}>of these are true:</span>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {conditions.rules.map((rule,i)=>{
          const opMeta=CONDITION_OPERATORS.find(o=>o.value===rule.operator)||CONDITION_OPERATORS[0];
          const tf=otherFields.find(f=>f.api_key===rule.field);
          const tfOpts=tf?Array.isArray(tf.options)?tf.options:String(tf.options||"").split("\n").filter(Boolean):[];
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:C.surface2,borderRadius:8,border:`1px solid ${C.border}`,padding:"8px 10px"}}>
              <select value={rule.field} onChange={e=>updateRule(i,"field",e.target.value)}
                style={{flex:2,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,color:rule.field?C.text1:C.text3,background:"white",outline:"none",minWidth:0}}>
                <option value="">Pick field…</option>
                {otherFields.map(f=><option key={f.id} value={f.api_key}>{f.name}</option>)}
              </select>
              <select value={rule.operator} onChange={e=>updateRule(i,"operator",e.target.value)}
                style={{flex:2,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,color:C.text1,background:"white",outline:"none",minWidth:0}}>
                {CONDITION_OPERATORS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {opMeta.showValue&&(
                tfOpts.length>0
                  ?<select value={rule.value} onChange={e=>updateRule(i,"value",e.target.value)}
                      style={{flex:2,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,color:C.text1,background:"white",outline:"none",minWidth:0}}>
                      <option value="">Any value</option>
                      {tfOpts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  :<input value={rule.value} onChange={e=>updateRule(i,"value",e.target.value)} placeholder="Value…"
                      style={{flex:2,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,color:C.text1,outline:"none",minWidth:0}}/>
              )}
              <button onClick={()=>removeRule(i)} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,padding:"2px 4px",borderRadius:4,flexShrink:0,fontSize:14,lineHeight:1}}>✕</button>
            </div>
          );
        })}
      </div>
      <button onClick={addRule} style={{padding:"6px 14px",borderRadius:8,border:`1.5px dashed ${C.accent}`,background:C.accentLight,color:C.accent,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F,alignSelf:"flex-start"}}>+ Add condition</button>
    </div>
  );
};

// ─── VisibilityPanel ───────────────────────────────────────────────────────────
function VisibilityPanel({ roles, roleVisibility, setRoleVisibility }) {
  const [tab, setTab] = React.useState("roles"); // "roles" | "users" | "groups"
  const allHidden  = roles.every(r => !!roleVisibility[r.id]);
  const someHidden = roles.some(r => !!roleVisibility[r.id]);

  const toggleAll = () => {
    if (allHidden) {
      // clear all → everyone visible
      setRoleVisibility({});
    } else {
      // hide all
      const all = {};
      roles.forEach(r => { all[r.id] = true; });
      setRoleVisibility(all);
    }
  };

  const RoleRow = ({ r }) => {
    const isHidden = !!roleVisibility[r.id];
    return (
      <div onClick={()=>setRoleVisibility(v=>({...v,[r.id]:!v[r.id]}))}
        style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
          borderRadius:8,border:`1px solid ${isHidden?"#fecaca":C.border}`,
          background:isHidden?"#fff5f5":"white",cursor:"pointer",transition:"all .12s",marginBottom:4}}>
        <div style={{width:16,height:16,borderRadius:4,flexShrink:0,
          border:`2px solid ${isHidden?"#ef4444":C.accent}`,
          background:isHidden?"#ef4444":`${C.accent}15`,
          display:"flex",alignItems:"center",justifyContent:"center"}}>
          {isHidden
            ? <svg width={9} height={9} viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth={3}><path d='M18 6L6 18M6 6l12 12'/></svg>
            : <svg width={9} height={9} viewBox='0 0 24 24' fill='none' stroke={C.accent} strokeWidth={3}><path d='M20 6L9 17l-5-5'/></svg>
          }
        </div>
        <span style={{flex:1,fontSize:13,fontWeight:500,color:isHidden?"#ef4444":C.text1}}>{r.name}</span>
        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,
          color:isHidden?"#ef4444":C.accent,
          background:isHidden?"#fee2e2":`${C.accent}10`}}>
          {isHidden?"HIDDEN":"visible"}
        </span>
      </div>
    );
  };

  return (
    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.text1}}>Visibility</div>
          <div style={{fontSize:11,color:C.text3,marginTop:1}}>
            Hidden roles/users cannot see this field in records or API responses.
          </div>
        </div>
        {/* Select all / none */}
        <button onClick={toggleAll}
          style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:7,
            border:`1px solid ${C.border}`,background:"white",cursor:"pointer",
            color:allHidden?"#ef4444":C.accent,fontFamily:"inherit",whiteSpace:"nowrap"}}>
          {allHidden ? "Show all" : someHidden ? "Hide all" : "Hide all"}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",gap:2,background:"#f3f4f6",borderRadius:8,padding:3,marginBottom:12}}>
        {[{id:"roles",label:"Roles"},{id:"users",label:"Specific Users"},{id:"groups",label:"Groups"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",
              fontFamily:"inherit",fontSize:11,fontWeight:600,transition:"all .12s",
              background:tab===t.id?"white":"transparent",
              color:tab===t.id?C.accent:"#6b7280",
              boxShadow:tab===t.id?"0 1px 3px rgba(0,0,0,.1)":"none"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Roles tab */}
      {tab==="roles" && (
        <div>
          {roles.map(r => <RoleRow key={r.id} r={r}/>)}
        </div>
      )}

      {/* Users tab */}
      {tab==="users" && (
        <div style={{padding:"12px",background:"#f8f9fc",borderRadius:8,border:`1px solid ${C.border}`,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.text3,marginBottom:6}}>User-specific overrides</div>
          <div style={{fontSize:11,color:C.text3}}>
            Coming soon — per-user visibility overrides will let you show or hide this field for individual users regardless of their role.
          </div>
        </div>
      )}

      {/* Groups tab */}
      {tab==="groups" && (
        <div style={{padding:"12px",background:"#f8f9fc",borderRadius:8,border:`1px solid ${C.border}`,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.text3,marginBottom:6}}>Group-based visibility</div>
          <div style={{fontSize:11,color:C.text3}}>
            Coming soon — org unit / team-based visibility will allow field access to be restricted by department or team group.
          </div>
        </div>
      )}
    </div>
  );
}

export default function FieldModal({ field, selEnv, selObj, onSaved, onClose }) {
  const isEdit = !!field?.id;
  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [saving, setSaving] = useState(false);
  const [autoKey, setAutoKey] = useState(!isEdit);
  const [datasets, setDatasets] = useState([]);
  const [objects, setObjects] = useState([]);
  const [objectFields, setObjectFields] = useState([]);
  const [roles, setRoles] = useState([]);             // all roles
  const [roleVisibility, setRoleVisibility] = useState({}); // role_id → true=hidden

  // ── Form state with all type-specific extras ────────────────────────────
  const [form, setForm] = useState(() => {
    const base = {
      name: field?.name||"", api_key: field?.api_key||"", field_type: field?.field_type||"text",
      is_required: field?.is_required||false, show_in_list: field?.show_in_list!==undefined?!!field.show_in_list:true,
      placeholder: field?.placeholder||"", help_text: field?.help_text||"", default_value: field?.default_value||"",
      options: field?.options ? (Array.isArray(field.options) ? field.options.join("\n") : field.options) : "",
    };
    // Merge all extra type-specific config from existing field
    const extras = [
      "max_length","validation_pattern","min_rows","enable_markdown","toolbar_options",
      "min_value","max_value","decimal_places","step_increment","show_separator",
      "currency_code","show_symbol","restrict_range","formula_expression","formula_output_type",
      "threshold_red","threshold_amber","date_format","allow_past","allow_future","default_today",
      "time_format","timezone","date_range_start_label","date_range_end_label","calc_duration",
      "duration_unit","duration_input","max_selections","allow_other","closed_status",
      "bool_display","true_label","false_label","max_rating","rating_style","half_stars",
      "validate_email","allow_multiple","phone_format","default_country","validate_intl",
      "open_new_tab","url_display","require_https","social_platform","address_fields","enable_geocoding",
      "related_object_slug","people_multi","people_display","people_filter_field","people_filter_value",
      "people_selection_mode","people_allowed_ids","people_saved_list_id",
      "lookup_object_slug","lookup_field","lookup_multi",
      "rollup_object_slug","rollup_field","rollup_function","country_region","country_display",
      "auto_number_prefix","auto_number_start","auto_number_padding","unique_id_format","auto_generate",
      "dataset_id","dataset_multi","skills_input","skills_multi","show_proficiency","max_skills",
      "skills_categories","section_label","collapsible","as_panel",
      "table_columns","table_template","conditions",
    ];
    extras.forEach(k => { if (field?.[k] !== undefined) base[k] = field[k]; });
    return base;
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleName = v => { set("name", v); if (autoKey) set("api_key", v.toLowerCase().replace(/[^a-z0-9]/g,"_").replace(/__+/g,"_").replace(/^_|_$/g,"")); };
  const handleTypeSelect = v => { set("field_type", v); setStep(2); };

  // ── Load supporting data ────────────────────────────────────────────────
  useEffect(() => {
    if (selEnv?.id) {
      tFetch(`/api/datasets?environment_id=${selEnv.id}`).then(r=>r.json()).then(d=>setDatasets(Array.isArray(d)?d:[])).catch(()=>{});
      tFetch(`/api/objects?environment_id=${selEnv.id}`).then(r=>r.json()).then(d=>setObjects(Array.isArray(d)?d:[])).catch(()=>{});
      tFetch(`/api/roles`).then(r=>r.json()).then(d=>setRoles(Array.isArray(d)?d:[])).catch(()=>{});
    }
  }, [selEnv?.id]);

  // Load existing visibility rules when editing an existing field
  useEffect(() => {
    if (!isEdit || !field?.id || !selObj?.id) return;
    tFetch(`/api/field-visibility?object_id=${selObj.id}`)
      .then(r=>r.json())
      .then(rules => {
        const vis = {};
        (Array.isArray(rules) ? rules : []).forEach(r => {
          if (r.field_id === field.id && r.hidden) vis[r.role_id] = true;
        });
        setRoleVisibility(vis);
      }).catch(()=>{});
  }, [field?.id, selObj?.id]);

  useEffect(() => {
    if (selObj?.id) {
      tFetch(`/api/fields?object_id=${selObj.id}`).then(r=>r.json()).then(d=>setObjectFields(Array.isArray(d)?d:[])).catch(()=>{});
    }
  }, [selObj?.id]);

  // ── Save handler — matches existing API contract ────────────────────────
  const handleSave = async () => {
    if (!form.name || !selObj?.id || !selEnv?.id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        object_id: selObj.id,
        environment_id: selEnv.id,
        // Convert newline-separated options to array for select types
        options: ["select","multi_select","status"].includes(form.field_type)
          ? (form.options||"").split("\n").map(s=>s.trim()).filter(Boolean) : undefined,
        // People field specifics
        related_object_slug: form.field_type==="people" ? (form.related_object_slug||"people") : undefined,
        people_multi: form.field_type==="people" ? form.people_multi : undefined,
        people_display: form.field_type==="people" ? form.people_display : undefined,
        people_filter_field: form.field_type==="people" ? form.people_filter_field : undefined,
        people_filter_value: form.field_type==="people" ? form.people_filter_value : undefined,
        people_selection_mode: form.field_type==="people" ? form.people_selection_mode : undefined,
        people_allowed_ids: form.field_type==="people" ? form.people_allowed_ids : undefined,
        people_saved_list_id: form.field_type==="people" ? form.people_saved_list_id : undefined,
        // Other type-specific
        dataset_id: form.field_type==="dataset" ? form.dataset_id : undefined,
        dataset_multi: form.field_type==="dataset" ? form.dataset_multi : undefined,
        skills_multi: form.field_type==="skills" ? form.skills_multi : undefined,
        skills_categories: form.field_type==="skills" ? form.skills_categories : undefined,
        formula_expression: form.field_type==="formula" ? form.formula_expression : undefined,
        formula_output_type: form.field_type==="formula" ? (form.formula_output_type||"auto") : undefined,
        auto_number_prefix: form.field_type==="auto_number" ? form.auto_number_prefix : undefined,
        auto_number_padding: form.field_type==="auto_number" ? (form.auto_number_padding||4) : undefined,
        duration_unit: form.field_type==="duration" ? (form.duration_unit||"days") : undefined,
        date_range_start_label: form.field_type==="date_range" ? form.date_range_start_label : undefined,
        date_range_end_label: form.field_type==="date_range" ? form.date_range_end_label : undefined,
        social_platform: form.field_type==="social" ? (form.social_platform||"linkedin") : undefined,
        address_fields: form.field_type==="address" ? (form.address_fields||["street","city","country","postal_code"]) : undefined,
        section_label: form.field_type==="section_separator" ? (form.section_label||form.name) : undefined,
        as_panel:      form.field_type==="section_separator" ? (!!form.as_panel) : undefined,
        table_columns: form.field_type==="table" ? (form.table_columns || []) : undefined,
        table_template: form.field_type==="table" ? (form.table_template||null) : undefined,
        conditions: form.conditions || null,
      };
      const result = isEdit
        ? await api.patch(`/fields/${field.id}`, payload)
        : await api.post("/fields", payload);
      if (result?.error) { alert(`Could not save field: ${result.error}`); setSaving(false); return; }

      // Save role visibility — use saved field id (new field = result.id, edit = field.id)
      const savedFieldId = result?.id || field?.id;
      if (savedFieldId && selObj?.id && roles.length > 0) {
        // Build rules array: hidden only for roles where roleVisibility[role_id] is true
        const visRules = roles.map(r => ({ field_id: savedFieldId, hidden: !!roleVisibility[r.id] }));
        // Group by role and save each role's rule
        await Promise.all(roles.map(r =>
          api.put('/field-visibility', {
            role_id: r.id,
            object_id: selObj.id,
            rules: [{ field_id: savedFieldId, hidden: !!roleVisibility[r.id] }],
          })
        ));
      }

      onSaved();
      onClose();
    } catch (e) { alert(`Could not save field: ${e.message}`); }
    setSaving(false);
  };

  const selectedType = findType(form.field_type);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:step===1?580:640,
        maxHeight:"90vh",display:"flex",flexDirection:"column",
        boxShadow:"0 25px 60px rgba(0,0,0,.18)",fontFamily:F,overflow:"hidden",
        transition:"max-width .2s ease"}}>

        {/* ── Header ── */}
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {step === 2 && !isEdit && (
              <button onClick={()=>setStep(1)}
                style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,
                  padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:600,
                  color:C.accent,fontFamily:F,display:"flex",alignItems:"center",gap:4}}>
                ← Type
              </button>
            )}
            <div>
              <div style={{fontSize:16,fontWeight:700,color:C.text1,
                fontFamily:"'Space Grotesk', sans-serif",letterSpacing:"-0.3px"}}>
                {step === 1 ? "Choose Field Type" : isEdit ? `Edit: ${field.name}` : "Configure Field"}
              </div>
              {step === 2 && (
                <div style={{fontSize:12,color:C.text3,marginTop:2,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14}}>{selectedType.icon}</span>
                  <span style={{fontWeight:600,color:C.accent}}>{selectedType.label}</span>
                  <span>— {selectedType.desc}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
            padding:6,borderRadius:8,color:C.text3,fontSize:18,lineHeight:1}}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{flex:1,overflowY:"auto",padding:24}}>
          {step === 1 ? (
            <TypePicker selected={form.field_type} onSelect={handleTypeSelect}/>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {/* Field name + API key */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Inp label="Field Name" value={form.name} onChange={handleName} required placeholder="e.g. Current Title"/>
                <Inp label="API Key" value={form.api_key}
                  onChange={v=>{set("api_key",v);setAutoKey(false);}}
                  disabled={isEdit && field?.is_system} placeholder="e.g. current_title"/>
              </div>

              {/* ── Type-specific config ── */}
              <div style={{padding:16,background:C.surface2,borderRadius:12,border:`1px solid ${C.border}`,
                display:"flex",flexDirection:"column",gap:14}}>
                <div style={{fontSize:12,fontWeight:700,color:C.text2,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:15}}>{selectedType.icon}</span>
                  {selectedType.label} Settings
                </div>
                <TypeConfig fieldType={form.field_type} form={form} set={set}
                  objectFields={objectFields} objects={objects} datasets={datasets} selEnv={selEnv}/>
              </div>

              {/* ── Common settings (collapsible) ── */}
              <details style={{borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                <summary style={{padding:"12px 16px",cursor:"pointer",fontSize:12,fontWeight:700,
                  color:C.text3,background:C.surface2,listStyle:"none",display:"flex",
                  alignItems:"center",gap:8,userSelect:"none"}}>
                  <span style={{fontSize:10}}>▶</span> Advanced Settings
                </summary>
                <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <Inp label="Placeholder" value={form.placeholder} onChange={v=>set("placeholder",v)} placeholder="Shown when field is empty"/>
                    <Inp label="Help Text" value={form.help_text} onChange={v=>set("help_text",v)} placeholder="Guidance for users"/>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:16}}>
                    <Tog label="Required" checked={!!form.is_required} onChange={v=>set("is_required",v)}/>
                    <Tog label="Show in list view" checked={form.show_in_list!==false} onChange={v=>set("show_in_list",v)}/>
                  </div>
                  {/* Visibility conditions */}
                  {!["section_separator","table"].includes(form.field_type) && (
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                      <ConditionsConfig form={form} set={set} objectFields={objectFields}/>
                    </div>
                  )}
                  {/* ── Role Visibility ── */}
                  {roles.length > 0 && (
                    <VisibilityPanel
                      roles={roles}
                      roleVisibility={roleVisibility}
                      setRoleVisibility={setRoleVisibility}
                    />
                  )}
                </div>
              </details>
            </div>
          )}
        </div>


        {/* ── Footer ── */}
        <div style={{padding:"16px 24px",borderTop:`1px solid ${C.border}`,display:"flex",
          justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <button onClick={onClose}
            style={{padding:"9px 20px",borderRadius:10,border:`1.5px solid ${C.border}`,
              background:"transparent",color:C.text2,fontSize:13,fontWeight:600,
              cursor:"pointer",fontFamily:F}}>Cancel</button>

          {step === 1 ? (
            <button onClick={()=>setStep(2)} disabled={!form.field_type}
              style={{padding:"9px 24px",borderRadius:10,border:"none",
                background:C.accent,color:"white",fontSize:13,fontWeight:700,
                cursor:"pointer",fontFamily:F,opacity:form.field_type?1:.5}}>
              Next →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || !form.name || !form.api_key}
              style={{padding:"9px 24px",borderRadius:10,border:"none",
                background:C.accent,color:"white",fontSize:13,fontWeight:700,
                cursor:"pointer",fontFamily:F,opacity:(saving||!form.name||!form.api_key)?.5:1,
                display:"flex",alignItems:"center",gap:6}}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Field"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
