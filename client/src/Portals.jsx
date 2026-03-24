import { useState, useEffect, useRef, useCallback } from "react";
import api from './apiClient.js';
const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg:"#F3F4F8", surface:"#FFFFFF", surface2:"#F8F9FC",
  border:"#E8ECF8", border2:"#D1D5DB",
  text1:"#0F1729", text2:"#374151", text3:"#9CA3AF",
  accent:"#4361EE", accentLight:"#EEF2FF", accentDark:"#3A56E8",
  green:"#0CAF77", greenLight:"#ECFDF5",
  red:"#EF4444", redLight:"#FEF2F2",
  amber:"#F79009", amberLight:"#FFFBEB",
};

const PADDING_OPTS = [
  { value:"none", label:"None",    py:"0px" },
  { value:"sm",   label:"Small",   py:"24px" },
  { value:"md",   label:"Medium",  py:"56px" },
  { value:"lg",   label:"Large",   py:"96px" },
  { value:"xl",   label:"X-Large", py:"140px" },
];

const COLUMN_PRESETS = [
  { id:"1",   label:"Full width",  icon:"▬",   cols:1 },
  { id:"2",   label:"Two halves",  icon:"▬▬",  cols:2 },
  { id:"3",   label:"Three cols",  icon:"▬▬▬", cols:3 },
  { id:"1-2", label:"⅓ + ⅔",      icon:"▭▬",  cols:2 },
  { id:"2-1", label:"⅔ + ⅓",      icon:"▬▭",  cols:2 },
];

const WIDGET_TYPES = [
  { type:"hero",         label:"Hero",          icon:"mountain",  desc:"Headline, subheading & CTA" },
  { type:"text",         label:"Rich Text",      icon:"align",     desc:"Copy & content blocks" },
  { type:"rich_text",    label:"Article",        icon:"fileText",  desc:"Markdown content with headings" },
  { type:"image",        label:"Image",          icon:"image",     desc:"Photo or illustration" },
  { type:"jobs",         label:"List",           icon:"briefcase", desc:"Records from any saved list" },
  { type:"form",         label:"Form",           icon:"form",      desc:"Linked to any object" },
  { type:"stats",        label:"Stats",          icon:"bar2",      desc:"Numbers & social proof" },
  { type:"testimonials", label:"Testimonials",   icon:"quote",     desc:"Employee quotes & stories" },
  { type:"team",         label:"Team",           icon:"users2",    desc:"People from records" },
  { type:"video",        label:"Video",          icon:"play",      desc:"YouTube or Vimeo embed" },
  { type:"map_embed",    label:"Map",            icon:"map",       desc:"Google Maps office location" },
  { type:"cta_banner",   label:"CTA Banner",     icon:"megaphone", desc:"Full-width call to action" },
  { type:"divider",      label:"Divider",        icon:"minus",     desc:"Horizontal separator" },
  { type:"spacer",       label:"Spacer",         icon:"square",    desc:"Blank vertical space" },
];

const FONT_OPTS = [
  { value:"'Geist', sans-serif",           label:"Geist (Vercentic)" },
  { value:"'Inter', sans-serif",             label:"Inter" },
  { value:"'Plus Jakarta Sans', sans-serif", label:"Jakarta Sans" },
  { value:"'Outfit', sans-serif",            label:"Outfit" },
  { value:"'Raleway', sans-serif",           label:"Raleway" },
  { value:"'Sora', sans-serif",              label:"Sora" },
  { value:"'Playfair Display', serif",       label:"Playfair Display" },
  { value:"'Lora', serif",                   label:"Lora" },
  { value:"'Space Grotesk', sans-serif",     label:"Space Grotesk" },
];

const RADIUS_OPTS = [
  { value:"0px",   label:"Sharp" },
  { value:"4px",   label:"Subtle" },
  { value:"8px",   label:"Rounded" },
  { value:"14px",  label:"Soft" },
  { value:"999px", label:"Pill" },
];

const BUTTON_STYLES = [
  { value:"filled",    label:"Filled" },
  { value:"outline",   label:"Outline" },
  { value:"ghost",     label:"Ghost" },
  { value:"underline", label:"Underline" },
];

const PALETTES = [
  { name:"Indigo",   primary:"#4361EE", secondary:"#7C3AED", bg:"#FFFFFF", text:"#0F1729" },
  { name:"Slate",    primary:"#334155", secondary:"#64748B", bg:"#F8FAFC", text:"#0F172A" },
  { name:"Rose",     primary:"#E11D48", secondary:"#F43F5E", bg:"#FFFFFF", text:"#1C1917" },
  { name:"Teal",     primary:"#0D9488", secondary:"#0891B2", bg:"#F0FDFA", text:"#134E4A" },
  { name:"Amber",    primary:"#D97706", secondary:"#B45309", bg:"#FFFBEB", text:"#1C1917" },
  { name:"Violet",   primary:"#7C3AED", secondary:"#4361EE", bg:"#FAF5FF", text:"#1E1B4B" },
  { name:"Midnight", primary:"#6366F1", secondary:"#818CF8", bg:"#0F172A", text:"#F1F5F9" },
  { name:"Forest",   primary:"#16A34A", secondary:"#15803D", bg:"#F0FDF4", text:"#14532D" },
];







const uid = () => Math.random().toString(36).slice(2,10);

// ─── Defaults ─────────────────────────────────────────────────────────────────
const defaultTheme = () => ({
  primaryColor:"#4361EE", secondaryColor:"#7C3AED",
  bgColor:"#FFFFFF", textColor:"#0F1729", accentColor:"#F79009",
  fontFamily:"'Geist', sans-serif", headingFont:"'Geist', sans-serif",
  fontSize:"16px", headingWeight:"700",
  borderRadius:"8px", buttonStyle:"filled", buttonRadius:"8px",
  maxWidth:"1200px",
});
const defaultCell = () => ({ id:uid(), widgetType:null, widgetConfig:{} });
const defaultRow  = (preset="1") => ({
  id:uid(), preset,
  bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
  cells: preset==="1" ? [defaultCell()] : [defaultCell(), defaultCell()],
});
const defaultPage = () => ({ id:uid(), name:"Home", slug:"/", rows:[defaultRow("1")], seo:{ title:"", description:"", ogImage:"" } });

// ─── Portal Templates ─────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "career_site",
    name: "Career Site",
    desc: "Branded job listings, company story and application experience",
    icon: "🌐",
    accent: "#4361EE",
    tags: ["Public", "Jobs", "Apply"],
    theme: {
      primaryColor:"#4361EE", secondaryColor:"#7C3AED",
      bgColor:"#FFFFFF", textColor:"#0F1729", accentColor:"#F79009",
      fontFamily:"'Plus Jakarta Sans', sans-serif", headingFont:"'Plus Jakarta Sans', sans-serif",
      fontSize:"16px", headingWeight:"700",
      borderRadius:"10px", buttonStyle:"filled", buttonRadius:"10px", maxWidth:"1200px",
    },
    pages: [
      { id:"p1", name:"Home", slug:"/", rows:[
        { id:"r1", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"xl",
          cells:[{ id:"c1", widgetType:"hero", widgetConfig:{ headline:"Find Your Next Opportunity", subheading:"Join a team building something meaningful. Explore open roles across engineering, product, design and more.", ctaText:"See Open Roles" }}]},
        { id:"r2", preset:"1", bgColor:"#F8F9FF", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[{ id:"c2", widgetType:"stats", widgetConfig:{ stats:[{value:"500+",label:"Team Members"},{value:"12",label:"Global Offices"},{value:"40+",label:"Nationalities"},{value:"4.8★",label:"Glassdoor"}]}}]},
        { id:"r3", preset:"2", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c3", widgetType:"text", widgetConfig:{ heading:"Why work with us?", content:"We believe great work happens when talented people have the freedom to do their best work. We offer flexible hours, competitive pay, and a culture built on trust and transparency." }},
            { id:"c4", widgetType:"image", widgetConfig:{ url:"" }},
          ]},
        { id:"r4", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c5", widgetType:"jobs", widgetConfig:{}}]},
        { id:"r5", preset:"1", bgColor:"#0F1729", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c6", widgetType:"text", widgetConfig:{ heading:"Ready to apply?", content:"We review every application carefully. If there's a match, our team will be in touch within 5 business days." }}]},
      ]},
      { id:"p2", name:"Apply", slug:"/apply", rows:[
        { id:"r6", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c7", widgetType:"form", widgetConfig:{ title:"Submit Your Application" }}]},
      ]},
    ],
  },

  {
    id: "hm_portal",
    name: "Hiring Manager Portal",
    desc: "Review candidates, leave feedback and manage your open requisitions",
    icon: "💼",
    accent: "#334155",
    tags: ["Internal", "Review", "Feedback"],
    theme: {
      primaryColor:"#334155", secondaryColor:"#475569",
      bgColor:"#F8FAFC", textColor:"#0F172A", accentColor:"#6366F1",
      fontFamily:"'Inter', sans-serif", headingFont:"'Inter', sans-serif",
      fontSize:"15px", headingWeight:"600",
      borderRadius:"8px", buttonStyle:"filled", buttonRadius:"6px", maxWidth:"1100px",
    },
    pages: [
      { id:"p1", name:"Dashboard", slug:"/", rows:[
        { id:"r1", preset:"1", bgColor:"#1E293B", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[{ id:"c1", widgetType:"hero", widgetConfig:{ headline:"Hiring Manager Portal", subheading:"Your candidates, interviews and open roles — all in one place.", ctaText:"View Open Roles" }}]},
        { id:"r2", preset:"3", bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[
            { id:"c2", widgetType:"stats", widgetConfig:{ stats:[{value:"8",label:"Open Reqs"}]}},
            { id:"c3", widgetType:"stats", widgetConfig:{ stats:[{value:"24",label:"In Pipeline"}]}},
            { id:"c4", widgetType:"stats", widgetConfig:{ stats:[{value:"6",label:"This Week"}]}},
          ]},
        { id:"r3", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[{ id:"c5", widgetType:"jobs", widgetConfig:{}}]},
      ]},
      { id:"p2", name:"Feedback", slug:"/feedback", rows:[
        { id:"r4", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c6", widgetType:"form", widgetConfig:{ title:"Interview Scorecard" }}]},
      ]},
    ],
  },

  {
    id: "onboarding",
    name: "Onboarding Portal",
    desc: "Welcome new hires with a guided post-offer journey and document collection",
    icon: "🚀",
    accent: "#0D9488",
    tags: ["New Hire", "Documents", "Welcome"],
    theme: {
      primaryColor:"#0D9488", secondaryColor:"#0891B2",
      bgColor:"#F0FDFA", textColor:"#134E4A", accentColor:"#F59E0B",
      fontFamily:"'Outfit', sans-serif", headingFont:"'Outfit', sans-serif",
      fontSize:"16px", headingWeight:"700",
      borderRadius:"12px", buttonStyle:"filled", buttonRadius:"999px", maxWidth:"960px",
    },
    pages: [
      { id:"p1", name:"Welcome", slug:"/", rows:[
        { id:"r1", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"xl",
          cells:[{ id:"c1", widgetType:"hero", widgetConfig:{ headline:"Welcome to the team! 👋", subheading:"We're so excited to have you on board. This portal will guide you through everything you need to do before Day 1.", ctaText:"Get Started" }}]},
        { id:"r2", preset:"3", bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[
            { id:"c2", widgetType:"stats", widgetConfig:{ stats:[{value:"Step 1",label:"Upload Documents"}]}},
            { id:"c3", widgetType:"stats", widgetConfig:{ stats:[{value:"Step 2",label:"Complete Profile"}]}},
            { id:"c4", widgetType:"stats", widgetConfig:{ stats:[{value:"Step 3",label:"Meet the Team"}]}},
          ]},
        { id:"r3", preset:"2", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c5", widgetType:"text", widgetConfig:{ heading:"Before Day 1", content:"Complete your onboarding checklist at your own pace. Our People team is available if you have any questions — just reply to your welcome email." }},
            { id:"c6", widgetType:"team", widgetConfig:{}},
          ]},
      ]},
      { id:"p2", name:"Documents", slug:"/documents", rows:[
        { id:"r4", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c7", widgetType:"form", widgetConfig:{ title:"Upload Your Documents" }}]},
      ]},
    ],
  },

  {
    id: "agency",
    name: "Agency Portal",
    desc: "Let agencies submit candidates against open roles with full pipeline visibility",
    icon: "🤝",
    accent: "#D97706",
    tags: ["Agency", "Submit", "External"],
    theme: {
      primaryColor:"#D97706", secondaryColor:"#B45309",
      bgColor:"#FFFBEB", textColor:"#1C1917", accentColor:"#0D9488",
      fontFamily:"'Raleway', sans-serif", headingFont:"'Raleway', sans-serif",
      fontSize:"16px", headingWeight:"700",
      borderRadius:"8px", buttonStyle:"outline", buttonRadius:"8px", maxWidth:"1100px",
    },
    pages: [
      { id:"p1", name:"Home", slug:"/", rows:[
        { id:"r1", preset:"1", bgColor:"#78350F", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c1", widgetType:"hero", widgetConfig:{ headline:"Agency Submission Portal", subheading:"Submit candidates for active roles and track your submissions through our hiring pipeline.", ctaText:"View Open Roles" }}]},
        { id:"r2", preset:"2", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c2", widgetType:"stats", widgetConfig:{ stats:[{value:"12",label:"Active Roles"},{value:"48h",label:"Avg Response"}]}},
            { id:"c3", widgetType:"text", widgetConfig:{ heading:"How it works", content:"Browse open roles below, then use the submission form to share your candidate's details. We'll review and respond within 48 hours with next steps." }},
          ]},
        { id:"r3", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[{ id:"c4", widgetType:"jobs", widgetConfig:{}}]},
      ]},
      { id:"p2", name:"Submit Candidate", slug:"/submit", rows:[
        { id:"r4", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c5", widgetType:"form", widgetConfig:{ title:"Submit a Candidate" }}]},
      ]},
    ],
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = ({ n, s=16, c="currentColor" }) => {
  const p = {
    plus:"M12 5v14M5 12h14", x:"M18 6L6 18M6 6l12 12",
    edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    copy:"M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2",
    grip:"M9 5h2M9 12h2M9 19h2M15 5h2M15 12h2M15 19h2",
    chevD:"M6 9l6 6 6-6", chevR:"M9 18l6-6-6-6",
    arrowL:"M19 12H5M12 19l-7-7 7-7",
    palette:"M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2c1.1 0 2 .9 2 2 0 .55-.225 1.05-.585 1.415A2 2 0 0015 7h1a5 5 0 015 5c0 4.418-4.03 8-9 8z",
    settings:"M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
    check:"M20 6L9 17l-5-5", zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    globe:"M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
    briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
    image:"M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z",
    bar2:"M18 20V10M12 20V4M6 20v-6",
    users2:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z",
    play:"M5 3l14 9-14 9V3z",
    minus:"M5 12h14",
    square:"M3 3h18v18H3z",
    align:"M17 10H3M21 6H3M21 14H3M17 18H3",
    mountain:"M3 18l4-8 4 4 4-6 5 10H3z",
    form:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    menu:"M3 12h18M3 6h18M3 18h18",
    footer2:"M3 3h18v4H3zM3 17h18v4H3zM3 10h18v4H3z",
    externalLink:"M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
    monitor:"M20 3H4a1 1 0 00-1 1v12a1 1 0 001 1h7v2H8v2h8v-2h-3v-2h7a1 1 0 001-1V4a1 1 0 00-1-1zm-1 12H5V5h14v10z",
    smartphone:"M17 1H7a2 2 0 00-2 2v18a2 2 0 002 2h10a2 2 0 002-2V3a2 2 0 00-2-2zm0 18H7V5h10v14zm-5 2a1 1 0 100-2 1 1 0 000 2z",
    film:"M19.82 2H4.18A2.18 2.18 0 002 4.18v15.64A2.18 2.18 0 004.18 22h15.64A2.18 2.18 0 0022 19.82V4.18A2.18 2.18 0 0019.82 2zM7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5",
    bookmark:"M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z",
    sparkles:"M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM5 3l.6 1.8L7.4 5.4 5.6 6l-.6 1.8L4.4 6l-1.8-.6L4.4 4.8zM19 15l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z",
    anchor:"M12 2a3 3 0 100 6 3 3 0 000-6zM12 8v14M5 10a7 7 0 0014 0",
    fileText:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    quote:"M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z",
    map:"M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16",
    megaphone:"M3 11l19-9-9 19-2-8-8-2zM11 13l1.5 5.5",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {(p[n]||"").split("M").filter(Boolean).map((d,i)=><path key={i} d={"M"+d}/>)}
    </svg>
  );
};

const Btn = ({ children, onClick, v="primary", s="md", icon, disabled, style={} }) => {
  const sz = s==="sm"?{padding:"5px 11px",fontSize:11}:s==="lg"?{padding:"10px 20px",fontSize:14}:{padding:"8px 14px",fontSize:13};
  const vs = {
    primary:   {background:C.accent,   color:"white",  border:"none"},
    secondary: {background:C.surface2, color:C.text1,  border:`1px solid ${C.border}`},
    ghost:     {background:"transparent",color:C.text2, border:"none"},
    danger:    {background:C.redLight, color:C.red,    border:`1px solid ${C.red}40`},
    success:   {background:C.greenLight,color:C.green,  border:`1px solid ${C.green}40`},
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{display:"inline-flex",alignItems:"center",gap:6,borderRadius:8,fontFamily:F,fontWeight:600,
        cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all .12s",...sz,...vs[v],...style}}>
      {icon&&<Ic n={icon} s={parseInt(sz.fontSize)+1} c="currentColor"/>}{children}
    </button>
  );
};

// ─── Color Picker ─────────────────────────────────────────────────────────────
const ColorPicker = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    const h = e=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h);
  },[]);
  const swatches = ["#4361EE","#7C3AED","#E11D48","#0D9488","#D97706","#0F172A","#FFFFFF","#F8FAFC",
    "#EEF2FF","#FAF5FF","#FEF2F2","#F0FDFA","#FFFBEB","#F0FDF4","#6366F1","#EC4899"];
  return (
    <div ref={ref} style={{position:"relative"}}>
      {label&&<div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>{label}</div>}
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer"}}>
        <div style={{width:18,height:18,borderRadius:4,background:value||"#ccc",border:`1px solid ${C.border2}`,flexShrink:0}}/>
        <span style={{fontSize:12,color:C.text1,fontFamily:"monospace",flex:1}}>{value||"—"}</span>
        <Ic n="chevD" s={11} c={C.text3}/>
      </div>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:700,background:C.surface,
          border:`1px solid ${C.border}`,borderRadius:10,padding:12,boxShadow:"0 8px 24px rgba(0,0,0,.12)",width:210}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:4,marginBottom:8}}>
            {swatches.map(s=>(
              <div key={s} onClick={()=>{onChange(s);setOpen(false);}}
                style={{width:20,height:20,borderRadius:4,background:s,cursor:"pointer",
                  border:`2px solid ${value===s?C.accent:C.border}`,boxSizing:"border-box"}}/>
            ))}
          </div>
          <input type="color" value={value||"#000000"} onChange={e=>onChange(e.target.value)}
            style={{width:"100%",height:30,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/>
          <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder="#hex or rgba…"
            style={{width:"100%",marginTop:6,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,
              fontSize:11,fontFamily:"monospace",boxSizing:"border-box",outline:"none"}}/>
        </div>
      )}
    </div>
  );
};

// ─── Theme Drawer ─────────────────────────────────────────────────────────────
const ThemeDrawer = ({ theme, onChange, onClose }) => {
  const [tab, setTab] = useState("colours");
  const set = (k,v) => onChange({...theme,[k]:v});
  const inp = {padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};

  return (
    <div style={{position:"fixed",top:0,right:0,width:320,height:"100vh",background:C.surface,
      borderLeft:`1px solid ${C.border}`,zIndex:500,display:"flex",flexDirection:"column",
      boxShadow:"-8px 0 40px rgba(0,0,0,.1)"}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Ic n="palette" s={16} c={C.accent}/>
          <span style={{fontSize:15,fontWeight:800,color:C.text1}}>Design Tokens</span>
        </div>
        <button onClick={onClose} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,
          cursor:"pointer",color:C.text2,padding:"5px 10px",display:"flex",alignItems:"center",gap:4,
          fontSize:12,fontWeight:600,fontFamily:F}}>
          <Ic n="x" s={12}/> Close
        </button>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
        {[["colours","Colours"],["type","Typography"],["shape","Shape"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"9px 0",border:"none",background:"transparent",
            fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,
            color:tab===id?C.accent:C.text3,borderBottom:tab===id?`2px solid ${C.accent}`:"2px solid transparent"}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        {tab==="colours"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Quick Palettes</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {PALETTES.map(p=>(
                  <div key={p.name} onClick={()=>onChange({...theme,primaryColor:p.primary,secondaryColor:p.secondary,bgColor:p.bg,textColor:p.text})}
                    style={{padding:"8px 10px",borderRadius:8,border:`1.5px solid ${theme.primaryColor===p.primary?C.accent:C.border}`,
                      cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:theme.primaryColor===p.primary?C.accentLight:"transparent"}}>
                    <div style={{display:"flex",gap:2}}>
                      {[p.primary,p.secondary,p.bg].map((col,i)=>(
                        <div key={i} style={{width:11,height:11,borderRadius:"50%",background:col,border:`1px solid ${C.border}`}}/>
                      ))}
                    </div>
                    <span style={{fontSize:11,fontWeight:600,color:theme.primaryColor===p.primary?C.accent:C.text1}}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <ColorPicker label="Primary" value={theme.primaryColor} onChange={v=>set("primaryColor",v)}/>
            <ColorPicker label="Secondary" value={theme.secondaryColor} onChange={v=>set("secondaryColor",v)}/>
            <ColorPicker label="Accent" value={theme.accentColor} onChange={v=>set("accentColor",v)}/>
            <ColorPicker label="Background" value={theme.bgColor} onChange={v=>set("bgColor",v)}/>
            <ColorPicker label="Text" value={theme.textColor} onChange={v=>set("textColor",v)}/>
          </div>
        )}
        {tab==="type"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Heading Font</div>
              {FONT_OPTS.map(f=>(
                <div key={f.value} onClick={()=>set("headingFont",f.value)}
                  style={{padding:"7px 12px",borderRadius:8,marginBottom:4,cursor:"pointer",
                    border:`1.5px solid ${theme.headingFont===f.value?C.accent:C.border}`,
                    background:theme.headingFont===f.value?C.accentLight:"transparent",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontFamily:f.value,fontWeight:600,color:theme.headingFont===f.value?C.accent:C.text1}}>{f.label}</span>
                  <span style={{fontSize:16,fontFamily:f.value,color:C.text3}}>Aa</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Body Font</div>
              {FONT_OPTS.map(f=>(
                <div key={f.value} onClick={()=>set("fontFamily",f.value)}
                  style={{padding:"7px 12px",borderRadius:8,marginBottom:4,cursor:"pointer",
                    border:`1.5px solid ${theme.fontFamily===f.value?C.accent:C.border}`,
                    background:theme.fontFamily===f.value?C.accentLight:"transparent",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontFamily:f.value,color:theme.fontFamily===f.value?C.accent:C.text1}}>{f.label}</span>
                  <span style={{fontSize:16,fontFamily:f.value,color:C.text3}}>Aa</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Base Size</div>
              <select value={theme.fontSize} onChange={e=>set("fontSize",e.target.value)} style={inp}>
                {["14px","15px","16px","17px","18px"].map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Heading Weight</div>
              <select value={theme.headingWeight} onChange={e=>set("headingWeight",e.target.value)} style={inp}>
                {[["400","Regular"],["500","Medium"],["600","Semi-bold"],["700","Bold"],["800","Extra-bold"],["900","Black"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        )}
        {tab==="shape"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Border Radius</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {RADIUS_OPTS.map(r=>(
                  <div key={r.value} onClick={()=>set("borderRadius",r.value)}
                    style={{padding:"6px 12px",borderRadius:r.value==="999px"?"999px":"8px",cursor:"pointer",fontSize:12,fontWeight:600,
                      border:`1.5px solid ${theme.borderRadius===r.value?C.accent:C.border}`,
                      background:theme.borderRadius===r.value?C.accentLight:"transparent",
                      color:theme.borderRadius===r.value?C.accent:C.text2}}>
                    {r.label}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Button Style</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {BUTTON_STYLES.map(b=>(
                  <div key={b.value} onClick={()=>set("buttonStyle",b.value)}
                    style={{padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
                      border:`1.5px solid ${theme.buttonStyle===b.value?C.accent:C.border}`,
                      background:theme.buttonStyle===b.value?C.accentLight:"transparent",
                      color:theme.buttonStyle===b.value?C.accent:C.text2}}>
                    {b.label}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Button Radius</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {RADIUS_OPTS.map(r=>(
                  <div key={r.value} onClick={()=>set("buttonRadius",r.value)}
                    style={{padding:"6px 12px",borderRadius:r.value==="999px"?"999px":"8px",cursor:"pointer",fontSize:12,fontWeight:600,
                      border:`1.5px solid ${theme.buttonRadius===r.value?C.accent:C.border}`,
                      background:theme.buttonRadius===r.value?C.accentLight:"transparent",
                      color:theme.buttonRadius===r.value?C.accent:C.text2}}>
                    {r.label}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Content Max Width</div>
              <select value={theme.maxWidth} onChange={e=>set("maxWidth",e.target.value)} style={inp}>
                {[["720px","Narrow (720)"],["960px","Medium (960)"],["1200px","Wide (1200)"],["1440px","Full (1440)"],["100%","Edge-to-edge"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
      {/* Live preview strip */}
      <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`}}>
        <div style={{padding:"12px 16px",borderRadius:10,background:theme.bgColor||"#fff",border:`1px solid ${C.border}`,fontFamily:theme.fontFamily}}>
          <div style={{fontSize:15,fontWeight:parseInt(theme.headingWeight)||700,color:theme.textColor,fontFamily:theme.headingFont,marginBottom:3}}>Preview heading</div>
          <div style={{fontSize:12,color:theme.textColor,opacity:0.6,marginBottom:10}}>Body text in your chosen font.</div>
          <span style={{padding:"7px 16px",borderRadius:theme.buttonRadius||"8px",fontSize:12,fontWeight:600,fontFamily:theme.fontFamily,
            background:theme.buttonStyle==="filled"?theme.primaryColor:"transparent",
            color:theme.buttonStyle==="filled"?"white":theme.primaryColor,
            border:theme.buttonStyle==="outline"?`2px solid ${theme.primaryColor}`:"none",
            borderBottom:theme.buttonStyle==="underline"?`2px solid ${theme.primaryColor}`:"none",
            display:"inline-block"}}>
            Call to action
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Portal Settings Modal ────────────────────────────────────────────────────
const PortalSettingsDrawer = ({ portal, onChange, onClose }) => {
  const [tab, setTab] = useState("branding");
  const gdpr = portal.gdpr || {};
  const br = portal.branding || {};
  const setG = (k,v) => onChange({ ...portal, gdpr: { ...gdpr, [k]: v } });
  const setBr = (k,v) => onChange({ ...portal, branding: { ...br, [k]: v } });
  const inp = {padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};
  const lbl = t => <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>{t}</div>;
  const portalUrl = `${window.location.origin}/${(portal.slug||"careers").replace(/^\//,"")}`;
  const embedCode = `<script src="${window.location.origin}/portal-embed.js" data-portal="${portal.id}"></script>`;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,.4)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:18,width:560,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Ic n="settings" s={16} c={C.accent}/>
            <span style={{fontSize:16,fontWeight:800,color:C.text1}}>Portal Settings</span>
          </div>
          <button onClick={onClose} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",color:C.text2,padding:"5px 10px",display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,fontFamily:F}}>
            <Ic n="x" s={12}/> Close
          </button>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
          {[["branding","Branding"],["domain","Domain & Embed"],["gdpr","GDPR"]].map(([id,l])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"10px 0",border:"none",background:"transparent",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,color:tab===id?C.accent:C.text3,borderBottom:tab===id?`2px solid ${C.accent}`:"2px solid transparent"}}>{l}</button>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
          {tab==="branding"&&<>
          {lbl("Company name")}<input value={br.company_name||""} onChange={e=>setBr("company_name",e.target.value)} placeholder="Acme Corp" style={inp}/>
          {lbl("Contact email (shown on app status page)")}<input value={br.contact_email||""} onChange={e=>setBr("contact_email",e.target.value)} placeholder="careers@acme.com" style={inp}/>
          {lbl("Company logo URL")}<input value={portal.nav?.logoUrl||""} onChange={e=>onChange({...portal,nav:{...(portal.nav||{}),logoUrl:e.target.value}})} placeholder="https://…/logo.svg" style={inp}/>
          {(portal.nav?.logoUrl)&&<img src={portal.nav.logoUrl} alt="logo preview" style={{maxHeight:40,maxWidth:160,objectFit:"contain",borderRadius:4}} onError={e=>e.target.style.display="none"}/>}
          {lbl("Tagline / description")}<input value={br.tagline||""} onChange={e=>setBr("tagline",e.target.value)} placeholder="Building the future, one hire at a time" style={inp}/>
          {lbl("Portal name (internal)")}<input value={portal.name||""} onChange={e=>onChange({...portal,name:e.target.value})} style={inp}/>
        </>}
        {tab==="domain"&&<>
          {lbl("Portal URL")}
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <code style={{flex:1,padding:"8px 10px",borderRadius:8,background:C.surface2,fontSize:12,color:C.text1,border:`1px solid ${C.border}`,wordBreak:"break-all"}}>{portalUrl}</code>
            <button onClick={()=>navigator.clipboard?.writeText(portalUrl)} style={{padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",flexShrink:0,fontFamily:F,fontSize:12,color:C.text2}}>Copy</button>
          </div>
          {lbl("Custom slug")}
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:12,color:C.text3}}>{window.location.origin}/</span>
            <input value={portal.slug||""} onChange={e=>onChange({...portal,slug:e.target.value.replace(/[^a-z0-9-]/gi,"").toLowerCase()})} placeholder="careers" style={{...inp,flex:1}}/>
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:4}}/>
          {lbl("Application status page")}
          <div style={{fontSize:12,color:C.text3,marginBottom:4}}>After applying, candidates can view their status at:</div>
          <code style={{display:"block",padding:"8px 10px",borderRadius:8,background:C.surface2,fontSize:11,color:C.text1,border:`1px solid ${C.border}`,wordBreak:"break-all"}}>{portalUrl}/application/&#123;person_id&#125;</code>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:10}}/>
          {lbl("Embed snippet")}
          <div style={{fontSize:12,color:C.text3,marginBottom:6}}>Paste this on your website to show live job listings:</div>
          <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
            <code style={{flex:1,padding:"8px 10px",borderRadius:8,background:"#0F1729",fontSize:11,color:"#A5F3FC",border:"none",wordBreak:"break-all",lineHeight:1.6}}>{embedCode}</code>
            <button onClick={()=>navigator.clipboard?.writeText(embedCode)} style={{padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",flexShrink:0,fontFamily:F,fontSize:12,color:C.text2,marginTop:2}}>Copy</button>
          </div>
        </>}
        {tab==="gdpr"&&<>
          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <div onClick={()=>setG("enabled",!gdpr.enabled)} style={{width:36,height:20,borderRadius:10,background:gdpr.enabled?C.green:C.border,position:"relative",cursor:"pointer",transition:"background .2s"}}>
              <div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:2,left:gdpr.enabled?18:2,transition:"left .2s"}}/>
            </div>
            <span style={{fontSize:13,fontWeight:600,color:C.text1}}>Show consent banner</span>
          </label>
          <div style={{fontSize:12,color:C.text3}}>A banner asking candidates to accept cookies before using the portal. Stored in localStorage so it only shows once per visitor.</div>
          {lbl("Banner message")}<textarea value={gdpr.message||""} onChange={e=>setG("message",e.target.value)} rows={3} placeholder="We use cookies to improve your experience. By continuing you agree to our privacy policy." style={{...inp,resize:"vertical"}}/>
          {lbl("Accept button text")}<input value={gdpr.acceptText||""} onChange={e=>setG("acceptText",e.target.value)} placeholder="Accept cookies" style={inp}/>
          {lbl("Decline button text")}<input value={gdpr.declineText||""} onChange={e=>setG("declineText",e.target.value)} placeholder="Decline" style={inp}/>
          {lbl("Privacy policy URL")}<input value={gdpr.privacyUrl||""} onChange={e=>setG("privacyUrl",e.target.value)} placeholder="https://acme.com/privacy" style={inp}/>
          {lbl("Banner background colour")}
          <div style={{display:"flex",gap:8,alignItems:"center"}}><input type="color" value={gdpr.bannerBg||"#0F1729"} onChange={e=>setG("bannerBg",e.target.value)} style={{width:34,height:28,padding:0,border:"none",cursor:"pointer",borderRadius:4}}/><input value={gdpr.bannerBg||""} onChange={e=>setG("bannerBg",e.target.value)} placeholder="#0F1729" style={{...inp,flex:1}}/></div>
        </>}
        </div>
      </div>
    </div>
  );
};

// ─── Widget Picker Modal ───────────────────────────────────────────────────────
const WidgetPicker = ({ onSelect, onClose }) => (
  <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,.35)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center"}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.surface,borderRadius:16,width:420,boxShadow:"0 20px 64px rgba(0,0,0,.18)",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:15,fontWeight:800,color:C.text1}}>Add Widget</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={16}/></button>
      </div>
      <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxHeight:380,overflowY:"auto"}}>
        {WIDGET_TYPES.map(w=>(
          <div key={w.type} onClick={()=>onSelect(w.type)}
            style={{padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,cursor:"pointer",
              display:"flex",alignItems:"center",gap:10,transition:"all .1s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=C.accentLight;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="transparent";}}>
            <div style={{width:32,height:32,borderRadius:8,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Ic n={w.icon} s={15} c={C.accent}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{w.label}</div>
              <div style={{fontSize:10,color:C.text3}}>{w.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Widget Preview ────────────────────────────────────────────────────────────
const WidgetPreview = ({ cell, theme }) => {
  const t = theme;
  const cfg = cell.widgetConfig||{};
  const btnStyle = {
    padding:`7px 18px`, borderRadius:t.buttonRadius||"8px", fontSize:12, fontWeight:600, fontFamily:t.fontFamily||F,
    background:t.buttonStyle==="filled"?t.primaryColor:"transparent",
    color:t.buttonStyle==="filled"?"white":t.primaryColor,
    border:t.buttonStyle==="outline"?`2px solid ${t.primaryColor}`:"none",
    borderBottom:t.buttonStyle==="underline"?`2px solid ${t.primaryColor}`:"none",
    display:"inline-block",cursor:"default",
  };

  if (cell.widgetType==="hero") return (
    <div style={{
      padding:"32px 24px", textAlign: cfg.align||"center",
      background: cfg.bgImage ? `url(${cfg.bgImage}) center/cover no-repeat`
        : `linear-gradient(135deg,${t.primaryColor}18,${t.secondaryColor}0a)`,
      position:"relative", borderRadius:8, overflow:"hidden"
    }}>
      {cfg.bgImage&&(cfg.overlayOpacity||0)>0&&<div style={{position:"absolute",inset:0,background:`rgba(0,0,0,${(cfg.overlayOpacity||0)/100})`}}/>}
      <div style={{position:"relative"}}>
        {cfg.eyebrow&&<div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:t.primaryColor,marginBottom:8,fontFamily:t.fontFamily}}>{cfg.eyebrow}</div>}
        <div style={{fontSize:20,fontWeight:parseInt(t.headingWeight)||700,color: cfg.bgImage&&(cfg.overlayOpacity||0)>20?"#fff":t.textColor,fontFamily:t.headingFont,marginBottom:6}}>
          {cfg.headline||"Your Compelling Headline"}
        </div>
        <div style={{fontSize:12,color: cfg.bgImage&&(cfg.overlayOpacity||0)>20?"rgba(255,255,255,.8)":t.textColor,opacity:0.65,marginBottom:14,fontFamily:t.fontFamily,lineHeight:1.6}}>
          {cfg.subheading||"A short description that tells visitors what to expect here."}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:cfg.align==="center"?"center":"flex-start",flexWrap:"wrap"}}>
          <span style={btnStyle}>{cfg.ctaText||"Get Started"}</span>
          {cfg.cta2Text&&<span style={{...btnStyle,background:"transparent",color:t.primaryColor,border:`2px solid ${t.primaryColor}`}}>{cfg.cta2Text}</span>}
        </div>
      </div>
    </div>
  );

  if (cell.widgetType==="text") return (
    <div style={{padding:"16px 20px",fontFamily:t.fontFamily}}>
      <div style={{fontSize:16,fontWeight:parseInt(t.headingWeight)||700,color:t.textColor,fontFamily:t.headingFont,marginBottom:6}}>
        {cfg.heading||"Content Heading"}
      </div>
      <div style={{fontSize:13,color:t.textColor,opacity:0.65,lineHeight:1.7}}>
        {cfg.content||"Your content will appear here. Add copy, instructions, or descriptions to engage your visitors."}
      </div>
    </div>
  );

  if (cell.widgetType==="image") return (
    <div style={{background:C.surface2,minHeight:100,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,overflow:"hidden"}}>
      {cfg.url?<img src={cfg.url} alt="" style={{width:"100%",display:"block"}}/>:(
        <div style={{textAlign:"center",color:C.text3,padding:24}}>
          <Ic n="image" s={28} c={C.text3}/><div style={{fontSize:11,marginTop:4}}>Add image URL in settings</div>
        </div>
      )}
    </div>
  );

  if (cell.widgetType==="jobs") return (
    <div style={{padding:"14px 20px",fontFamily:t.fontFamily}}>
      <div style={{fontSize:15,fontWeight:parseInt(t.headingWeight)||700,color:t.textColor,fontFamily:t.headingFont,marginBottom:10}}>Open Positions</div>
      {["Senior Engineer","Product Designer","Head of Sales"].map((j,i)=>(
        <div key={i} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:t.textColor}}>{j}</div>
            <div style={{fontSize:10,color:C.text3}}>Engineering · Remote</div>
          </div>
          <span style={{fontSize:11,color:t.primaryColor,fontWeight:600}}>Apply →</span>
        </div>
      ))}
    </div>
  );

  if (cell.widgetType==="form") return (
    <div style={{padding:"14px 20px",fontFamily:t.fontFamily}}>
      <div style={{fontSize:15,fontWeight:parseInt(t.headingWeight)||700,color:t.textColor,fontFamily:t.headingFont,marginBottom:10}}>
        {cfg.title||"Apply Now"}
      </div>
      {["Name","Email","Role"].map(f=>(
        <div key={f} style={{marginBottom:8}}>
          <div style={{fontSize:10,fontWeight:600,color:C.text3,marginBottom:2}}>{f}</div>
          <div style={{height:28,borderRadius:t.borderRadius||"8px",border:`1px solid ${C.border}`,background:C.surface2}}/>
        </div>
      ))}
      <div style={{...btnStyle,marginTop:10,textAlign:"center",display:"block"}}>Submit Application</div>
    </div>
  );

  if (cell.widgetType==="stats") return (
    <div style={{padding:"20px",display:"flex",gap:20,justifyContent:"center",fontFamily:t.fontFamily}}>
      {(cfg.stats||[{value:"500+",label:"Employees"},{value:"12",label:"Offices"},{value:"20+",label:"Countries"}]).map((s,i)=>(
        <div key={i} style={{textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:800,color:t.primaryColor,fontFamily:t.headingFont}}>{s.value}</div>
          <div style={{fontSize:11,color:C.text3}}>{s.label}</div>
        </div>
      ))}
    </div>
  );

  if (cell.widgetType==="team") return (
    <div style={{padding:"14px 20px",fontFamily:t.fontFamily}}>
      <div style={{fontSize:15,fontWeight:parseInt(t.headingWeight)||700,color:t.textColor,fontFamily:t.headingFont,marginBottom:10}}>Meet the Team</div>
      <div style={{display:"flex",gap:14}}>
        {[["SJ","#4361EE"],["ML","#7C3AED"],["AR","#0D9488"],["PK","#E11D48"]].map(([init,col])=>(
          <div key={init} style={{textAlign:"center"}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:`${col}18`,border:`2px solid ${col}40`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:col}}>{init}</div>
            <div style={{fontSize:9,color:C.text3,marginTop:4}}>Team Member</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (cell.widgetType==="video") return (
    <div style={{background:"#000",minHeight:90,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8}}>
      <div style={{textAlign:"center",color:"rgba(255,255,255,.5)"}}>
        <Ic n="film" s={32} c="rgba(255,255,255,.4)"/>
        <div style={{fontSize:11,marginTop:4}}>{cfg.url?cfg.url.slice(0,40)+"…":"Add video URL"}</div>
      </div>
    </div>
  );

  if (cell.widgetType==="divider") return (
    <div style={{padding:"20px",display:"flex",alignItems:"center"}}>
      <div style={{flex:1,height:1,background:C.border}}/>
    </div>
  );

  if (cell.widgetType==="spacer") return (
    <div style={{height:cfg.height||"48px",background:"repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(0,0,0,.025) 8px,rgba(0,0,0,.025) 16px)",
      display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6}}>
      <span style={{fontSize:10,color:C.text3}}>Spacer · {cfg.height||"48px"}</span>
    </div>
  );

  const wt = WIDGET_TYPES.find(w=>w.type===cell.widgetType);
  return (
    <div style={{padding:"16px 20px",display:"flex",gap:10,alignItems:"center"}}>
      <div style={{width:32,height:32,borderRadius:8,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Ic n={wt?.icon||"square"} s={15} c={C.accent}/>
      </div>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{wt?.label}</div>
        <div style={{fontSize:11,color:C.text3}}>Click to configure</div>
      </div>
    </div>
  );
};


// ─── Multi-step Form Config ────────────────────────────────────────────────────
const FIELD_TYPES = [
  { value:"text", label:"Short text" }, { value:"email", label:"Email" },
  { value:"phone", label:"Phone" }, { value:"textarea", label:"Long text" },
  { value:"select", label:"Dropdown" }, { value:"radio", label:"Radio" },
  { value:"checkbox", label:"Checkboxes" }, { value:"date", label:"Date" },
  { value:"file", label:"File upload" },
];
const defaultStep  = (n) => ({ id:Math.random().toString(36).slice(2), title:`Step ${n}`, fields:[] });
const defaultField = ()  => ({ id:Math.random().toString(36).slice(2), type:"text", label:"", placeholder:"", required:false, options:"" });

const MultistepFormConfig = ({ cfg, set, inp, lbl }) => {
  const [activeStep, setActiveStep] = useState(0);
  const steps = cfg.steps || [defaultStep(1)];
  const setSteps = (s) => set("steps", s);
  const addStep = () => setSteps([...steps, defaultStep(steps.length+1)]);
  const removeStep = (i) => { const s=[...steps]; s.splice(i,1); setSteps(s); if(activeStep>=s.length) setActiveStep(Math.max(0,s.length-1)); };
  const updateStep = (i,p) => { const s=[...steps]; s[i]={...s[i],...p}; setSteps(s); };
  const addField = () => { const s=[...steps]; s[activeStep]={...s[activeStep],fields:[...(s[activeStep].fields||[]),defaultField()]}; setSteps(s); };
  const removeField = (fi) => { const s=[...steps]; const f=[...s[activeStep].fields]; f.splice(fi,1); s[activeStep]={...s[activeStep],fields:f}; setSteps(s); };
  const updateField = (fi,p) => { const s=[...steps]; const f=[...s[activeStep].fields]; f[fi]={...f[fi],...p}; s[activeStep]={...s[activeStep],fields:f}; setSteps(s); };
  const step = steps[activeStep]||steps[0];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div>{lbl("Form title")}<input value={cfg.formTitle||""} onChange={e=>set("formTitle",e.target.value)} placeholder="Application Form" style={inp}/></div>
      <div>{lbl("Submit button text")}<input value={cfg.submitText||""} onChange={e=>set("submitText",e.target.value)} placeholder="Submit" style={inp}/></div>
      <div>{lbl("Success message")}<input value={cfg.successMessage||""} onChange={e=>set("successMessage",e.target.value)} placeholder="Thank you! We'll be in touch." style={inp}/></div>
      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
        {lbl("Steps")}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
          {steps.map((s,i)=>(
            <button key={s.id} onClick={()=>setActiveStep(i)} style={{padding:"4px 10px",borderRadius:6,border:"1.5px solid",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:F,borderColor:i===activeStep?"#4361EE":"#E8ECF8",background:i===activeStep?"#EEF2FF":"transparent",color:i===activeStep?"#4361EE":"#6B7280"}}>{s.title}</button>
          ))}
          <button onClick={addStep} style={{padding:"4px 8px",borderRadius:6,border:"1.5px dashed #E8ECF8",background:"transparent",cursor:"pointer",color:"#9CA3AF",fontSize:11,fontFamily:F}}>+ Step</button>
        </div>
        {step&&(
          <div style={{background:C.surface2,borderRadius:10,padding:12}}>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input value={step.title} onChange={e=>updateStep(activeStep,{title:e.target.value})} placeholder="Step title" style={{...inp,flex:1,background:"#fff",fontSize:12,padding:"5px 8px"}}/>
              {steps.length>1&&<button onClick={()=>removeStep(activeStep)} style={{padding:"4px 8px",borderRadius:6,border:"1px solid #FCA5A5",background:"#FEF2F2",cursor:"pointer",color:"#EF4444",fontSize:11}}>Remove</button>}
            </div>
            {(step.fields||[]).map((f,fi)=>(
              <div key={f.id} style={{background:"#fff",borderRadius:8,padding:"10px 12px",marginBottom:8,border:"1px solid #E8ECF8"}}>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <select value={f.type} onChange={e=>updateField(fi,{type:e.target.value})} style={{...inp,flex:"0 0 130px",fontSize:11,padding:"4px 6px",background:"#F8F9FC"}}>
                    {FIELD_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input value={f.label} onChange={e=>updateField(fi,{label:e.target.value})} placeholder="Field label" style={{...inp,flex:1,fontSize:11,padding:"4px 8px"}}/>
                  <button onClick={()=>removeField(fi)} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:14,padding:"0 4px"}}>✕</button>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input value={f.placeholder||""} onChange={e=>updateField(fi,{placeholder:e.target.value})} placeholder="Placeholder" style={{...inp,flex:1,fontSize:11,padding:"4px 8px"}}/>
                  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#6B7280",flexShrink:0,cursor:"pointer"}}>
                    <input type="checkbox" checked={!!f.required} onChange={e=>updateField(fi,{required:e.target.checked})} style={{width:13,height:13}}/>Required
                  </label>
                </div>
                {(f.type==="select"||f.type==="radio"||f.type==="checkbox")&&(
                  <input value={f.options||""} onChange={e=>updateField(fi,{options:e.target.value})} placeholder="Options, comma separated" style={{...inp,marginTop:6,fontSize:11,padding:"4px 8px"}}/>
                )}
              </div>
            ))}
            <button onClick={addField} style={{width:"100%",padding:"6px",borderRadius:8,border:"1.5px dashed #E8ECF8",background:"transparent",cursor:"pointer",fontSize:11,color:"#9CA3AF",fontFamily:F}}>+ Add field</button>
          </div>
        )}
      </div>
    </div>
  );
};

// Module-level portal context for direct widget config saves
let _activePortalCtx = { id: null, pages: null };

// ─── List Widget Config (needs hooks for API calls) ───────────────────────────
const ListWidgetConfig = ({ cfg, set, setMany, inp, lbl, environmentId, cellId }) => {
  const [objects, setObjects] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    if (!environmentId) return;
    api.get(`/objects?environment_id=${environmentId}`).then(d => setObjects(Array.isArray(d) ? d : []));
  }, [environmentId]);

  useEffect(() => {
    if (!cfg.objectId || !environmentId) { setSavedLists([]); return; }
    setLoadingLists(true);
    api.get(`/saved-views?object_id=${cfg.objectId}&environment_id=${environmentId}`)
      .then(d => setSavedLists(Array.isArray(d) ? d : []))
      .catch(() => setSavedLists([]))
      .finally(() => setLoadingLists(false));
  }, [cfg.objectId, environmentId]);

  const selObj = objects.find(o => o.id === cfg.objectId);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div>{lbl("Object type")}
        <select value={cfg.objectId||""} onChange={e => setMany({ objectId: e.target.value, savedListId: "", savedList: "" })}
          style={inp}>
          <option value="">Select an object…</option>
          {objects.map(o => <option key={o.id} value={o.id}>{o.plural_name || o.name}</option>)}
        </select>
      </div>
      {cfg.objectId && (
        <div>{lbl("Saved list (blank = all records)")}
          <select value={cfg.savedListId||""} onChange={e => {
            const list = savedLists.find(l => l.id === e.target.value);
            const newCfg = { savedListId: e.target.value, savedList: list?.name || "" };
            console.log('[ListWidget] Selected saved list:', e.target.value, list?.name);
            setMany(newCfg);
            // Direct server PATCH — bypass React state chain
            if (_activePortalCtx.id && cellId) {
              const pages = _activePortalCtx.pages || [];
              let found = false;
              for (let pi = 0; pi < pages.length && !found; pi++) {
                for (let ri = 0; ri < (pages[pi]?.rows||[]).length && !found; ri++) {
                  for (let ci = 0; ci < (pages[pi].rows[ri]?.cells||[]).length && !found; ci++) {
                    if (pages[pi].rows[ri].cells[ci].id === cellId) {
                      console.log('[ListWidget] Direct PATCH to server: portal='+_activePortalCtx.id+' p'+pi+'r'+ri+'c'+ci);
                      api.patch(`/portals/${_activePortalCtx.id}/widget-config`, {
                        pageIndex: pi, rowIndex: ri, cellIndex: ci,
                        widgetConfig: { ...cfg, ...newCfg }
                      }).then(r => console.log('[ListWidget] Direct PATCH result:', JSON.stringify(r)))
                        .catch(e => console.error('[ListWidget] Direct PATCH failed:', e));
                      found = true;
                    }
                  }
                }
              }
              if (!found) console.warn('[ListWidget] Could not find cell', cellId, 'in portal pages');
            }
          }} style={inp}>
            <option value="">All {selObj?.plural_name || "records"}</option>
            {loadingLists && <option disabled>Loading…</option>}
            {savedLists.map(l => <option key={l.id} value={l.id}>{l.name}{l.is_shared ? " (shared)" : ""}</option>)}
          </select>
          {savedLists.length === 0 && !loadingLists && cfg.objectId && (
            <div style={{ fontSize:11, color:C.text3, marginTop:4, fontStyle:"italic" }}>
              No saved lists for {selObj?.plural_name || "this object"}. Create one from the list view first.
            </div>
          )}
        </div>
      )}
      <div>{lbl("Section heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder={selObj?.plural_name || "Records"} style={inp}/></div>
      <div>{lbl("Max items to show (blank = unlimited)")}<input type="number" value={cfg.limit||""} onChange={e=>set("limit",e.target.value)} placeholder="All" style={inp}/></div>
      <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:4}}>Filters shown to visitors</div>
      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={cfg.showSearch!==false} onChange={e=>set("showSearch",e.target.checked)} style={{width:14,height:14}}/>Search bar</label>
      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={cfg.showFilters!==false} onChange={e=>set("showFilters",e.target.checked)} style={{width:14,height:14}}/>Category / department filter</label>
      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={!!cfg.showLocationFilter} onChange={e=>set("showLocationFilter",e.target.checked)} style={{width:14,height:14}}/>Location filter</label>
      <div>{lbl("Empty state message")}<input value={cfg.emptyText||""} onChange={e=>set("emptyText",e.target.value)} placeholder="No records found." style={inp}/></div>
    </div>
  );
};

// ─── Widget Config Panel ──────────────────────────────────────────────────────
const WidgetConfigPanel = ({ cell, onUpdate, onClose, environmentId }) => {
  const cfg = cell.widgetConfig || {};
  const set = (k, v) => onUpdate({ ...cell, widgetConfig: { ...cfg, [k]: v } });
  const setMany = (obj) => onUpdate({ ...cell, widgetConfig: { ...cfg, ...obj } });
  const inp = { padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13,
    fontFamily:F, outline:"none", color:C.text1, background:C.surface, width:"100%", boxSizing:"border-box" };
  const lbl = (text) => (
    <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase",
      letterSpacing:"0.06em", marginBottom:5 }}>{text}</div>
  );
  const WIDGET_LABELS = {
    hero:"Hero Banner", text:"Rich Text", image:"Image", stats:"Stats",
    video:"Video", jobs:"List", job_list:"List", team:"Team", form:"Form", divider:"Divider", spacer:"Spacer",
  };
  const renderFields = () => {
    switch (cell.widgetType) {
      case "hero": return (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>{lbl("Eyebrow text")}<input value={cfg.eyebrow||""} onChange={e=>set("eyebrow",e.target.value)} placeholder="We're hiring" style={inp}/></div>
          <div>{lbl("Headline")}<input value={cfg.headline||""} onChange={e=>set("headline",e.target.value)} placeholder="Your Compelling Headline" style={inp}/></div>
          <div>{lbl("Subheading")}<textarea value={cfg.subheading||""} onChange={e=>set("subheading",e.target.value)} rows={3} placeholder="A short description…" style={{...inp,resize:"vertical"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div>{lbl("Button 1 text")}<input value={cfg.ctaText||""} onChange={e=>set("ctaText",e.target.value)} placeholder="View Jobs" style={inp}/></div>
            <div>{lbl("Button 1 link")}<input value={cfg.ctaHref||""} onChange={e=>set("ctaHref",e.target.value)} placeholder="#jobs" style={inp}/></div>
            <div>{lbl("Button 2 text")}<input value={cfg.cta2Text||""} onChange={e=>set("cta2Text",e.target.value)} placeholder="Learn More (optional)" style={inp}/></div>
            <div>{lbl("Button 2 link")}<input value={cfg.cta2Href||""} onChange={e=>set("cta2Href",e.target.value)} placeholder="/about" style={inp}/></div>
          </div>
          <div>{lbl("Text alignment")}
            <select value={cfg.align||"center"} onChange={e=>set("align",e.target.value)} style={inp}>
              <option value="center">Center</option><option value="left">Left</option>
            </select>
          </div>
          <div>{lbl("Background image URL")}<input value={cfg.bgImage||""} onChange={e=>set("bgImage",e.target.value)} placeholder="https://… (optional)" style={inp}/></div>
          {cfg.bgImage&&<div>{lbl(`Overlay opacity: ${cfg.overlayOpacity||0}%`)}<input type="range" min={0} max={80} value={cfg.overlayOpacity||0} onChange={e=>set("overlayOpacity",Number(e.target.value))} style={{width:"100%"}}/></div>}
        </div>
      );
      case "text": return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>{lbl("Heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Section heading" style={inp}/></div>
          <div>{lbl("Body content")}<textarea value={cfg.content||""} onChange={e=>set("content",e.target.value)} rows={7} placeholder="Your content here…" style={{...inp,resize:"vertical"}}/></div>
        </div>
      );
      case "image": return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>{lbl("Image URL")}<input value={cfg.url||""} onChange={e=>set("url",e.target.value)} placeholder="https://…" style={inp}/></div>
          <div>{lbl("Alt text")}<input value={cfg.alt||""} onChange={e=>set("alt",e.target.value)} placeholder="Describe the image" style={inp}/></div>
          <div>{lbl("Link (wraps image in a link)")}<input value={cfg.linkHref||""} onChange={e=>set("linkHref",e.target.value)} placeholder="https://… (optional)" style={inp}/></div>
          <div>{lbl("Object fit")}
            <select value={cfg.objectFit||"cover"} onChange={e=>set("objectFit",e.target.value)} style={inp}>
              <option value="cover">Cover (fill + crop)</option><option value="contain">Contain (letterbox)</option><option value="fill">Stretch</option>
            </select>
          </div>
          <div>{lbl("Max height (px, blank = auto)")}<input type="number" value={cfg.maxHeight||""} onChange={e=>set("maxHeight",e.target.value)} placeholder="400" style={inp}/></div>
          <div>{lbl("Border radius (px)")}<input type="number" value={cfg.borderRadius||""} onChange={e=>set("borderRadius",e.target.value)} placeholder="0" style={inp}/></div>
          {cfg.url&&<img src={cfg.url} alt="" style={{ borderRadius:8, maxHeight:100, objectFit:"cover", width:"100%" }}/>}
        </div>
      );
      case "stats": return (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {lbl("Stats — value + label pairs")}
          {(cfg.stats||[{value:"",label:""},{value:"",label:""},{value:"",label:""}]).map((s,i)=>(
            <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={s.value} onChange={e=>{ const u=[...(cfg.stats||[])]; u[i]={...s,value:e.target.value}; set("stats",u); }} placeholder="500+" style={{...inp,flex:"0 0 88px"}}/>
              <input value={s.label} onChange={e=>{ const u=[...(cfg.stats||[])]; u[i]={...s,label:e.target.value}; set("stats",u); }} placeholder="Employees" style={inp}/>
              <button onClick={()=>{ const u=(cfg.stats||[]).filter((_,j)=>j!==i); set("stats",u); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:C.red, padding:4, flexShrink:0 }}><Ic n="x" s={14} c={C.red}/></button>
            </div>
          ))}
          <button onClick={()=>set("stats",[...(cfg.stats||[]),{value:"",label:""}])}
            style={{ padding:"6px 12px", borderRadius:8, border:`1.5px dashed ${C.border}`,
              background:"transparent", cursor:"pointer", fontSize:12, color:C.text3, fontFamily:F }}>+ Add stat</button>
        </div>
      );
      case "video": return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>{lbl("Video URL (YouTube, Vimeo or .mp4)")}<input value={cfg.url||""} onChange={e=>set("url",e.target.value)} placeholder="https://youtube.com/watch?v=…" style={inp}/></div>
          <div>{lbl("Aspect ratio")}
            <select value={cfg.ratio||"16/9"} onChange={e=>set("ratio",e.target.value)} style={inp}>
              <option value="16/9">16:9 — Widescreen</option><option value="4/3">4:3</option><option value="1/1">1:1 — Square</option>
            </select>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={!!cfg.autoplay} onChange={e=>set("autoplay",e.target.checked)} style={{width:14,height:14}}/>Autoplay (muted)</label>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={cfg.controls!==false} onChange={e=>set("controls",e.target.checked)} style={{width:14,height:14}}/>Show controls</label>
          <div>{lbl("Border radius (px)")}<input type="number" value={cfg.borderRadius||""} onChange={e=>set("borderRadius",e.target.value)} placeholder="8" style={inp}/></div>
        </div>
      );
      case "spacer": return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>{lbl("Height")}
            <select value={cfg.height||"md"} onChange={e=>set("height",e.target.value)} style={inp}>
              <option value="xs">Extra small — 16px</option>
              <option value="sm">Small — 32px</option>
              <option value="md">Medium — 64px</option>
              <option value="lg">Large — 96px</option>
              <option value="xl">Extra large — 128px</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {cfg.height==="custom"&&<div>{lbl("Custom height (px)")}<input type="number" value={cfg.customHeight||64} onChange={e=>set("customHeight",parseInt(e.target.value)||64)} placeholder="64" style={inp}/></div>}
        </div>
      );
      case "divider": return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>{lbl("Style")}
            <select value={cfg.dividerStyle||"solid"} onChange={e=>set("dividerStyle",e.target.value)} style={inp}>
              <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option>
            </select>
          </div>
          <div>{lbl("Thickness (px)")}<input type="number" value={cfg.thickness||1} onChange={e=>set("thickness",parseInt(e.target.value)||1)} style={inp}/></div>
          <div>{lbl("Colour")}
            <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}>
              <input type="color" value={cfg.color||"#E8ECF8"} onChange={e=>set("color",e.target.value)} style={{width:36,height:32,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/>
              <span style={{fontSize:11,fontFamily:"monospace",color:C.text1}}>{cfg.color||"#E8ECF8"}</span>
            </div>
          </div>
          <div>{lbl("Max width (px or %, blank = full)")}<input value={cfg.maxWidth||""} onChange={e=>set("maxWidth",e.target.value)} placeholder="e.g. 800px" style={inp}/></div>
        </div>
      );
      case "jobs": return (
        <ListWidgetConfig cfg={cfg} set={set} setMany={setMany} inp={inp} lbl={lbl} environmentId={environmentId} cellId={cell.id}/>
      );
      case "job_list": return (
        <ListWidgetConfig cfg={cfg} set={set} setMany={setMany} inp={inp} lbl={lbl} environmentId={environmentId} cellId={cell.id}/>
      );
      case "team": return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>{lbl("Section heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Meet the Team" style={inp}/></div>
          <div>{lbl("Filter by Saved List name (blank = all employees)")}<input value={cfg.savedList||""} onChange={e=>set("savedList",e.target.value)} placeholder="e.g. Leadership" style={inp}/></div>
          <div>{lbl("Columns")}
            <select value={cfg.columns||3} onChange={e=>set("columns",parseInt(e.target.value))} style={inp}>
              <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
            </select>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={!!cfg.showBio} onChange={e=>set("showBio",e.target.checked)} style={{width:14,height:14}}/>Show bio/description</label>
        </div>
      );
      case "hm_profile": return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>{lbl("Section heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Meet Your Hiring Team" style={inp}/></div>
          <div>{lbl("Filter by Saved List name (blank = all employees)")}<input value={cfg.savedList||""} onChange={e=>set("savedList",e.target.value)} placeholder="e.g. Hiring Managers" style={inp}/></div>
          <div>{lbl("CTA button text")}<input value={cfg.ctaText||""} onChange={e=>set("ctaText",e.target.value)} placeholder="Schedule a call" style={inp}/></div>
          <div>{lbl("CTA button link")}<input value={cfg.ctaHref||""} onChange={e=>set("ctaHref",e.target.value)} placeholder="https://calendly.com/…" style={inp}/></div>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={!!cfg.showBio} onChange={e=>set("showBio",e.target.checked)} style={{width:14,height:14}}/>Show bio</label>
        </div>
      );
      case "form": return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>{lbl("Form title")}<input value={cfg.title||""} onChange={e=>set("title",e.target.value)} placeholder="Apply Now" style={inp}/></div>
          <div>{lbl("Submit button text")}<input value={cfg.submitText||""} onChange={e=>set("submitText",e.target.value)} placeholder="Submit Application" style={inp}/></div>
          <div>{lbl("Success message")}<input value={cfg.successText||""} onChange={e=>set("successText",e.target.value)} placeholder="Thank you! We'll be in touch." style={inp}/></div>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={cfg.showPhone!==false} onChange={e=>set("showPhone",e.target.checked)} style={{width:14,height:14}}/>Include phone field</label>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={cfg.showCV!==false} onChange={e=>set("showCV",e.target.checked)} style={{width:14,height:14}}/>Include CV upload</label>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={!!cfg.showCoverLetter} onChange={e=>set("showCoverLetter",e.target.checked)} style={{width:14,height:14}}/>Include cover note</label>
        </div>
      );
      case "multistep_form": return <MultistepFormConfig cfg={cfg} set={set} inp={inp} lbl={lbl}/>;
      case "testimonials": return (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {lbl("Section heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="What our team says" style={inp}/>
          {lbl("Testimonials")}
          {(cfg.items||[{name:"",role:"",quote:"",avatar:""}]).map((item,i)=>(
            <div key={i} style={{padding:12,borderRadius:10,border:`1px solid ${C.border}`,background:C.surface2,display:"flex",flexDirection:"column",gap:6}}>
              <input value={item.name||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],name:e.target.value};set("items",it);}} placeholder="Name" style={{...inp,fontSize:11,padding:"5px 8px"}}/>
              <input value={item.role||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],role:e.target.value};set("items",it);}} placeholder="Role / Title" style={{...inp,fontSize:11,padding:"5px 8px"}}/>
              <textarea value={item.quote||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],quote:e.target.value};set("items",it);}} placeholder="Quote text…" rows={2} style={{...inp,fontSize:11,padding:"5px 8px",resize:"vertical"}}/>
              <input value={item.avatar||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],avatar:e.target.value};set("items",it);}} placeholder="Avatar photo URL (optional)" style={{...inp,fontSize:11,padding:"5px 8px"}}/>
              {(cfg.items||[]).length>1&&<button onClick={()=>set("items",(cfg.items||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:11,textAlign:"left"}}>Remove</button>}
            </div>
          ))}
          <button onClick={()=>set("items",[...(cfg.items||[]),{name:"",role:"",quote:"",avatar:""}])} style={{padding:"6px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.text3,fontFamily:F}}>+ Add testimonial</button>
        </div>
      );
      case "rich_text": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Label / eyebrow (optional)")}<input value={cfg.label||""} onChange={e=>set("label",e.target.value)} placeholder="Our Story" style={inp}/>
          {lbl("Content (Markdown supported)")}
          <textarea value={cfg.content||""} onChange={e=>set("content",e.target.value)} rows={10} placeholder={"## Heading\n\nBody text with **bold** and *italic*.\n\n- List item\n- Another item\n\n[Link text](https://…)"} style={{...inp,resize:"vertical",fontFamily:"monospace",fontSize:12}}/>
          {lbl("Text alignment")}
          <div style={{display:"flex",gap:6}}>{["left","center","right"].map(a=><button key={a} onClick={()=>set("align",a)} style={{flex:1,padding:"6px",borderRadius:8,border:`1.5px solid ${cfg.align===a?C.accent:C.border}`,background:cfg.align===a?C.accentLight:"transparent",cursor:"pointer",fontSize:12,color:cfg.align===a?C.accent:C.text2,fontFamily:F}}>{a[0].toUpperCase()+a.slice(1)}</button>)}</div>
        </div>
      );
      case "map_embed": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Office address (for Google Maps)")}<input value={cfg.address||""} onChange={e=>set("address",e.target.value)} placeholder="1 Infinite Loop, Cupertino, CA" style={inp}/>
          <div style={{fontSize:11,color:C.text3}}>Or paste a full Google Maps embed URL below (takes priority over address).</div>
          {lbl("Embed URL (optional)")}<input value={cfg.embedUrl||""} onChange={e=>set("embedUrl",e.target.value)} placeholder="https://maps.google.com/maps?q=…&output=embed" style={inp}/>
          {lbl("Map height")}<input type="number" value={cfg.height||400} onChange={e=>set("height",Number(e.target.value))} min={200} max={800} style={inp}/>
        </div>
      );
      case "cta_banner": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Eyebrow text (small label)")}<input value={cfg.eyebrow||""} onChange={e=>set("eyebrow",e.target.value)} placeholder="Join us" style={inp}/>
          {lbl("Heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Ready to join our team?" style={inp}/>
          {lbl("Subheading")}<input value={cfg.subheading||""} onChange={e=>set("subheading",e.target.value)} placeholder="We'd love to hear from you." style={inp}/>
          {lbl("Primary CTA text")}<input value={cfg.primaryCta||""} onChange={e=>set("primaryCta",e.target.value)} placeholder="See Open Roles" style={inp}/>
          {lbl("Primary CTA link")}<input value={cfg.primaryCtaLink||""} onChange={e=>set("primaryCtaLink",e.target.value)} placeholder="#jobs" style={inp}/>
          {lbl("Secondary CTA text (optional)")}<input value={cfg.secondaryCta||""} onChange={e=>set("secondaryCta",e.target.value)} placeholder="Learn about us" style={inp}/>
          {lbl("Secondary CTA link")}<input value={cfg.secondaryCtaLink||""} onChange={e=>set("secondaryCtaLink",e.target.value)} placeholder="/about" style={inp}/>
          {lbl("Background colour")}
          <div style={{display:"flex",gap:8,alignItems:"center"}}><input type="color" value={cfg.bgColor||"#3B5BDB"} onChange={e=>set("bgColor",e.target.value)} style={{width:36,height:28,padding:0,border:"none",cursor:"pointer",borderRadius:4}}/><input value={cfg.bgColor||""} onChange={e=>set("bgColor",e.target.value)} placeholder="#3B5BDB or use theme primary" style={{...inp,flex:1}}/></div>
        </div>
      );
      default: return <p style={{ fontSize:12, color:C.text3, margin:0 }}>No settings for this widget.</p>;
    }
  };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:900, display:"flex", alignItems:"center",
      justifyContent:"center", background:"rgba(15,23,41,.45)" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, borderRadius:16, width:440, maxWidth:"calc(100vw - 48px)",
        boxShadow:"0 24px 64px rgba(0,0,0,.2)", overflow:"hidden", display:"flex",
        flexDirection:"column", maxHeight:"82vh" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Ic n="settings" s={15} c={C.accent}/>
            <span style={{ fontSize:15, fontWeight:800, color:C.text1 }}>{WIDGET_LABELS[cell.widgetType]||cell.widgetType} Settings</span>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:4 }}><Ic n="x" s={16}/></button>
        </div>
        <div style={{ padding:"20px", overflowY:"auto", flex:1 }}>{renderFields()}</div>
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${C.border}`,
          display:"flex", justifyContent:"flex-end", flexShrink:0 }}>
          <Btn onClick={onClose}>Done</Btn>
        </div>
      </div>
    </div>
  );
};

// ─── Widget Cell ──────────────────────────────────────────────────────────────
const WidgetCell = ({ cell, flex, onUpdate, onRemove, theme, isEditing, environmentId }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  return (
    <div style={{flex, minWidth:0, position:"relative"}}>
      {!cell.widgetType ? (
        <div onClick={()=>isEditing&&setShowPicker(true)}
          style={{minHeight:120,borderRadius:10,border:`2px dashed ${C.border}`,background:C.surface2,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,
            cursor:isEditing?"pointer":"default",transition:"all .15s",padding:16}}
          onMouseEnter={e=>{if(isEditing){e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=C.accentLight;}}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface2;}}>
          {isEditing&&<>
            <div style={{width:28,height:28,borderRadius:"50%",background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic n="plus" s={14} c={C.accent}/>
            </div>
            <span style={{fontSize:11,color:C.accent,fontWeight:600}}>Add widget</span>
          </>}
          {!isEditing&&<span style={{fontSize:11,color:C.text3}}>Empty</span>}
        </div>
      ) : (
        <div
          style={{position:"relative",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.surface,overflow:"hidden",minHeight:80,cursor:isEditing?"pointer":"default"}}
          onClick={()=>isEditing&&setShowConfig(true)}
          onMouseEnter={e=>{if(isEditing){
            e.currentTarget.style.borderColor=C.accent;
            e.currentTarget.style.boxShadow=`0 0 0 3px ${C.accentLight}`;
            const o=e.currentTarget.querySelector(".wa-overlay");if(o)o.style.opacity="1";
            const a=e.currentTarget.querySelector(".wa-actions");if(a)a.style.opacity="1";
          }}}
          onMouseLeave={e=>{if(isEditing){
            e.currentTarget.style.borderColor=C.border;
            e.currentTarget.style.boxShadow="none";
            const o=e.currentTarget.querySelector(".wa-overlay");if(o)o.style.opacity="0";
            const a=e.currentTarget.querySelector(".wa-actions");if(a)a.style.opacity="0";
          }}}>
          <WidgetPreview cell={cell} theme={theme}/>
          {isEditing&&<>
            <div className="wa-overlay" style={{position:"absolute",inset:0,background:"rgba(67,97,238,.08)",
              display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .15s",pointerEvents:"none"}}>
              <div style={{background:C.accent,color:"white",borderRadius:8,padding:"6px 14px",
                fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 16px rgba(67,97,238,.4)"}}>
                <Ic n="edit" s={12} c="white"/> Click to edit
              </div>
            </div>
            <div className="wa-actions" style={{position:"absolute",top:6,right:6,display:"flex",gap:4,opacity:0,transition:"opacity .15s"}}
              onClick={e=>e.stopPropagation()}>
              <button onClick={e=>{e.stopPropagation();setShowPicker(true);}}
                style={{padding:"4px 9px",borderRadius:6,border:`1px solid ${C.border}`,background:"rgba(255,255,255,.95)",
                  color:C.text2,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:4}}>
                <Ic n="edit" s={10}/> Change
              </button>
              <button onClick={e=>{e.stopPropagation();onRemove();}}
                style={{padding:"4px 7px",borderRadius:6,border:`1px solid ${C.red}30`,background:"rgba(255,255,255,.95)",color:C.red,fontSize:10,cursor:"pointer"}}>
                <Ic n="trash" s={10}/>
              </button>
            </div>
          </>}
        </div>
      )}
      {showPicker&&<WidgetPicker
        onSelect={type=>{onUpdate({...cell,widgetType:type,widgetConfig:{}});setShowPicker(false);setShowConfig(true);}}
        onClose={()=>setShowPicker(false)}/>}
      {showConfig&&cell.widgetType&&<WidgetConfigPanel
        cell={cell} onUpdate={u=>onUpdate(u)} onClose={()=>setShowConfig(false)} environmentId={environmentId}/>}
    </div>
  );
};

// ─── Row Style Panel ──────────────────────────────────────────────────────────
const RowSettings = ({ row, onChange, onClose }) => {
  const set = (k,v) => onChange({...row,[k]:v});
  const style = row.style || {};
  const setStyle = (k,v) => onChange({...row, style:{...style,[k]:v}});
  const inp = {padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};
  const lbl = t => <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>{t}</div>;
  const [tab, setTab] = useState("layout");

  const PADDING_OPTIONS = [
    {id:"none",label:"None",val:"0px"},
    {id:"sm",label:"S",val:"24px"},
    {id:"md",label:"M",val:"56px"},
    {id:"lg",label:"L",val:"96px"},
    {id:"xl",label:"XL",val:"140px"},
  ];

  const PRESETS = [
    {id:"1",label:"Full",cols:1},
    {id:"1-1",label:"½ + ½",cols:2},
    {id:"1-2",label:"⅓ + ⅔",cols:2},
    {id:"2-1",label:"⅔ + ⅓",cols:2},
  ];

  return (
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(15,23,41,.3)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        width:420,maxWidth:"90vw",maxHeight:"80vh",background:C.surface,borderRadius:14,
        boxShadow:"0 20px 60px rgba(0,0,0,.2)",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Ic n="settings" s={14} c={C.accent}/>
            <span style={{fontSize:14,fontWeight:800,color:C.text1}}>Row Style</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,padding:4}}><Ic n="x" s={14}/></button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          {[["layout","Layout"],["spacing","Spacing"],["background","Background"],["advanced","Advanced"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"9px 0",border:"none",
              background:tab===id?C.accentLight:"transparent",color:tab===id?C.accent:C.text3,
              fontSize:11,fontWeight:tab===id?700:500,cursor:"pointer",fontFamily:F,
              borderBottom:`2px solid ${tab===id?C.accent:"transparent"}`}}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>

          {/* LAYOUT TAB */}
          {tab==="layout"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            {lbl("Column layout")}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
              {PRESETS.map(p=>(
                <button key={p.id} onClick={()=>{
                  const numCols=p.cols;
                  const cells=Array.from({length:numCols},(_,i)=>row.cells[i]||defaultCell());
                  onChange({...row,preset:p.id,cells});
                }}
                  style={{padding:"10px 6px",borderRadius:8,border:`2px solid ${row.preset===p.id?C.accent:C.border}`,
                    background:row.preset===p.id?C.accentLight:C.surface,cursor:"pointer",fontFamily:F,
                    fontSize:11,fontWeight:row.preset===p.id?700:500,color:row.preset===p.id?C.accent:C.text2,textAlign:"center"}}>
                  {p.label}
                </button>
              ))}
            </div>

            {lbl("Content max width")}
            <input value={style.maxWidth||""} onChange={e=>setStyle("maxWidth",e.target.value)}
              placeholder="e.g. 1200px, 960px, 100%" style={inp}/>

            {lbl("Horizontal alignment")}
            <div style={{display:"flex",gap:4}}>
              {["left","center","right"].map(a=>(
                <button key={a} onClick={()=>setStyle("textAlign",a)}
                  style={{flex:1,padding:"7px",borderRadius:7,border:`1.5px solid ${(style.textAlign||"left")===a?C.accent:C.border}`,
                    background:(style.textAlign||"left")===a?C.accentLight:"transparent",
                    color:(style.textAlign||"left")===a?C.accent:C.text3,fontSize:11,fontWeight:600,
                    cursor:"pointer",fontFamily:F,textTransform:"capitalize"}}>{a}</button>
              ))}
            </div>
          </div>}

          {/* SPACING TAB */}
          {tab==="spacing"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            {lbl("Vertical padding (top & bottom)")}
            <div style={{display:"flex",gap:4}}>
              {PADDING_OPTIONS.map(p=>(
                <button key={p.id} onClick={()=>set("padding",p.id)}
                  style={{flex:1,padding:"8px 4px",borderRadius:7,border:`1.5px solid ${row.padding===p.id?C.accent:C.border}`,
                    background:row.padding===p.id?C.accentLight:"transparent",
                    color:row.padding===p.id?C.accent:C.text3,fontSize:11,fontWeight:600,
                    cursor:"pointer",fontFamily:F}}>{p.label}</button>
              ))}
            </div>

            {lbl("Custom padding (CSS)")}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Top</div>
                <input value={style.paddingTop||""} onChange={e=>setStyle("paddingTop",e.target.value)} placeholder="0px" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Bottom</div>
                <input value={style.paddingBottom||""} onChange={e=>setStyle("paddingBottom",e.target.value)} placeholder="0px" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Left</div>
                <input value={style.paddingLeft||""} onChange={e=>setStyle("paddingLeft",e.target.value)} placeholder="0px" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Right</div>
                <input value={style.paddingRight||""} onChange={e=>setStyle("paddingRight",e.target.value)} placeholder="0px" style={inp}/>
              </div>
            </div>

            {lbl("Margin (CSS)")}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Top</div>
                <input value={style.marginTop||""} onChange={e=>setStyle("marginTop",e.target.value)} placeholder="0px" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Bottom</div>
                <input value={style.marginBottom||""} onChange={e=>setStyle("marginBottom",e.target.value)} placeholder="0px" style={inp}/>
              </div>
            </div>

            {lbl("Gap between columns")}
            <input value={style.gap||""} onChange={e=>setStyle("gap",e.target.value)} placeholder="16px" style={inp}/>
          </div>}

          {/* BACKGROUND TAB */}
          {tab==="background"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            {lbl("Background colour")}
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="color" value={row.bgColor||"#ffffff"} onChange={e=>set("bgColor",e.target.value)}
                style={{width:36,height:36,border:"none",borderRadius:8,cursor:"pointer",padding:0}}/>
              <input value={row.bgColor||""} onChange={e=>set("bgColor",e.target.value)}
                placeholder="#FFFFFF or transparent" style={{...inp,flex:1}}/>
              {row.bgColor&&<button onClick={()=>set("bgColor","")}
                style={{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:10}}>Clear</button>}
            </div>

            {lbl("Background image URL")}
            <input value={row.bgImage||""} onChange={e=>set("bgImage",e.target.value)}
              placeholder="https://images.unsplash.com/..." style={inp}/>

            {row.bgImage&&<>
              {lbl("Overlay darkness")}
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <input type="range" min={0} max={90} value={row.overlayOpacity||0}
                  onChange={e=>set("overlayOpacity",+e.target.value)}
                  style={{flex:1,accentColor:C.accent}}/>
                <span style={{fontSize:12,color:C.text2,minWidth:30,textAlign:"right"}}>{row.overlayOpacity||0}%</span>
              </div>
            </>}

            {lbl("Border radius")}
            <input value={style.borderRadius||""} onChange={e=>setStyle("borderRadius",e.target.value)}
              placeholder="0px, 12px, 20px" style={inp}/>

            {lbl("Box shadow")}
            <input value={style.boxShadow||""} onChange={e=>setStyle("boxShadow",e.target.value)}
              placeholder="0 4px 20px rgba(0,0,0,.1)" style={inp}/>
          </div>}

          {/* ADVANCED TAB */}
          {tab==="advanced"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            {lbl("CSS class name")}
            <input value={style.className||""} onChange={e=>setStyle("className",e.target.value)}
              placeholder="custom-hero-section" style={inp}/>

            {lbl("HTML ID")}
            <input value={style.htmlId||""} onChange={e=>setStyle("htmlId",e.target.value)}
              placeholder="hero-section" style={inp}/>

            {lbl("Overflow")}
            <div style={{display:"flex",gap:4}}>
              {["visible","hidden","auto"].map(v=>(
                <button key={v} onClick={()=>setStyle("overflow",v)}
                  style={{flex:1,padding:"7px",borderRadius:7,border:`1.5px solid ${(style.overflow||"visible")===v?C.accent:C.border}`,
                    background:(style.overflow||"visible")===v?C.accentLight:"transparent",
                    color:(style.overflow||"visible")===v?C.accent:C.text3,fontSize:11,fontWeight:600,
                    cursor:"pointer",fontFamily:F}}>{v}</button>
              ))}
            </div>

            {lbl("Min height")}
            <input value={style.minHeight||""} onChange={e=>setStyle("minHeight",e.target.value)}
              placeholder="400px, 100vh" style={inp}/>

            {lbl("Z-index")}
            <input type="number" value={style.zIndex||""} onChange={e=>setStyle("zIndex",e.target.value)}
              placeholder="auto" style={inp}/>

            {lbl("Conditional visibility")}
            <div style={{display:"flex",gap:8}}>
              <input value={row.condition?.param||""} onChange={e=>set("condition",{...row.condition,param:e.target.value})}
                placeholder="URL param (e.g. dept)" style={{...inp,flex:1}}/>
              <input value={row.condition?.value||""} onChange={e=>set("condition",{...row.condition,value:e.target.value})}
                placeholder="Value (e.g. engineering)" style={{...inp,flex:1}}/>
            </div>
            {(row.condition?.param||row.condition?.value)&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:C.accent}}>Visible when ?{row.condition?.param}={row.condition?.value}</span>
                <button onClick={()=>set("condition",null)}
                  style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:10}}>Clear</button>
              </div>
            )}
          </div>}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 18px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"flex-end",flexShrink:0}}>
          <button onClick={onClose}
            style={{padding:"7px 18px",borderRadius:8,background:C.accent,border:"none",color:"white",
              fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>Done</button>
        </div>
      </div>
    </div>
  );
};


// ─── Canvas Row ───────────────────────────────────────────────────────────────
const CanvasRow = ({ row, index, total, onUpdate, onDelete, onMoveUp, onMoveDown, onDuplicate, theme, isEditing, dragTarget, onDragStart, onDragOver, onDrop, environmentId }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [hovered, setHovered] = useState(false);
  const padMap = {none:"0px",sm:"24px",md:"56px",lg:"96px",xl:"140px"};
  const padding = padMap[row.padding]||"56px";

  const updateCell = (ci, updated) => onUpdate({...row, cells:row.cells.map((c,i)=>i===ci?updated:c)});
  const removeWidget = (ci) => onUpdate({...row, cells:row.cells.map((c,i)=>i===ci?defaultCell():c)});

  const cellFlex = (ci) => {
    if (row.preset==="1")   return "1 1 100%";
    if (row.preset==="1-2") return ci===0?"0 0 33%":"0 0 67%";
    if (row.preset==="2-1") return ci===0?"0 0 67%":"0 0 33%";
    return "1 1 0";
  };

  return (
    <div
      draggable={isEditing}
      onDragStart={()=>onDragStart(index)}
      onDragOver={e=>{e.preventDefault();onDragOver(index);}}
      onDrop={()=>onDrop(index)}
      onMouseEnter={()=>isEditing&&setHovered(true)}
      onMouseLeave={()=>{setHovered(false);}}
      style={{position:"relative",
        border:isEditing?(hovered||dragTarget)?`1.5px solid ${C.accent}`:`1.5px solid ${C.border}`:"none",
        borderRadius:isEditing?10:0,marginBottom:isEditing?6:0,
        background:row.bgImage?`url(${row.bgImage}) center/cover no-repeat`:(row.bgColor||"transparent"),
        cursor:isEditing?"grab":"default",transition:"border-color .12s",
        ...(row.style?.marginTop?{marginTop:row.style.marginTop}:{}),
        ...(row.style?.marginBottom?{marginBottom:row.style.marginBottom}:{}),
        ...(row.style?.overflow?{overflow:row.style.overflow}:{}),
        ...(row.style?.zIndex?{zIndex:row.style.zIndex}:{})}}>
      {/* Overlay */}
      {row.bgImage&&(row.overlayOpacity||0)>0&&(
        <div style={{position:"absolute",inset:0,background:`rgba(0,0,0,${(row.overlayOpacity||0)/100})`,borderRadius:isEditing?10:0,pointerEvents:"none"}}/>
      )}
      {/* Content */}
      <div style={{position:"relative",padding:`${padding} ${isEditing?"16px":"0"}`,maxWidth:(row.style?.maxWidth)||theme.maxWidth||"1200px",margin:"0 auto",boxSizing:"border-box",textAlign:row.style?.textAlign||undefined,...(row.style?.paddingTop?{paddingTop:row.style.paddingTop}:{}),...(row.style?.paddingBottom?{paddingBottom:row.style.paddingBottom}:{}),...(row.style?.paddingLeft?{paddingLeft:row.style.paddingLeft}:{}),...(row.style?.paddingRight?{paddingRight:row.style.paddingRight}:{}),...(row.style?.borderRadius?{borderRadius:row.style.borderRadius}:{}),...(row.style?.boxShadow?{boxShadow:row.style.boxShadow}:{}),...(row.style?.minHeight?{minHeight:row.style.minHeight}:{})}}>
        <div style={{display:"flex",gap:row.style?.gap||16,alignItems:"stretch",flexWrap:"wrap"}}>
          {row.cells.map((cell,ci)=>(
            <WidgetCell key={cell.id} cell={cell} flex={cellFlex(ci)}
              onUpdate={u=>updateCell(ci,u)} onRemove={()=>removeWidget(ci)}
              theme={theme} isEditing={isEditing} environmentId={environmentId}/>
          ))}
        </div>
      </div>
      {/* Row toolbar — visible on row hover */}
      {isEditing&&(
        <div style={{position:"absolute",top:6,right:6,display:"flex",gap:2,
          background:"rgba(255,255,255,.97)",border:`1px solid ${C.border}`,borderRadius:8,padding:"3px 5px",
          boxShadow:"0 2px 8px rgba(0,0,0,.08)",zIndex:50,
          opacity:hovered||showSettings?1:0,transition:"opacity .12s",pointerEvents:hovered||showSettings?"auto":"none"}}>
          <button onClick={e=>{e.stopPropagation();onMoveUp();}} disabled={index===0} title="Move up"
            style={{background:"none",border:"none",cursor:index===0?"default":"pointer",padding:"3px 4px",opacity:index===0?.3:1,display:"flex",alignItems:"center"}}>
            <span style={{display:"flex",transform:"rotate(180deg)"}}><Ic n="chevD" s={12} c={C.text2}/></span>
          </button>
          <button onClick={e=>{e.stopPropagation();onMoveDown();}} disabled={index===total-1} title="Move down"
            style={{background:"none",border:"none",cursor:index===total-1?"default":"pointer",padding:"3px 4px",opacity:index===total-1?.3:1,display:"flex",alignItems:"center"}}>
            <Ic n="chevD" s={12} c={C.text2}/>
          </button>
          <div style={{width:1,height:16,background:C.border,margin:"0 2px",alignSelf:"center"}}/>
          <button onClick={e=>{e.stopPropagation();onDuplicate();}} title="Duplicate row"
            style={{background:"none",border:"none",cursor:"pointer",padding:"3px 4px",display:"flex",alignItems:"center"}}>
            <Ic n="copy" s={12} c={C.text2}/>
          </button>
          <button onClick={e=>{e.stopPropagation();setShowSettings(s=>!s);}} title="Row settings"
            style={{background:showSettings?C.accentLight:"none",border:"none",cursor:"pointer",padding:"3px 6px",borderRadius:5,display:"flex",alignItems:"center",gap:3}}>
            <Ic n="settings" s={12} c={showSettings?C.accent:C.text2}/>
            <span style={{fontSize:10,fontWeight:600,color:showSettings?C.accent:C.text3}}>Style</span>
          </button>
          <div style={{width:1,height:16,background:C.border,margin:"0 2px",alignSelf:"center"}}/>
          <button onClick={e=>{e.stopPropagation();onDelete();}} title="Delete row"
            style={{background:"none",border:"none",cursor:"pointer",padding:"3px 4px",display:"flex",alignItems:"center"}}>
            <Ic n="trash" s={12} c={C.red}/>
          </button>
        </div>
      )}
      {/* Settings popover */}
      {isEditing&&showSettings&&<RowSettings row={row} onChange={onUpdate} onClose={()=>setShowSettings(false)}/>}
    </div>
  );
};

// ─── Add Row Bar ──────────────────────────────────────────────────────────────
const AddRowBar = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{margin:"4px 0",display:"flex",justifyContent:"center"}}>
      {!open?(
        <button onClick={()=>setOpen(true)}
          style={{display:"flex",alignItems:"center",gap:5,padding:"3px 14px",borderRadius:99,
            border:`1.5px dashed ${C.border}`,background:"transparent",color:C.text3,
            fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,transition:"all .12s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text3;}}>
          <Ic n="plus" s={10}/> Add row
        </button>
      ):(
        <div style={{display:"flex",gap:5,padding:"6px 10px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 4px 16px rgba(0,0,0,.08)"}}>
          {COLUMN_PRESETS.map(p=>(
            <button key={p.id} onClick={()=>{onAdd(p.id);setOpen(false);}}
              style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${C.border}`,background:C.surface2,
                cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,color:C.text2,transition:"all .1s"}}
              title={p.label}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;e.currentTarget.style.background=C.accentLight;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text2;e.currentTarget.style.background=C.surface2;}}>
              {p.icon} {p.label}
            </button>
          ))}
          <button onClick={()=>setOpen(false)} style={{padding:"5px 7px",borderRadius:7,border:"none",background:"transparent",cursor:"pointer",color:C.text3}}>
            <Ic n="x" s={11}/>
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Canvas ───────────────────────────────────────────────────────────────────
const PortalCanvas = ({ page, onUpdate, theme, isEditing, environmentId }) => {
  const [dragFrom, setDragFrom] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);

  const updateRow = (i, updated) => onUpdate({...page, rows:page.rows.map((r,j)=>j===i?updated:r)});
  const deleteRow = (i) => onUpdate({...page, rows:page.rows.filter((_,j)=>j!==i)});
  const addRow = (preset, afterIdx) => {
    const rows = [...page.rows];
    rows.splice(afterIdx+1, 0, defaultRow(preset));
    onUpdate({...page, rows});
  };
  const moveRow = (i, dir) => {
    const rows = [...page.rows]; const j = i+dir;
    if(j<0||j>=rows.length) return;
    [rows[i],rows[j]]=[rows[j],rows[i]];
    onUpdate({...page, rows});
  };
  const duplicateRow = (i) => {
    const rows = [...page.rows];
    const copy = JSON.parse(JSON.stringify(rows[i]));
    copy.id = uid(); copy.cells = copy.cells.map(c=>({...c,id:uid()}));
    rows.splice(i+1,0,copy);
    onUpdate({...page, rows});
  };
  const handleDrop = (toIdx) => {
    if(dragFrom===null||dragFrom===toIdx) return;
    const rows=[...page.rows];
    const [moved]=rows.splice(dragFrom,1);
    rows.splice(toIdx,0,moved);
    onUpdate({...page,rows});
    setDragFrom(null); setDragTarget(null);
  };

  return (
    <div style={{background:isEditing?C.bg:(theme.bgColor||"#fff"),minHeight:400,padding:isEditing?"12px":"0"}}>
      {page.rows.map((row,i)=>(
        <div key={row.id}>
          {isEditing&&<AddRowBar onAdd={preset=>addRow(preset,i-1)}/>}
          <CanvasRow row={row} index={i} total={page.rows.length}
            onUpdate={u=>updateRow(i,u)} onDelete={()=>deleteRow(i)}
            onMoveUp={()=>moveRow(i,-1)} onMoveDown={()=>moveRow(i,1)}
            onDuplicate={()=>duplicateRow(i)}
            theme={theme} isEditing={isEditing}
            dragTarget={dragTarget===i}
            onDragStart={setDragFrom} onDragOver={setDragTarget} onDrop={handleDrop}
            environmentId={environmentId}/>
        </div>
      ))}
      {isEditing&&<AddRowBar onAdd={preset=>addRow(preset,page.rows.length-1)}/>}
    </div>
  );
};


// ─── Inline Nav Preview (editable in-canvas) ─────────────────────────────────
const InlineNav = ({ nav, theme, onChange, isEditing }) => {
  const [editOpen, setEditOpen] = useState(false);
  const bg  = nav.bgColor  || theme?.bgColor  || '#ffffff';
  const fg  = nav.textColor|| theme?.textColor|| '#0F1729';
  const pr  = theme?.primaryColor || '#4361EE';
  const ff  = theme?.fontFamily   || 'inherit';
  const set = (k,v) => onChange({...nav,[k]:v});
  const inp = {padding:"6px 10px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};
  const lbl = t => <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{t}</div>;

  return (
    <div style={{position:"relative"}}>
      {/* Live Nav render */}
      <div style={{background:bg, borderBottom:`1px solid ${pr}18`, boxShadow:"0 1px 8px rgba(0,0,0,.06)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px", height:60, fontFamily:ff}}
        onClick={isEditing ? ()=>setEditOpen(e=>!e) : undefined}
        title={isEditing?"Click to edit nav":""}
        onMouseEnter={e=>{if(isEditing)e.currentTarget.style.outline=`2px dashed ${pr}`;}}
        onMouseLeave={e=>{e.currentTarget.style.outline="none";}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {nav.logoUrl
            ? <img src={nav.logoUrl} alt={nav.logoText||"Logo"} style={{height:32,maxWidth:140,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
            : <span style={{fontSize:17,fontWeight:800,color:pr,fontFamily:ff}}>{nav.logoText||"Your Company"}</span>
          }
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {(nav.links||[]).map(lnk=>(
            <span key={lnk.id} style={{padding:"5px 12px",borderRadius:7,fontSize:13,fontWeight:500,color:fg,fontFamily:ff}}>{lnk.label}</span>
          ))}
        </div>
        {isEditing&&<div style={{position:"absolute",top:6,right:8,fontSize:10,color:pr,fontWeight:700,background:`${pr}14`,padding:"2px 7px",borderRadius:5,pointerEvents:"none"}}>click to edit</div>}
      </div>

      {/* Popover editor */}
      {editOpen&&isEditing&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:400,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:"0 0 12px 12px",boxShadow:"0 8px 32px rgba(0,0,0,.15)",padding:16,display:"flex",flexDirection:"column",gap:12}}
          onClick={e=>e.stopPropagation()}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>{lbl("Logo URL")}<input value={nav.logoUrl||""} onChange={e=>set("logoUrl",e.target.value)} placeholder="https://…/logo.svg" style={inp}/></div>
            <div>{lbl("Logo text (fallback)")}<input value={nav.logoText||""} onChange={e=>set("logoText",e.target.value)} placeholder="Company" style={inp}/></div>
            <div>{lbl("Background")}<input type="color" value={nav.bgColor||"#ffffff"} onChange={e=>set("bgColor",e.target.value)} style={{...inp,padding:2,height:30,cursor:"pointer"}}/></div>
            <div>{lbl("Text colour")}<input type="color" value={nav.textColor||"#0F1729"} onChange={e=>set("textColor",e.target.value)} style={{...inp,padding:2,height:30,cursor:"pointer"}}/></div>
          </div>
          <div>
            {lbl("Nav links")}
            {(nav.links||[]).map((lnk,i)=>(
              <div key={lnk.id} style={{display:"flex",gap:6,marginBottom:5}}>
                <input value={lnk.label||""} onChange={e=>{const l=[...(nav.links||[])];l[i]={...l[i],label:e.target.value};set("links",l);}} placeholder="Label" style={{...inp,flex:1}}/>
                <input value={lnk.href||""} onChange={e=>{const l=[...(nav.links||[])];l[i]={...l[i],href:e.target.value};set("links",l);}} placeholder="/path or #anchor" style={{...inp,flex:2}}/>
                <button onClick={()=>set("links",(nav.links||[]).filter((_,j)=>j!==i))} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",color:C.text3,padding:"0 8px",fontSize:16}}>×</button>
              </div>
            ))}
            <button onClick={()=>set("links",[...(nav.links||[]),{id:uid(),label:"Link",href:"/"}])} style={{fontSize:11,color:C.accent,background:"transparent",border:`1.5px dashed ${C.border}`,borderRadius:7,padding:"5px 12px",cursor:"pointer",fontFamily:F,width:"100%"}}>+ Add link</button>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:C.text2,cursor:"pointer"}}>
              <input type="checkbox" checked={nav.sticky!==false} onChange={e=>set("sticky",e.target.checked)}/> Sticky nav
            </label>
            <button onClick={()=>setEditOpen(false)} style={{padding:"5px 14px",borderRadius:7,background:C.accent,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Inline Footer Preview (editable in-canvas) ──────────────────────────────
const InlineFooter = ({ footer, theme, onChange, isEditing }) => {
  const [editOpen, setEditOpen] = useState(false);
  const bg  = footer.bgColor  || '#0F1729';
  const fg  = footer.textColor|| '#F1F5F9';
  const ff  = theme?.fontFamily || 'inherit';
  const set = (k,v) => onChange({...footer,[k]:v});
  const inp = {padding:"6px 10px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};
  const lbl = t => <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{t}</div>;

  return (
    <div style={{position:"relative"}}>
      {/* Live footer render */}
      <div style={{background:bg, padding:"36px 32px 20px", fontFamily:ff}}
        onClick={isEditing ? ()=>setEditOpen(e=>!e) : undefined}
        title={isEditing?"Click to edit footer":""}
        onMouseEnter={e=>{if(isEditing)e.currentTarget.style.outline=`2px dashed ${theme?.primaryColor||"#4361EE"}`;}}
        onMouseLeave={e=>{e.currentTarget.style.outline="none";}}>
        {/* Columns */}
        <div style={{display:"flex",gap:48,marginBottom:28,flexWrap:"wrap"}}>
          {(footer.columns||[]).map(col=>(
            <div key={col.id}>
              <div style={{fontSize:12,fontWeight:700,color:fg,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10,opacity:0.6}}>{col.heading}</div>
              {(col.links||[]).map((lnk,i)=>(
                <div key={i} style={{fontSize:13,color:fg,opacity:0.8,marginBottom:6}}>{lnk.label}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{borderTop:`1px solid ${fg}20`,paddingTop:16,fontSize:12,color:fg,opacity:0.5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{footer.bottomText||"© 2026 Your Company"}</span>
          {isEditing&&<span style={{fontSize:10,fontWeight:700,background:`${fg}20`,padding:"2px 7px",borderRadius:5}}>click to edit</span>}
        </div>
      </div>

      {/* Popover editor */}
      {editOpen&&isEditing&&(
        <div style={{position:"absolute",bottom:"100%",left:0,right:0,zIndex:400,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:"12px 12px 0 0",boxShadow:"0 -8px 32px rgba(0,0,0,.15)",padding:16,display:"flex",flexDirection:"column",gap:12,maxHeight:400,overflowY:"auto"}}
          onClick={e=>e.stopPropagation()}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>{lbl("Background")}<input type="color" value={footer.bgColor||"#0F1729"} onChange={e=>set("bgColor",e.target.value)} style={{...inp,padding:2,height:30,cursor:"pointer"}}/></div>
            <div>{lbl("Text colour")}<input type="color" value={footer.textColor||"#F1F5F9"} onChange={e=>set("textColor",e.target.value)} style={{...inp,padding:2,height:30,cursor:"pointer"}}/></div>
          </div>
          <div>{lbl("Copyright text")}<input value={footer.bottomText||""} onChange={e=>set("bottomText",e.target.value)} placeholder="© 2026 Your Company" style={inp}/></div>
          <div>
            {lbl("Link columns")}
            {(footer.columns||[]).map((col,ci)=>(
              <div key={col.id} style={{marginBottom:10,padding:10,borderRadius:8,background:C.surface2,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
                  <input value={col.heading||""} onChange={e=>{const c=[...(footer.columns||[])];c[ci]={...c[ci],heading:e.target.value};set("columns",c);}} placeholder="Column heading" style={{...inp,flex:1}}/>
                  <button onClick={()=>set("columns",(footer.columns||[]).filter((_,j)=>j!==ci))} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",color:C.text3,padding:"0 8px",fontSize:16}}>×</button>
                </div>
                {(col.links||[]).map((lnk,li)=>(
                  <div key={li} style={{display:"flex",gap:5,marginBottom:4}}>
                    <input value={lnk.label||""} onChange={e=>{const c=[...(footer.columns||[])];c[ci].links[li]={...c[ci].links[li],label:e.target.value};set("columns",c);}} placeholder="Label" style={{...inp,flex:1}}/>
                    <input value={lnk.href||""} onChange={e=>{const c=[...(footer.columns||[])];c[ci].links[li]={...c[ci].links[li],href:e.target.value};set("columns",c);}} placeholder="/path" style={{...inp,flex:1}}/>
                    <button onClick={()=>{const c=[...(footer.columns||[])];c[ci].links=c[ci].links.filter((_,j)=>j!==li);set("columns",c);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",color:C.text3,padding:"0 7px",fontSize:14}}>×</button>
                  </div>
                ))}
                <button onClick={()=>{const c=[...(footer.columns||[])];c[ci].links=[...(c[ci].links||[]),{label:"Link",href:"#"}];set("columns",c);}} style={{fontSize:11,color:C.accent,background:"transparent",border:"none",cursor:"pointer",fontFamily:F}}>+ link</button>
              </div>
            ))}
            <button onClick={()=>set("columns",[...(footer.columns||[]),{id:uid(),heading:"Column",links:[{label:"Link",href:"#"}]}])} style={{fontSize:11,color:C.accent,background:"transparent",border:`1.5px dashed ${C.border}`,borderRadius:7,padding:"5px 12px",cursor:"pointer",fontFamily:F,width:"100%"}}>+ Add column</button>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <button onClick={()=>setEditOpen(false)} style={{padding:"5px 14px",borderRadius:7,background:C.accent,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

const defaultNav = () => ({ logoText:'', logoUrl:'', bgColor:'', textColor:'', sticky:true,
  links:[{id:'nl1',label:'Home',href:'/'},{id:'nl2',label:'Jobs',href:'#jobs'},{id:'nl3',label:'Apply',href:'/apply'}] });
const defaultFooter = () => ({ bgColor:'#0F1729', textColor:'#F1F5F9',
  bottomText:'© 2026 Your Company. All rights reserved.',
  columns:[{id:'fc1',heading:'Company',links:[{label:'About',href:'#'},{label:'Careers',href:'#jobs'}]},{id:'fc2',heading:'Legal',links:[{label:'Privacy',href:'#'},{label:'Terms',href:'#'}]}] });

const NavEditor = ({ nav, onChange, theme, onClose }) => {
  const set=(k,v)=>onChange({...nav,[k]:v});
  const inp={padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};
  const lbl=t=><div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>{t}</div>;
  const links=nav.links||[];
  const addLink=()=>set("links",[...links,{id:Math.random().toString(36).slice(2),label:'New Link',href:'/'}]);
  const removeLink=i=>{const l=[...links];l.splice(i,1);set("links",l);};
  const updateLink=(i,p)=>{const l=[...links];l[i]={...l[i],...p};set("links",l);};
  return(
    <div style={{position:"fixed",top:0,right:0,width:340,height:"100vh",background:C.surface,borderLeft:`1px solid ${C.border}`,zIndex:500,display:"flex",flexDirection:"column",boxShadow:"-8px 0 40px rgba(0,0,0,.1)"}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Ic n="menu" s={15} c={C.accent}/><span style={{fontSize:15,fontWeight:800,color:C.text1}}>Navigation</span></div>
        <button onClick={onClose} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",color:C.text2,padding:"5px 10px",display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,fontFamily:F}}><Ic n="x" s={12}/> Close</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>{lbl("Logo text")}<input value={nav.logoText||""} onChange={e=>set("logoText",e.target.value)} placeholder="Company name" style={inp}/></div>
          <div>{lbl("Logo image URL")}<input value={nav.logoUrl||""} onChange={e=>set("logoUrl",e.target.value)} placeholder="https://…/logo.png" style={inp}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>{lbl("Nav background")}<input type="color" value={nav.bgColor||theme?.bgColor||"#ffffff"} onChange={e=>set("bgColor",e.target.value)} style={{width:"100%",height:32,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/></div>
            <div>{lbl("Nav text")}<input type="color" value={nav.textColor||theme?.textColor||"#0F1729"} onChange={e=>set("textColor",e.target.value)} style={{width:"100%",height:32,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/></div>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}><input type="checkbox" checked={!!nav.sticky} onChange={e=>set("sticky",e.target.checked)} style={{width:14,height:14}}/>Sticky nav</label>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
            {lbl("Nav links")}
            {links.map((lnk,i)=>(<div key={lnk.id} style={{background:C.surface2,borderRadius:8,padding:10,marginBottom:8,border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",gap:6,marginBottom:6}}><input value={lnk.label} onChange={e=>updateLink(i,{label:e.target.value})} placeholder="Label" style={{...inp,flex:1,fontSize:12,padding:"5px 8px"}}/><button onClick={()=>removeLink(i)} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:14,padding:"0 4px"}}>✕</button></div>
              <input value={lnk.href} onChange={e=>updateLink(i,{href:e.target.value})} placeholder="URL, /page, or #section-id" style={{...inp,fontSize:12,padding:"5px 8px"}}/>
            </div>))}
            <button onClick={addLink} style={{width:"100%",padding:"6px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.text3,fontFamily:F}}>+ Add link</button>
          </div>
        </div>
      </div>
      <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{padding:"10px 14px",borderRadius:8,background:nav.bgColor||"#fff",border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,fontWeight:800,color:theme?.primaryColor||"#4361EE"}}>{nav.logoText||"Company"}</span>
          <div style={{display:"flex",gap:10}}>{links.slice(0,3).map(l=><span key={l.id} style={{fontSize:11,color:nav.textColor||"#374151"}}>{l.label}</span>)}</div>
        </div>
      </div>
    </div>
  );
};

const FooterEditor = ({ footer, onChange, onClose }) => {
  const set=(k,v)=>onChange({...footer,[k]:v});
  const inp={padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};
  const lbl=t=><div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>{t}</div>;
  const cols=footer.columns||[];
  const addCol=()=>set("columns",[...cols,{id:Math.random().toString(36).slice(2),heading:'Column',links:[]}]);
  const removeCol=i=>{const c=[...cols];c.splice(i,1);set("columns",c);};
  const updateCol=(i,p)=>{const c=[...cols];c[i]={...c[i],...p};set("columns",c);};
  const addColLink=ci=>{const c=[...cols];c[ci].links=[...(c[ci].links||[]),{label:'Link',href:'#'}];set("columns",c);};
  const updateColLink=(ci,li,p)=>{const c=[...cols];const l=[...c[ci].links];l[li]={...l[li],...p};c[ci]={...c[ci],links:l};set("columns",c);};
  const removeColLink=(ci,li)=>{const c=[...cols];const l=[...c[ci].links];l.splice(li,1);c[ci]={...c[ci],links:l};set("columns",c);};
  return(
    <div style={{position:"fixed",top:0,right:0,width:340,height:"100vh",background:C.surface,borderLeft:`1px solid ${C.border}`,zIndex:500,display:"flex",flexDirection:"column",boxShadow:"-8px 0 40px rgba(0,0,0,.1)"}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Ic n="footer2" s={15} c={C.accent}/><span style={{fontSize:15,fontWeight:800,color:C.text1}}>Footer</span></div>
        <button onClick={onClose} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",color:C.text2,padding:"5px 10px",display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,fontFamily:F}}><Ic n="x" s={12}/> Close</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>{lbl("Background")}<input type="color" value={footer.bgColor||"#0F1729"} onChange={e=>set("bgColor",e.target.value)} style={{width:"100%",height:32,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/></div>
            <div>{lbl("Text colour")}<input type="color" value={footer.textColor||"#F1F5F9"} onChange={e=>set("textColor",e.target.value)} style={{width:"100%",height:32,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/></div>
          </div>
          <div>{lbl("Copyright text")}<input value={footer.bottomText||""} onChange={e=>set("bottomText",e.target.value)} placeholder="© 2026 Your Company." style={inp}/></div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
            {lbl("Link columns")}
            {cols.map((col,ci)=>(<div key={col.id} style={{background:C.surface2,borderRadius:10,padding:10,marginBottom:10,border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",gap:6,marginBottom:8}}><input value={col.heading} onChange={e=>updateCol(ci,{heading:e.target.value})} placeholder="Heading" style={{...inp,flex:1,fontSize:12,padding:"5px 8px"}}/><button onClick={()=>removeCol(ci)} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:14,padding:"0 4px"}}>✕</button></div>
              {(col.links||[]).map((lnk,li)=>(<div key={li} style={{display:"flex",gap:5,marginBottom:5}}>
                <input value={lnk.label} onChange={e=>updateColLink(ci,li,{label:e.target.value})} placeholder="Label" style={{...inp,flex:1,fontSize:11,padding:"4px 6px"}}/>
                <input value={lnk.href}  onChange={e=>updateColLink(ci,li,{href:e.target.value})}  placeholder="URL" style={{...inp,flex:1,fontSize:11,padding:"4px 6px"}}/>
                <button onClick={()=>removeColLink(ci,li)} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:12}}>✕</button>
              </div>))}
              <button onClick={()=>addColLink(ci)} style={{fontSize:10,color:C.text3,background:"none",border:"none",cursor:"pointer",fontFamily:F}}>+ Link</button>
            </div>))}
            <button onClick={addCol} style={{width:"100%",padding:"6px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.text3,fontFamily:F}}>+ Add column</button>
          </div>
        </div>
      </div>
    </div>
  );
};


const uid2=()=>Math.random().toString(36).slice(2,10);
const mk=(preset,cells,bg,pad)=>({id:uid2(),preset,bgColor:bg||"",bgImage:"",overlayOpacity:0,padding:pad||"lg",cells});
const mkcell=(type,cfg)=>({id:uid2(),widgetType:type,widgetConfig:cfg||{}});
const SECTION_LIBRARY=[
  {category:"Hero",sections:[
    {id:"hero-c",name:"Centred Hero",preview:[{type:"hero",w:"full"}],row:()=>mk("1",[mkcell("hero",{headline:"Find Your Next Opportunity",subheading:"Join a team building something meaningful.",ctaText:"See Open Roles",ctaHref:"#jobs"})],"","xl")},
    {id:"hero-dark",name:"Dark Hero",preview:[{type:"hero",w:"full",dark:true}],row:()=>mk("1",[mkcell("hero",{headline:"Join Our Team",subheading:"We're hiring across engineering, product and design.",ctaText:"View Roles",ctaHref:"#jobs"})],"#0F1729","xl")},
    {id:"hero-split",name:"Split Hero + Image",preview:[{type:"text",w:"half"},{type:"image",w:"half"}],row:()=>mk("2",[mkcell("text",{heading:"We're hiring for the future",content:"Join a fast-moving team where your work ships to millions."}),mkcell("image",{})],"","xl")},
  ]},
  {category:"Jobs",sections:[
    {id:"jobs-full",name:"Full Job Board",preview:[{type:"jobs",w:"full"}],row:()=>mk("1",[mkcell("jobs",{heading:"Open Positions"})])},
    {id:"jobs-featured",name:"Featured Roles",preview:[{type:"job_list",w:"full"}],row:()=>mk("1",[mkcell("job_list",{heading:"Featured Roles",limit:5})],"#F8F9FF")},
  ]},
  {category:"Stats",sections:[
    {id:"stats-3",name:"3 Stats",preview:[{type:"stats",w:"full"}],row:()=>mk("1",[mkcell("stats",{stats:[{value:"500+",label:"Team Members"},{value:"12",label:"Offices"},{value:"4.8★",label:"Glassdoor"}]})],"#F8F9FF","md")},
    {id:"stats-4",name:"4 Stats",preview:[{type:"stats",w:"full"}],row:()=>mk("1",[mkcell("stats",{stats:[{value:"500+",label:"Employees"},{value:"12",label:"Offices"},{value:"40+",label:"Nationalities"},{value:"4.8★",label:"Glassdoor"}]})],"","md")},
  ]},
  {category:"Content",sections:[
    {id:"text-img",name:"Text + Image",preview:[{type:"text",w:"half"},{type:"image",w:"half"}],row:()=>mk("2",[mkcell("text",{heading:"Why work with us?",content:"We believe great work happens when talented people have the freedom to do their best."}),mkcell("image",{})])},
    {id:"img-text",name:"Image + Text",preview:[{type:"image",w:"half"},{type:"text",w:"half"}],row:()=>mk("2",[mkcell("image",{}),mkcell("text",{heading:"Our Culture",content:"We move fast, stay curious, and support each other every step of the way."})])},
    {id:"two-text",name:"Two Columns",preview:[{type:"text",w:"half"},{type:"text",w:"half"}],row:()=>mk("2",[mkcell("text",{heading:"Our Mission",content:"Making hiring human — fairer processes, clearer communication, faster decisions."}),mkcell("text",{heading:"Our Values",content:"Trust. Speed. Ownership. We hold ourselves to high standards."})])},
    {id:"full-text",name:"Full Width Text",preview:[{type:"text",w:"full"}],row:()=>mk("1",[mkcell("text",{heading:"About Us",content:"We're a fast-growing company united by a shared belief that work should be meaningful."})])},
  ]},
  {category:"Team",sections:[
    {id:"team-grid",name:"Team Grid",preview:[{type:"team",w:"full"}],row:()=>mk("1",[mkcell("team",{heading:"Meet the Team"})],"#F8F9FF")},
    {id:"hm-prof",name:"HM Profile Cards",preview:[{type:"hm_profile",w:"full"}],row:()=>mk("1",[mkcell("hm_profile",{heading:"Meet Your Hiring Team",ctaText:"Schedule a call"})])},
  ]},
  {category:"CTA",sections:[
    {id:"cta-banner",name:"CTA Banner",preview:[{type:"cta_banner",w:"full"}],row:()=>mk("1",[mkcell("cta_banner",{heading:"Ready to join our team?",subheading:"We'd love to hear from you. Browse our open roles below.",primaryCta:"See Open Roles",primaryCtaLink:"#jobs",bgColor:"#4361EE"})])},
    {id:"cta-dark",name:"Dark CTA",preview:[{type:"text",w:"full",dark:true}],row:()=>mk("1",[mkcell("text",{heading:"Ready to apply?",content:"We review every application carefully. Our team will be in touch within 5 business days."})],"#0F1729")},
    {id:"cta-light",name:"Light CTA",preview:[{type:"text",w:"full",accent:true}],row:()=>mk("1",[mkcell("text",{heading:"Don't see the right role?",content:"Send us your CV — we're always looking for talented people."})],"#EEF2FF")},
  ]},
  {category:"Content",sections:[
    {id:"testimonials-3",name:"Employee Testimonials",preview:[{type:"testimonials",w:"full"}],row:()=>mk("1",[mkcell("testimonials",{heading:"What our team says",items:[
      {name:"Sarah Chen",role:"Engineering Lead",quote:"The best place I've ever worked. Genuinely supportive culture and amazing growth opportunities.",avatar:""},
      {name:"Marcus Reed",role:"Product Manager",quote:"I joined as a grad and grew into a leadership role within three years. This company invests in people.",avatar:""},
      {name:"Priya Nair",role:"Data Scientist",quote:"Flexible working, brilliant colleagues, and meaningful work. I could not ask for more.",avatar:""},
    ]})])},
    {id:"rich-text-article",name:"Article / Blog Post",preview:[{type:"rich_text",w:"full"}],row:()=>mk("1",[mkcell("rich_text",{label:"Our Story",content:"## Why we exist\n\nWe started this company because we believe hiring should be better — for candidates and companies alike.\n\n**Our approach** is built on transparency, speed, and respect for everyone's time.\n\n- Clear expectations from day one\n- Fast, communicative process\n- Feedback at every stage"})])},
    {id:"rich-img",name:"Article + Image",preview:[{type:"rich_text",w:"half"},{type:"image",w:"half"}],row:()=>mk("2",[mkcell("rich_text",{label:"Life at Acme",content:"## A place to grow\n\nWe invest in every person who joins. From **day one** you'll have a dedicated buddy, a learning budget, and a manager who actually cares.\n\n- €2,000 annual learning budget\n- Flexible remote working\n- 30 days holiday"}),mkcell("image",{})])},
    {id:"map-section",name:"Office Location Map",preview:[{type:"map_embed",w:"full"}],row:()=>mk("1",[mkcell("map_embed",{address:"1 Infinite Loop, Cupertino, CA",height:400})])},
  ]},
  {category:"Forms",sections:[
    {id:"form-simple",name:"Application Form",preview:[{type:"form",w:"full"}],row:()=>mk("1",[mkcell("form",{title:"Apply Now"})])},
    {id:"form-multi",name:"Multi-step Application",preview:[{type:"multistep_form",w:"full"}],row:()=>mk("1",[mkcell("multistep_form",{formTitle:"Application Form",submitText:"Submit",successMessage:"Thank you! We'll be in touch.",steps:[
      {id:uid2(),title:"About You",fields:[{id:uid2(),type:"text",label:"First name",placeholder:"Jane",required:true},{id:uid2(),type:"text",label:"Last name",placeholder:"Smith",required:true},{id:uid2(),type:"email",label:"Email",placeholder:"jane@",required:true},{id:uid2(),type:"phone",label:"Phone",required:false}]},
      {id:uid2(),title:"Experience",fields:[{id:uid2(),type:"text",label:"Current role",placeholder:"Senior Engineer",required:false},{id:uid2(),type:"select",label:"Years of experience",options:"0-2,3-5,6-10,10 plus",required:true},{id:uid2(),type:"textarea",label:"Why do you want to join?",placeholder:"Tell us",required:true}]},
      {id:uid2(),title:"Documents",fields:[{id:uid2(),type:"file",label:"Upload CV",required:true},{id:uid2(),type:"textarea",label:"Anything else?",placeholder:"Optional",required:false}]},
    ]})]) },
  ]},
];

const SectionLibrary = ({ onInsert, onClose }) => {
  const [cat,setCat]=useState(SECTION_LIBRARY[0].category);
  const [hov,setHov]=useState(null);
  const category=SECTION_LIBRARY.find(c=>c.category===cat);
  const PBlock=({type,w,dark,accent})=>{const colors={hero:"#4361EE",text:"#E8ECF8",image:"#DDD",stats:"#EEF2FF",jobs:"#F0FDF4",job_list:"#F0FDF4",form:"#FEF9EE",team:"#FAF5FF",hm_profile:"#F0F9FF",multistep_form:"#FFF5F5",testimonials:"#FFF5EB",rich_text:"#F0FDF4",map_embed:"#E8F5E9",cta_banner:"#4361EE",cta_banner_dark:"#0F1729"};return(<div style={{flex:w==="full"?1:"",width:w==="half"?"50%":"100%",height:24,borderRadius:4,background:dark?"#0F1729":accent?"#EEF2FF":(colors[type]||"#E8ECF8"),display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:7,color:dark?"rgba(255,255,255,.5)":"rgba(0,0,0,.3)",fontWeight:600}}>{type.replace(/_/g," ")}</span></div>);};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,.45)",zIndex:850,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:16,width:680,maxWidth:"100%",height:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><Ic n="library" s={15} c={C.accent}/><span style={{fontSize:15,fontWeight:800,color:C.text1}}>Section Library</span></div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={16}/></button>
        </div>
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div style={{width:150,borderRight:`1px solid ${C.border}`,padding:"10px 8px",overflowY:"auto",flexShrink:0}}>
            {SECTION_LIBRARY.map(c=>(<button key={c.category} onClick={()=>setCat(c.category)} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"none",background:cat===c.category?C.accentLight:"transparent",color:cat===c.category?C.accent:C.text2,fontSize:12,fontWeight:cat===c.category?700:500,cursor:"pointer",fontFamily:F,textAlign:"left",marginBottom:2}}>{c.category}</button>))}
          </div>
          <div style={{flex:1,padding:"12px 14px",overflowY:"auto"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {(category?.sections||[]).map(sec=>(<div key={sec.id} onClick={()=>{onInsert(sec.row());onClose();}} onMouseEnter={()=>setHov(sec.id)} onMouseLeave={()=>setHov(null)} style={{borderRadius:10,border:`1.5px solid ${hov===sec.id?C.accent:C.border}`,background:hov===sec.id?C.accentLight:C.surface2,cursor:"pointer",overflow:"hidden",transition:"all .12s"}}>
                <div style={{padding:"10px 10px 6px",display:"flex",gap:4,flexWrap:"wrap"}}>{sec.preview.map((p,i)=><PBlock key={i} {...p}/>)}</div>
                <div style={{padding:"5px 10px 9px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,fontWeight:600,color:hov===sec.id?C.accent:C.text1}}>{sec.name}</span>{hov===sec.id&&<span style={{fontSize:10,color:C.accent,fontWeight:700}}>Insert ↵</span>}</div>
              </div>))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Page Actions Menu ────────────────────────────────────────────────────────
const PageActionsMenu = ({ page, allPages, onUpdate, onDuplicate, onDelete, onClose }) => {
  const [tab, setTab] = useState("seo");
  const seo = page.seo||{};
  const setSeo = (k,v) => onUpdate({...page,seo:{...seo,[k]:v}});
  const inp = {padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:56,background:"rgba(15,23,41,.35)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:16,width:420,boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:14,fontWeight:700,color:C.text1}}>Page — {page.name}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={14}/></button>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
          {[["seo","SEO & Slug"],["actions","Actions"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"9px 0",border:"none",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:tab===id?700:500,color:tab===id?C.accent:C.text3,borderBottom:tab===id?`2px solid ${C.accent}`:"2px solid transparent",fontFamily:F}}>{lbl}</button>
          ))}
        </div>
        <div style={{padding:"16px 20px"}}>
          {tab==="seo"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:11,color:C.text3,marginBottom:4}}>Override meta tags for this page. Leave blank to use the portal name.</div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Page title</div>
                <input value={seo.title||""} onChange={e=>setSeo("title",e.target.value)} placeholder="e.g. Careers at Acme Corp" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Meta description</div>
                <textarea value={seo.description||""} onChange={e=>setSeo("description",e.target.value)} placeholder="150-160 chars" rows={3} style={{...inp,resize:"vertical"}}/>
                <div style={{fontSize:10,color:(seo.description||"").length>160?C.red:C.text3,textAlign:"right",marginTop:3}}>{(seo.description||"").length}/160</div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Social image URL (og:image)</div>
                <input value={seo.ogImage||""} onChange={e=>setSeo("ogImage",e.target.value)} placeholder="https://…/og-image.jpg" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Page slug</div>
                <div style={{display:"flex",alignItems:"center"}}>
                  <span style={{fontSize:12,color:C.text3,padding:"7px 10px",background:C.surface2,border:`1px solid ${C.border}`,borderRight:"none",borderRadius:"8px 0 0 8px"}}>/</span>
                  <input value={(page.slug||"").replace(/^\//,"")} onChange={e=>onUpdate({...page,slug:"/"+e.target.value.replace(/^\//,"").replace(/[^a-z0-9-]/g,"-")})}
                    placeholder="page-slug" style={{...inp,borderRadius:"0 8px 8px 0",flex:1}}/>
                </div>
              </div>
              <div style={{paddingTop:4,display:"flex",justifyContent:"flex-end"}}>
                <button onClick={onClose} style={{padding:"7px 18px",borderRadius:8,background:C.accent,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>Done</button>
              </div>
            </div>
          )}
          {tab==="actions"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={onDuplicate} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontFamily:F,fontSize:13,color:C.text1,textAlign:"left"}}>
                <Ic n="copy" s={15} c={C.accent}/><div><div style={{fontWeight:600}}>Duplicate page</div><div style={{fontSize:11,color:C.text3,marginTop:2}}>Creates a copy with all rows and widgets</div></div>
              </button>
              {allPages.length>1&&(
                <button onClick={onDelete} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"1px solid #FCA5A5",background:"#FEF2F2",cursor:"pointer",fontFamily:F,fontSize:13,color:"#DC2626",textAlign:"left"}}>
                  <Ic n="trash" s={15} c="#DC2626"/><div><div style={{fontWeight:600}}>Delete page</div><div style={{fontSize:11,color:"#EF4444",marginTop:2}}>Cannot be undone</div></div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Domain Wizard ────────────────────────────────────────────────────────────
const DomainWizard = ({ portal, onSave, onClose }) => {
  const [step, setStep] = useState(0);
  const [domain, setDomain] = useState(portal.custom_domain||"");
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const inp = {padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};
  const subdomain = domain.split(".").length>2?domain.split(".")[0]:"@";
  const STEPS = [
    { title:"Enter your domain", body:(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>Enter the domain or subdomain for this portal. You'll need DNS access to complete setup.</div>
        <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="careers.yourcompany.com" autoFocus style={inp}/>
        {domain.includes(".")&&<div style={{padding:"9px 14px",borderRadius:8,background:C.accentLight,fontSize:12,color:C.accent}}>Portal will be served at: <strong>{domain}</strong></div>}
      </div>
    )},
    { title:"Add DNS CNAME record", body:(
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>Add this record to your DNS provider. Changes can take up to 24 hours.</div>
        <div style={{background:"#0F1729",borderRadius:10,padding:"14px 16px",fontFamily:"monospace"}}>
          <div style={{fontSize:11,color:"#94A3B8",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>DNS Record</div>
          <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:"6px 12px",fontSize:13}}>
            <span style={{color:"#94A3B8"}}>Type</span><span style={{color:"#A5F3FC",fontWeight:700}}>CNAME</span>
            <span style={{color:"#94A3B8"}}>Name</span><span style={{color:"#A5F3FC",fontWeight:700}}>{subdomain}</span>
            <span style={{color:"#94A3B8"}}>Value</span><span style={{color:"#A5F3FC",fontWeight:700}}>cname.vercel-dns.com</span>
            <span style={{color:"#94A3B8"}}>TTL</span><span style={{color:"#94A3B8"}}>Auto</span>
          </div>
        </div>
        <div style={{padding:"10px 14px",borderRadius:8,background:"#FFF9DB",border:"1px solid #F59F00",fontSize:12,color:"#92400E"}}><strong>Cloudflare users:</strong> Set the record to "DNS only" (grey cloud) — not proxied.</div>
      </div>
    )},
    { title:"Verify & activate", body:(
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontSize:13,color:C.text2,lineHeight:1.6}}>Click Verify to check DNS propagation. This may take a few minutes after adding the record.</div>
        {!verified?(
          <button onClick={async()=>{setChecking(true);await new Promise(r=>setTimeout(r,1500));setChecking(false);setVerified(true);}}
            disabled={checking} style={{padding:"10px 20px",borderRadius:8,background:C.accent,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:checking?"wait":"pointer",fontFamily:F,opacity:checking?0.7:1}}>
            {checking?"Checking DNS…":"Verify DNS Record"}
          </button>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderRadius:10,background:"#F0FDF4",border:"1px solid #86EFAC"}}>
              <Ic n="check" s={20} c="#166534"/><div><div style={{fontSize:13,fontWeight:700,color:"#166534"}}>DNS verified!</div><div style={{fontSize:12,color:"#15803D"}}>{domain} is pointing to Vercentic</div></div>
            </div>
            <div style={{fontSize:12,color:C.text3}}>SSL will be provisioned automatically within 10 minutes of activation.</div>
          </div>
        )}
      </div>
    )},
  ];
  const cur = STEPS[step];
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(15,23,41,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:16,width:480,maxWidth:"100%",boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:C.text1}}>Custom Domain</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2}}>Step {step+1} of {STEPS.length} — {cur.title}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={16}/></button>
        </div>
        <div style={{display:"flex",gap:0,margin:"0 20px"}}>
          {STEPS.map((_,i)=><div key={i} style={{flex:1,height:3,background:i<=step?C.accent:C.border,transition:"background .2s",borderRadius:i===0?"3px 0 0 3px":i===STEPS.length-1?"0 3px 3px 0":"0"}}/>)}
        </div>
        <div style={{padding:"20px"}}>{cur.body}</div>
        <div style={{padding:"0 20px 20px",display:"flex",justifyContent:"space-between"}}>
          <button onClick={()=>step>0?setStep(s=>s-1):onClose()} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:C.text2,fontFamily:F}}>{step===0?"Cancel":"Back"}</button>
          <button disabled={step===0&&!domain.includes(".")}
            onClick={()=>step<STEPS.length-1?setStep(s=>s+1):(onSave({...portal,custom_domain:domain}),onClose())}
            style={{padding:"8px 20px",borderRadius:8,background:C.accent,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,opacity:(step===0&&!domain.includes("."))?0.5:1}}>
            {step===STEPS.length-1?"Save & Activate":"Next →"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Brand Kit AI Agent ───────────────────────────────────────────────────────
const BrandKitAgent = ({ environmentId, onApply, onClose }) => {
  const [url,     setUrl]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState("");
  const [kits,    setKits]    = useState([]);
  const [tab,     setTab]     = useState("extract");
  useEffect(()=>{ api.get(`/brand-kits?environment_id=${environmentId}`).then(d=>setKits(Array.isArray(d)?d:[])).catch(()=>{}); },[environmentId]);
  const inp = {padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};
  const analyse = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const d = await api.post("/brand-kits/analyse",{url:url.trim(),environment_id:environmentId});
      if(d.error) throw new Error(d.error);
      setResult(d);
      if (d.blocked) setError('__blocked__');
    } catch(e){ setError(e.message||"Failed to analyse site"); }
    setLoading(false);
  };
  const saveKit = async () => {
    if(!result) return;
    const s = await api.post("/brand-kits",{name:result.title||result.source_url,source_url:result.source_url,logo:result.logo,colors:result.colors,fonts:result.fonts,theme:result.theme,environment_id:environmentId});
    setKits(k=>[s,...k]); setTab("saved");
  };
  const Swatch = ({color}) => <div title={color} onClick={()=>navigator.clipboard?.writeText(color)} style={{width:26,height:26,borderRadius:6,background:color,border:"1px solid rgba(0,0,0,.1)",cursor:"pointer",flexShrink:0}}/>;
  return (
    <div style={{position:"fixed",inset:0,zIndex:700,background:"rgba(15,23,41,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:18,width:560,maxWidth:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,.25)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"18px 22px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#7950F2,#4361EE)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Ic n="sparkles" s={18} c="white"/>
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.text1}}>AI Brand Extractor</div>
                <div style={{fontSize:11,color:C.text3}}>Paste any URL — Vercentic extracts brand colours, fonts & logo</div>
              </div>
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3}}><Ic n="x" s={16}/></button>
          </div>
          <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1px solid ${C.border}`}}>
            {[["extract","✨ Extract"],["saved","Saved Kits"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"7px 0",border:"none",background:tab===id?C.accentLight:"transparent",color:tab===id?C.accent:C.text3,fontSize:12,fontWeight:tab===id?700:500,cursor:"pointer",fontFamily:F}}>
                {lbl}{id==="saved"&&kits.length>0&&<span style={{marginLeft:5,background:C.accent,color:"white",fontSize:10,fontWeight:700,borderRadius:99,padding:"1px 5px"}}>{kits.length}</span>}
              </button>
            ))}
          </div>
        </div>
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
          {tab==="extract"&&<>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyse()}
                placeholder="https://acme.com" style={{...inp,flex:1}}/>
              <button onClick={analyse} disabled={loading||!url.trim()}
                style={{padding:"9px 18px",borderRadius:8,background:C.accent,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:F,flexShrink:0,opacity:loading?0.7:1}}>
                {loading?"Analysing…":"Analyse"}
              </button>
            </div>
            {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 0",gap:10}}>
              <div style={{width:40,height:40,borderRadius:"50%",border:`3px solid ${C.accentLight}`,borderTopColor:C.accent,animation:"spin 1s linear infinite"}}/>
              <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
              <div style={{fontSize:13,color:C.text3,textAlign:"center"}}>Fetching site · extracting brand signals<br/><span style={{fontSize:11}}>Vercentic is generating your theme…</span></div>
            </div>}
            {error && error!=="__blocked__" && <div style={{padding:"10px 14px",borderRadius:8,background:C.redLight,border:`1px solid ${C.red}40`,fontSize:13,color:C.red,marginBottom:12}}>{error}</div>}
            {error==="__blocked__"&&result&&<div style={{padding:"10px 14px",borderRadius:8,background:"#FFFBEB",border:"1px solid #FCD34D",fontSize:12,color:"#92400E",marginBottom:12}}>
              <strong>⚠ Site blocked automated scraping</strong> — Vercentic generated a theme from the brand name instead. Apply it or tweak colours below.
            </div>}
            {result&&!loading&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,border:`1px solid ${C.border}`,background:C.surface2}}>
                {result.logo?<img src={result.logo} alt="logo" style={{height:36,maxWidth:120,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
                  :<div style={{width:36,height:36,borderRadius:8,background:result.theme?.primaryColor||C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"white"}}>{(result.title||"?")[0]}</div>}
                <div><div style={{fontSize:13,fontWeight:700,color:C.text1}}>{result.title||result.source_url}</div><div style={{fontSize:11,color:C.text3}}>{result.source_url}</div></div>
              </div>
              {result.colors?.length>0&&<div>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Extracted colours</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{result.colors.slice(0,10).map(c=><Swatch key={c} color={c}/>)}</div>
              </div>}
              {result.fonts?.length>0&&<div>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Fonts found</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{result.fonts.map(f=><span key={f} style={{padding:"3px 10px",borderRadius:99,background:C.surface2,border:`1px solid ${C.border}`,fontSize:12,color:C.text1}}>{f}</span>)}</div>
              </div>}
              {result.theme&&<div>
                <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Generated theme preview</div>
                <div style={{borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
                  <div style={{background:result.theme.bgColor||"#fff",padding:"14px 18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${result.theme.primaryColor}20`}}>
                      <span style={{fontSize:14,fontWeight:800,color:result.theme.primaryColor,fontFamily:result.theme.headingFont||"sans-serif"}}>{result.title?.split(" ")[0]||"Brand"}</span>
                      <div style={{display:"flex",gap:8}}>{["Jobs","Team","Apply"].map(l=><span key={l} style={{fontSize:11,color:result.theme.textColor,opacity:.6}}>{l}</span>)}</div>
                    </div>
                    <div style={{fontSize:18,fontWeight:800,color:result.theme.textColor,fontFamily:result.theme.headingFont,marginBottom:6}}>Find Your Next Opportunity</div>
                    <div style={{fontSize:12,color:result.theme.textColor,opacity:.6,marginBottom:10}}>Join a team building something great.</div>
                    <span style={{display:"inline-block",padding:"7px 18px",borderRadius:result.theme.buttonRadius||"8px",background:result.theme.buttonStyle==="outline"?"transparent":result.theme.primaryColor,color:result.theme.buttonStyle==="outline"?result.theme.primaryColor:"#fff",border:`2px solid ${result.theme.primaryColor}`,fontSize:12,fontWeight:700}}>See Open Roles →</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",height:8}}>
                    {[result.theme.primaryColor,result.theme.secondaryColor,result.theme.accentColor,result.theme.bgColor,result.theme.textColor].map((c,i)=><div key={i} style={{background:c||"#ccc"}}/>)}
                  </div>
                </div>
              </div>}
              <div style={{display:"flex",gap:8,paddingTop:4}}>
                <button onClick={saveKit} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:12,fontWeight:600,color:C.text2,fontFamily:F}}><Ic n="bookmark" s={13} c={C.text2}/>Save kit</button>
                <button onClick={()=>{onApply(result.theme,result.logo);onClose();}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"8px 20px",borderRadius:8,background:C.accent,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,color:"white",fontFamily:F}}><Ic n="check" s={13} c="white"/>Apply to portal</button>
              </div>
            </div>}
            {!result&&!loading&&!error&&<div style={{textAlign:"center",padding:"32px 0",color:C.text3}}>
              <Ic n="globe" s={40} c={C.border2}/>
              <div style={{fontSize:14,fontWeight:600,color:C.text2,marginBottom:6,marginTop:12}}>Enter any website URL</div>
              <div style={{fontSize:12,lineHeight:1.6}}>Vercentic will analyse the site and extract brand colours,<br/>fonts and logo — then generate a matching portal theme.</div>
            </div>}
          </>}
          {tab==="saved"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {kits.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:C.text3}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text2,marginBottom:4}}>No saved brand kits yet</div>
              <div style={{fontSize:12}}>Analyse a site and save its kit to reuse across portals.</div>
            </div>}
            {kits.map(kit=>(
              <div key={kit.id} style={{borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                  {kit.logo?<img src={kit.logo} alt="" style={{height:28,maxWidth:80,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
                    :<div style={{width:28,height:28,borderRadius:6,background:kit.theme?.primaryColor||C.accent}}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kit.name}</div>
                    <div style={{fontSize:11,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kit.source_url}</div>
                  </div>
                  <button onClick={()=>{onApply(kit.theme,kit.logo);onClose();}} style={{padding:"5px 12px",borderRadius:7,background:C.accent,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:F,flexShrink:0}}>Apply</button>
                </div>
                {kit.theme&&<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",height:5}}>
                  {[kit.theme.primaryColor,kit.theme.secondaryColor,kit.theme.accentColor,kit.theme.bgColor,kit.theme.textColor].map((c,i)=><div key={i} style={{background:c||"#ccc"}}/>)}
                </div>}
              </div>
            ))}
          </div>}
        </div>
      </div>
    </div>
  );
};

// ─── Portal Builder (full-screen editor) ──────────────────────────────────────
const PortalBuilder = ({ portal:init, onSave, onClose }) => {
  const [portal, setPortal] = useState({
    ...init,
    theme: init.theme||defaultTheme(),
    pages: init.pages?.length?init.pages:[defaultPage()],
    nav:   init.nav   ||defaultNav(),
    footer:init.footer||defaultFooter(),
  });
  const portalRef = useRef(portal);
  useEffect(() => { 
    portalRef.current = portal;
    _activePortalCtx = { id: portal.id, pages: portal.pages };
  }, [portal]);

  // Auto-save 2 seconds after any change (debounced)
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  const autoSaveTimer = useRef(null);
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) { hasInitialized.current = true; return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const p = portalRef.current;
      if (p.id && !String(p.id).startsWith("new_")) {
        console.log('[Portal Auto-save] saving...');
        await onSaveRef.current(p);
        console.log('[Portal Auto-save] done');
      }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal]);

  // Force-save listener — widgets can request an immediate save
  useEffect(() => {
    const handler = async () => {
      const p = portalRef.current;
      console.log('[Portal Force-save] triggered, savedListId on first jobs widget:', 
        p.pages?.[0]?.rows?.[0]?.cells?.[0]?.widgetConfig?.savedListId);
      if (p.id && !String(p.id).startsWith("new_")) {
        await onSaveRef.current(p);
        console.log('[Portal Force-save] done');
      }
    };
    window.addEventListener('talentos:portal-force-save', handler);
    return () => window.removeEventListener('talentos:portal-force-save', handler);
  }, []);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [showTheme,       setShowTheme]       = useState(false);
  const [showLibrary,     setShowLibrary]     = useState(false);

  const [showDomainWizard, setShowDomainWizard] = useState(false);
  const [showBrandKit,     setShowBrandKit]     = useState(false);
  const [showPortalSettings, setShowPortalSettings] = useState(false);
  const [pageActionsFor,  setPageActionsFor]  = useState(null);
  const [isEditing, setIsEditing] = useState(true);
  const [viewportMode, setViewportMode] = useState("desktop"); // "desktop" | "mobile"
  const [saving, setSaving] = useState(false);

  const page = portal.pages[activePageIdx]||portal.pages[0];

  const updatePage = (updated) => setPortal(p=>({...p,pages:p.pages.map((pg,i)=>i===activePageIdx?updated:pg)}));
  const addPage = () => {
    const np = {...defaultPage(),id:uid(),name:`Page ${portal.pages.length+1}`,slug:`/page-${portal.pages.length+1}`};
    setPortal(p=>({...p,pages:[...p.pages,np]}));
    setActivePageIdx(portal.pages.length);
  };

  const handleDuplicatePage = (pg) => {
    const copy = {...JSON.parse(JSON.stringify(pg)),id:uid(),name:pg.name+" (copy)",slug:pg.slug+"-copy",seo:{title:"",description:"",ogImage:""}};
    const pages = [...portal.pages,copy];
    setPortal(p=>({...p,pages}));
    setActivePageIdx(pages.length-1);
    setPageActionsFor(null);
  };
  const handleDeletePage = (pg) => {
    const pages = portal.pages.filter(x=>x.id!==pg.id);
    setPortal(p=>({...p,pages}));
    setActivePageIdx(Math.max(0,activePageIdx-1));
    setPageActionsFor(null);
  };

  const handleSave = async () => {
    const latest = portalRef.current;
    // Debug: log what widget configs are being saved
    (latest.pages||[]).forEach((pg,pi)=>(pg.rows||[]).forEach((r,ri)=>(r.cells||[]).forEach((c,ci)=>{
      if(c.widgetType==='jobs') console.log('[Portal Save] jobs widget p'+pi+'r'+ri+'c'+ci+':', JSON.stringify(c.widgetConfig));
    })));
    setSaving(true);
    await onSave(latest);
    setSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:F,background:C.bg}}>
      {/* Top bar */}
      <div style={{height:52,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:0,flexShrink:0,padding:"0 16px"}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:6,fontFamily:F,fontSize:13}}
          onMouseEnter={e=>e.currentTarget.style.color=C.text1} onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
          <Ic n="arrowL" s={14}/> Portals
        </button>
        <div style={{width:1,height:24,background:C.border,margin:"0 12px"}}/>
        <input value={portal.name} onChange={e=>setPortal(p=>({...p,name:e.target.value}))}
          style={{border:"none",outline:"none",fontSize:14,fontWeight:700,color:C.text1,background:"transparent",fontFamily:F,minWidth:160}}/>
        <div style={{flex:1}}/>
        {/* Page tabs — draggable to reorder */}
        <div style={{display:"flex",gap:2,background:C.surface2,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>
          {portal.pages.map((pg,i)=>(
            <button key={pg.id} onClick={()=>setActivePageIdx(i)}
              draggable
              onDragStart={e=>{e.dataTransfer.setData("pageIdx",String(i));}}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{
                e.preventDefault();
                const from=parseInt(e.dataTransfer.getData("pageIdx"));
                if(isNaN(from)||from===i) return;
                setPortal(p=>{const pages=[...p.pages];const[moved]=pages.splice(from,1);pages.splice(i,0,moved);return{...p,pages};});
                setActivePageIdx(i);
              }}
              style={{padding:"4px 12px",borderRadius:6,border:"none",fontFamily:F,fontSize:12,fontWeight:600,cursor:"grab",
                background:activePageIdx===i?C.surface:"transparent",color:activePageIdx===i?C.text1:C.text3,
                boxShadow:activePageIdx===i?"0 1px 3px rgba(0,0,0,.06)":"none",userSelect:"none"}}>
              {pg.name}
            </button>
          ))}
          <button onClick={addPage} title="Add page" style={{padding:"4px 7px",borderRadius:6,border:"none",background:"transparent",color:C.text3,cursor:"pointer"}}><Ic n="plus" s={11}/></button>
          {portal.pages.length>0&&<button onClick={()=>setPageActionsFor(page)} title="Page SEO & settings" style={{padding:"4px 7px",borderRadius:6,border:"none",background:"transparent",color:C.text3,cursor:"pointer"}}><Ic n="settings" s={11}/></button>}
        </div>
        <div style={{width:1,height:24,background:C.border,margin:"0 12px"}}/>
        {/* Actions */}
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {/* Viewport toggle (only in preview mode) */}
          {!isEditing&&(
            <div style={{display:"flex",gap:0,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
              {[{m:"desktop",icon:"monitor"},{m:"mobile",icon:"smartphone"}].map(({m,icon})=>(
                <button key={m} onClick={()=>setViewportMode(m)}
                  style={{display:"flex",alignItems:"center",gap:4,padding:"5px 9px",border:"none",cursor:"pointer",
                    background:viewportMode===m?C.accentLight:"transparent",
                    color:viewportMode===m?C.accent:C.text3,fontFamily:F,fontSize:11}}>
                  <Ic n={icon} s={12} c={viewportMode===m?C.accent:C.text3}/>
                  <span style={{fontWeight:600}}>{m==="desktop"?"Desktop":"Mobile"}</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={()=>{setIsEditing(e=>!e);if(isEditing)setViewportMode("desktop");}}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,
              border:`1px solid ${C.border}`,background:isEditing?C.accentLight:"transparent",color:isEditing?C.accent:C.text2}}>
            <Ic n="eye" s={12} c={isEditing?C.accent:C.text2}/>{isEditing?"Editing":"Preview"}
          </button>
          <button onClick={()=>setShowBrandKit(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,border:`1px solid ${C.border}`,background:"transparent",color:C.text2}}>
            <Ic n="sparkles" s={12} c={C.text2}/>Brand
          </button>
          <button onClick={()=>setShowDomainWizard(true)}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,border:`1px solid ${C.border}`,background:"transparent",color:C.text2}}>
            <Ic n="externalLink" s={12} c={C.text2}/>Domain
          </button>
          <button onClick={()=>{setShowPortalSettings(s=>!s);setShowTheme(false);}}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,border:`1px solid ${C.border}`,background:showPortalSettings?C.accentLight:"transparent",color:showPortalSettings?C.accent:C.text2}}>
            <Ic n="settings" s={12} c={showPortalSettings?C.accent:C.text2}/>Settings
          </button>
          <button onClick={()=>{setShowTheme(s=>!s);}}
            style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,
              border:`1px solid ${C.border}`,background:showTheme?C.accentLight:"transparent",color:showTheme?C.accent:C.text2}}>
            <Ic n="palette" s={12} c={showTheme?C.accent:C.text2}/>Theme
          </button>
          <Btn v="secondary" s="sm" icon="library" onClick={()=>setShowLibrary(true)}>Sections</Btn>
          <Btn v="primary" s="sm" onClick={handleSave} disabled={saving}>{saving?"Saving…":"Save"}</Btn>
          <Btn v={portal.status==="published"?"success":"secondary"} s="sm"
            onClick={async ()=>{
              const newStatus = portal.status==="published"?"draft":"published";
              const updated = {...portal, status: newStatus};
              setPortal(updated);
              // Auto-save the status change immediately
              if (updated.id && !String(updated.id).startsWith("new_")) {
                await api.patch(`/portals/${updated.id}`, { status: newStatus });
              }
            }}>
            {portal.status==="published"?"✓ Published":"Publish"}
          </Btn>
          {portal.status==="published" && portal.slug && (
            <button onClick={()=>{
              const slug = (portal.slug||'').replace(/^\/+/,'');
              window.open(`${window.location.origin}/${slug}`,'_blank');
            }} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,border:`1px solid ${C.green}`,background:C.greenLight,color:C.green}}>
              <Ic n="eye" s={11} c={C.green}/>View Live
            </button>
          )}
        </div>
      </div>

      {/* Edit hint bar */}
      {isEditing&&(
        <div style={{padding:"5px 16px",background:C.accentLight,borderBottom:`1px solid ${C.accent}30`,display:"flex",alignItems:"center",gap:6}}>
          <Ic n="edit" s={11} c={C.accent}/>
          <span style={{fontSize:11,color:C.accent,fontWeight:600}}>Editing — click cells to add widgets · drag rows to reorder · hover rows for settings</span>
        </div>
      )}

      {/* Canvas with live nav + footer */}
      <div style={{flex:1,overflow:"auto",marginRight:showTheme?320:0,transition:"margin-right .2s",
        background:!isEditing?"#e8eaf0":"transparent",display:"flex",flexDirection:"column",alignItems:"center",padding:!isEditing?"24px 0":"0"}}>
        {/* Mobile frame wrapper in preview mode */}
        <div style={!isEditing&&viewportMode==="mobile"?{
          width:390,minHeight:600,background:"white",borderRadius:36,boxShadow:"0 24px 80px rgba(0,0,0,.25),inset 0 0 0 2px rgba(0,0,0,.08)",
          overflow:"hidden",border:"8px solid #1a1a2e",flexShrink:0,
        }:{width:"100%"}}>
          <InlineNav
            nav={portal.nav||defaultNav()}
            theme={portal.theme}
            onChange={nav=>setPortal(p=>({...p,nav}))}
            isEditing={isEditing}/>
          <PortalCanvas page={page} onUpdate={updatePage} theme={portal.theme} isEditing={isEditing} environmentId={portal.environment_id}/>
          <InlineFooter
            footer={portal.footer||defaultFooter()}
            theme={portal.theme}
            onChange={footer=>setPortal(p=>({...p,footer}))}
            isEditing={isEditing}/>
        </div>
      </div>

      {showLibrary&&<SectionLibrary onInsert={row=>{const rows=[...page.rows];rows.push(row);updatePage({...page,rows});}} onClose={()=>setShowLibrary(false)}/>}
      {pageActionsFor&&<PageActionsMenu
        page={pageActionsFor} allPages={portal.pages}
        onUpdate={updated=>{setPortal(p=>({...p,pages:p.pages.map(x=>x.id===updated.id?updated:x)}));setPageActionsFor(updated);if(page?.id===updated.id)updatePage(updated);}}
        onDuplicate={()=>handleDuplicatePage(pageActionsFor)}
        onDelete={()=>handleDeletePage(pageActionsFor)}
        onClose={()=>setPageActionsFor(null)}/>}
      {showDomainWizard&&<DomainWizard portal={portal} onSave={updated=>setPortal(updated)} onClose={()=>setShowDomainWizard(false)}/>}
      {showPortalSettings&&<PortalSettingsDrawer portal={portal} onChange={updated=>setPortal(updated)} onClose={()=>setShowPortalSettings(false)}/>}
      {showBrandKit&&<BrandKitAgent
        environmentId={portal.environment_id}
        onApply={(theme,logo)=>setPortal(p=>({...p,theme:{...p.theme,...theme},nav:{...p.nav,logoUrl:logo||p.nav?.logoUrl||""}}))}
        onClose={()=>setShowBrandKit(false)}/>}
      {showTheme&&<>
        <div onClick={()=>setShowTheme(false)} style={{position:"fixed",inset:0,zIndex:499}}/>
        <ThemeDrawer theme={portal.theme} onChange={t=>setPortal(p=>({...p,theme:t}))} onClose={()=>setShowTheme(false)}/>
      </>}
    </div>
  );
};

// ─── Portal Card ──────────────────────────────────────────────────────────────
const PortalCard = ({ portal, onEdit, onDelete, onDuplicate, stats }) => {
  const t = portal.theme||defaultTheme();
  const pageCount = (portal.pages||[]).length||1;
  const widgetCount = (portal.pages||[]).reduce((a,pg)=>(pg.rows||[]).reduce((b,r)=>b+(r.cells||[]).filter(c=>c.widgetType).length,a),0);

  return (
    <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",transition:"all .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.08)";e.currentTarget.style.borderColor=C.border2;}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.border;}}>
      {/* Preview strip */}
      <div onClick={onEdit} style={{height:96,background:`linear-gradient(135deg,${t.primaryColor}22,${t.secondaryColor}12)`,
        position:"relative",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:13,fontWeight:700,color:t.primaryColor,fontFamily:t.headingFont||F}}>{portal.name}</div>
          <div style={{fontSize:10,color:C.text3,marginTop:2}}>{pageCount} page{pageCount!==1?"s":""} · {widgetCount} widget{widgetCount!==1?"s":""}</div>
        </div>
        <div style={{position:"absolute",bottom:8,left:10,display:"flex",gap:3}}>
          {[t.primaryColor,t.secondaryColor,t.accentColor].map((col,i)=>(
            <div key={i} style={{width:8,height:8,borderRadius:"50%",background:col||C.text3}}/>
          ))}
        </div>
        <div style={{position:"absolute",top:8,right:8}}>
          <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:99,
            background:portal.status==="published"?C.greenLight:C.amberLight,
            color:portal.status==="published"?C.green:C.amber}}>
            {portal.status==="published"?"LIVE":"DRAFT"}
          </span>
        </div>
      </div>
      {stats&&<div style={{padding:"6px 14px",background:C.surface2,borderTop:`1px solid ${C.border}`,display:"flex",gap:16}}>
        {[{label:"Views",val:stats.views_period},{label:"Clicks",val:stats.job_clicks},{label:"Apps",val:stats.applications},{label:"Conv.",val:stats.conversion_rate+"%"}].map(({label,val})=>(<div key={label} style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:C.text1}}>{val??'—'}</div><div style={{fontSize:9,color:C.text3}}>{label}</div></div>))}
      </div>}
      {/* Footer */}
      <div style={{padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{portal.name}</div>
          <div style={{fontSize:11,color:C.text3}}>{portal.slug||"/"}</div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {portal.status==="published" && (
            <button onClick={()=>{
              const slug = (portal.slug||'').replace(/^\/+/,'');
              const portalUrl = `${window.location.origin}/${slug}`;
              navigator.clipboard.writeText(portalUrl).catch(()=>{});
              window.__toast?.alert(`Copied: ${portalUrl}`);
            }} title="Copy portal link"
              style={{background:C.greenLight,border:`1px solid ${C.green}30`,borderRadius:6,cursor:"pointer",padding:"4px 8px",color:C.green,fontSize:10,fontWeight:700,fontFamily:F,display:"flex",alignItems:"center",gap:4}}>
              <Ic n="link" s={11} c={C.green}/>Link
            </button>
          )}
          <button onClick={onDuplicate} title="Duplicate"
            style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",padding:"4px 7px",color:C.text3}}>
            <Ic n="copy" s={12}/>
          </button>
          <button onClick={onEdit}
            style={{background:C.accent,border:"none",borderRadius:6,cursor:"pointer",padding:"5px 12px",color:"white",fontSize:11,fontWeight:600,fontFamily:F}}>
            Edit
          </button>
          <button onClick={onDelete}
            style={{background:C.redLight,border:`1px solid ${C.red}20`,borderRadius:6,cursor:"pointer",padding:"4px 7px",color:C.red}}>
            <Ic n="trash" s={12}/>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
export default function PortalsPage({ environment }) {
  const [portals, setPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [analytics,setAnalytics]=useState({});
  const loadStats=useCallback(async(list)=>{if(!list?.length)return;const res=await Promise.all(list.map(p=>api.get('/portal-analytics/'+p.id+'/stats?days=30').catch(()=>null)));const m={};list.forEach((p,i)=>{if(res[i])m[p.id]=res[i];});setAnalytics(m);},[]);
  const [newName, setNewName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null); // null = blank

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    const data = await api.get(`/portals?environment_id=${environment.id}`);
    const list=Array.isArray(data)?data:[];
    setPortals(list);
    setLoading(false);
    loadStats(list);
  }, [environment?.id]);

  useEffect(()=>{ load(); },[load]);

  if (editing) {
    return (
      <PortalBuilder
        portal={editing}
        onClose={()=>{ setEditing(null); load(); }}
        onSave={async (updated) => {
          // Debug: log the pages being saved
          (updated.pages||[]).forEach((pg,pi)=>(pg.rows||[]).forEach((r,ri)=>(r.cells||[]).forEach((c,ci)=>{
            if(c.widgetType==='jobs') console.log('[Portal onSave] jobs widget p'+pi+'r'+ri+'c'+ci+':', JSON.stringify(c.widgetConfig));
          })));
          if (updated.id&&!String(updated.id).startsWith("new_")) {
            const res = await api.patch(`/portals/${updated.id}`, updated);
            console.log('[Portal onSave] PATCH response pages[0].rows[0].cells[0].widgetConfig:', JSON.stringify(res?.pages?.[0]?.rows?.[0]?.cells?.[0]?.widgetConfig));
          } else {
            const created = await api.post("/portals",{...updated,environment_id:environment.id});
            setEditing(created);
          }
          load();
        }}
      />
    );
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const tmpl = TEMPLATES.find(t=>t.id===selectedTemplate);
    // Deep-clone template pages and give fresh IDs
    const pages = tmpl
      ? JSON.parse(JSON.stringify(tmpl.pages)).map(pg=>({
          ...pg, id:uid(),
          rows:pg.rows.map(r=>({...r,id:uid(),cells:r.cells.map(c=>({...c,id:uid()}))}))
        }))
      : [defaultPage()];
    const p = {
      name: newName.trim(),
      slug: `/${newName.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
      environment_id: environment.id,
      status: "draft",
      theme: tmpl ? {...tmpl.theme} : defaultTheme(),
      pages,
    };
    const created = await api.post("/portals", p);
    setNewName(""); setCreating(false); setSelectedTemplate(null);
    setEditing(created);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this portal?")) return;
    await api.delete(`/portals/${id}`);
    load();
  };

  const handleDuplicate = async (portal) => {
    const copy = {...portal,id:undefined,name:`${portal.name} (copy)`,slug:`${portal.slug}-copy`,status:"draft"};
    await api.post("/portals",{...copy,environment_id:environment.id});
    load();
  };

  return (
    <div style={{padding:"28px 32px",fontFamily:F}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text1}}>Portals</h1>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.text3}}>Build candidate-facing portals with a drag-and-drop canvas and design token system</p>
        </div>
        <Btn icon="plus" onClick={()=>setCreating(true)}>New Portal</Btn>
      </div>

      {creating&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
          onClick={e=>e.target===e.currentTarget&&(setCreating(false),setSelectedTemplate(null),setNewName(""))}>
          <div style={{background:C.surface,borderRadius:16,width:680,maxWidth:"100%",boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"90vh"}}>
            {/* Modal header */}
            <div style={{padding:"18px 24px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <div style={{fontSize:17,fontWeight:800,color:C.text1,marginBottom:2}}>New Portal</div>
              <div style={{fontSize:12,color:C.text3}}>Choose a template or start from a blank canvas</div>
            </div>
            {/* Template grid */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 24px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                {/* Blank option */}
                <div onClick={()=>setSelectedTemplate(null)}
                  style={{padding:"14px 16px",borderRadius:10,border:`2px solid ${selectedTemplate===null?C.accent:C.border}`,
                    cursor:"pointer",background:selectedTemplate===null?C.accentLight:"transparent",transition:"all .12s",
                    display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:8,background:C.surface2,border:`2px dashed ${C.border2}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>+</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:selectedTemplate===null?C.accent:C.text1}}>Blank canvas</div>
                    <div style={{fontSize:11,color:C.text3}}>Start from scratch</div>
                  </div>
                  {selectedTemplate===null&&<div style={{marginLeft:"auto",color:C.accent}}><Ic n="check" s={14} c={C.accent}/></div>}
                </div>
                {/* Template options */}
                {TEMPLATES.map(t=>(
                  <div key={t.id} onClick={()=>setSelectedTemplate(t.id)}
                    style={{padding:"14px 16px",borderRadius:10,border:`2px solid ${selectedTemplate===t.id?t.accent:C.border}`,
                      cursor:"pointer",background:selectedTemplate===t.id?`${t.accent}10`:"transparent",transition:"all .12s",
                      display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:8,background:`${t.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:20}}>
                      {t.icon}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:selectedTemplate===t.id?t.accent:C.text1}}>{t.name}</div>
                      <div style={{fontSize:10,color:C.text3,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
                      <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>
                        {t.tags.map(tag=>(
                          <span key={tag} style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:99,
                            background:selectedTemplate===t.id?`${t.accent}18`:C.surface2,
                            color:selectedTemplate===t.id?t.accent:C.text3,border:`1px solid ${selectedTemplate===t.id?t.accent+"30":C.border}`}}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedTemplate===t.id&&<Ic n="check" s={14} c={t.accent}/>}
                  </div>
                ))}
              </div>
              {/* Template preview strip */}
              {selectedTemplate&&(()=>{
                const tmpl = TEMPLATES.find(t=>t.id===selectedTemplate);
                return (
                  <div style={{borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:4}}>
                    <div style={{padding:"8px 14px",background:C.surface2,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Template preview</div>
                      <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
                        {[tmpl.theme.primaryColor,tmpl.theme.secondaryColor,tmpl.theme.bgColor].map((col,i)=>(
                          <div key={i} style={{width:10,height:10,borderRadius:"50%",background:col,border:`1px solid ${C.border}`}}/>
                        ))}
                        <span style={{fontSize:10,color:C.text3,marginLeft:6}}>{tmpl.theme.fontFamily?.split("'")[1]||"Default"}</span>
                      </div>
                    </div>
                    <div style={{padding:12,display:"flex",gap:6}}>
                      {tmpl.pages.map(pg=>(
                        <div key={pg.id} style={{flex:1,background:tmpl.theme.bgColor||"#fff",borderRadius:6,border:`1px solid ${C.border}`,overflow:"hidden",minWidth:0}}>
                          <div style={{padding:"4px 8px",background:`${tmpl.accent}18`,fontSize:9,fontWeight:700,color:tmpl.accent}}>{pg.name}</div>
                          <div style={{padding:"6px 8px",display:"flex",flexDirection:"column",gap:4}}>
                            {pg.rows.map(row=>(
                              <div key={row.id} style={{display:"flex",gap:3}}>
                                {row.cells.map(cell=>(
                                  <div key={cell.id} style={{flex:1,height:12,borderRadius:3,
                                    background:cell.widgetType==="hero"?`${tmpl.accent}40`:cell.widgetType==="jobs"?`${tmpl.accent}20`:cell.widgetType==="form"?`${tmpl.accent}30`:`${C.border}`,
                                    fontSize:7,color:C.text3,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                                    {cell.widgetType?WIDGET_TYPES.find(w=>w.type===cell.widgetType)?.label?.slice(0,3):""}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Name + actions */}
            <div style={{padding:"14px 24px 20px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
              <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Portal Name</div>
              <div style={{display:"flex",gap:8}}>
                <input value={newName} onChange={e=>setNewName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleCreate()}
                  placeholder={selectedTemplate?TEMPLATES.find(t=>t.id===selectedTemplate)?.name||"My Portal":"My Portal"}
                  autoFocus
                  style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.accent}`,
                    fontSize:13,fontFamily:F,outline:"none",color:C.text1,boxSizing:"border-box"}}/>
                <Btn v="secondary" onClick={()=>{setCreating(false);setSelectedTemplate(null);setNewName("");}}>Cancel</Btn>
                <Btn onClick={handleCreate} disabled={!newName.trim()}>
                  {selectedTemplate?"Use Template":"Create blank"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading?(
        <div style={{textAlign:"center",padding:"60px 0",color:C.text3}}>Loading portals…</div>
      ):portals.length===0?(
        <div style={{textAlign:"center",padding:"80px 0"}}>
          <div style={{fontSize:40,marginBottom:16}}>🌐</div>
          <div style={{fontSize:18,fontWeight:700,color:C.text1,marginBottom:6}}>No portals yet</div>
          <div style={{fontSize:13,color:C.text3,marginBottom:24}}>Build your first candidate-facing portal with the drag-and-drop canvas</div>
          <Btn icon="plus" onClick={()=>setCreating(true)}>Create your first portal</Btn>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
          {portals.map(p=>(
            <PortalCard key={p.id} portal={p} stats={analytics[p.id]}
              onEdit={()=>setEditing(p)}
              onDelete={()=>handleDelete(p.id)}
              onDuplicate={()=>handleDuplicate(p)}/>
          ))}
        </div>
      )}
    </div>
  );
}
