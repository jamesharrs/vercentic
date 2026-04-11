import React, { useState, useEffect, useRef, useCallback } from "react";
import { CampaignLinksModal } from "./CampaignLinks.jsx";
import { ABTestModal } from "./ABTestPanel.jsx";
import { FeedbackConfigPanel, FeedbackReports } from './portals/FeedbackConfig.jsx';
import PortalTemplatePicker from './PortalTemplatePicker.jsx';
import WizardBuilder from './WizardBuilder.jsx';
import { PORTAL_TEMPLATES, getTemplatesForType, applyTemplate } from './portalTemplates.js';
import api from './apiClient.js';
const F = "'Plus Jakarta Sans', -apple-system, sans-serif";
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
  { type:"jobs",         label:"Job List",       icon:"briefcase", desc:"Open positions with filters" },
  { type:"people",       label:"People List",    icon:"users2",    desc:"Candidates or team members" },
  { type:"hm_widget",    label:"HM Widget",      icon:"users2",    desc:"Candidate list with CTA actions for hiring managers" },
  { type:"report_widget",label:"Report",         icon:"bar2",      desc:"Embed a saved report as a chart & table" },
  { type:"ai_summary",   label:"AI Briefing",    icon:"sparkles",  desc:"Personalised AI summary — highlights priority tasks for the portal user" },
  { type:"form",         label:"Form",           icon:"form",      desc:"Linked to any object" },
  { type:"stats",        label:"Stats",          icon:"bar2",      desc:"Numbers & social proof" },
  { type:"testimonials", label:"Testimonials",   icon:"quote",     desc:"Employee quotes & stories" },
  { type:"team",         label:"Team",           icon:"userCheck", desc:"People from records" },
  { type:"video",        label:"Video",          icon:"play",      desc:"YouTube or Vimeo embed" },
  { type:"map_embed",    label:"Map",            icon:"map",       desc:"Google Maps office location" },
  { type:"cta_banner",   label:"CTA Banner",     icon:"megaphone", desc:"Full-width call to action" },
  { type:"dept_grid",     label:"Dept Grid",      icon:"grid",      desc:"Clickable department tiles" },
  { type:"benefits_grid", label:"Benefits Grid",  icon:"gift",      desc:"Icon + title + text benefit cards" },
  { type:"faq",           label:"FAQ",            icon:"help",      desc:"Expandable Q&A accordion" },
  { type:"featured_jobs", label:"Featured Jobs",  icon:"star",      desc:"Latest or pinned job cards/list" },
  { type:"trust_bar",     label:"Stats Bar",      icon:"award",     desc:"Company stats strip (500+ employees…)" },
  { type:"job_alerts",    label:"Job Alerts",     icon:"bell",      desc:"Email sign-up for new role notifications" },
  { type:"image_gallery", label:"Image Gallery",  icon:"photos",    desc:"Photo grid with lightbox" },
  { type:"app_status",    label:"App Status",     icon:"search",    desc:"Candidate self-service status lookup" },
  { type:"saved_jobs",    label:"Saved Jobs",     icon:"bookmark",  desc:"Candidate's bookmarked roles" },
  { type:"tabs",          label:"Tabs",           icon:"layout",    desc:"Tabbed content sections" },
  { type:"content",      label:"Content Block",  icon:"align",     desc:"Heading, text, cards & CTA" },
  { type:"accordion",   label:"Accordion",       icon:"list",      desc:"Collapsible FAQ-style items" },
  { type:"cta",          label:"CTA Section",    icon:"zap",       desc:"Bold call-to-action with button" },
  { type:"divider",      label:"Divider",        icon:"minus",     desc:"Horizontal separator" },
  { type:"spacer",       label:"Spacer",         icon:"square",    desc:"Blank vertical space" },
  { type:"files",        label:"Files / Docs",   icon:"paperclip", desc:"Display record attachments by file type" },
  { type:"multistep_form",label:"Multi-step Form",icon:"layers",    desc:"Step-by-step form with validation" },
  { type:"html_embed",   label:"HTML / Code",   icon:"code",      desc:"Custom HTML with AI generation" },
];

const FONT_OPTS = [
  { value:"'Plus Jakarta Sans', sans-serif",           label:"Geist (Vercentic)" },
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
  fontFamily:"'Plus Jakarta Sans', sans-serif", headingFont:"'Plus Jakarta Sans', sans-serif",
  fontSize:"16px", headingWeight:"700",
  borderRadius:"8px", buttonStyle:"filled", buttonRadius:"8px",
  maxWidth:"1200px",
});
const defaultCell = () => ({ id:uid(), widgetType:null, widgetConfig:{} });
const defaultRow  = (preset="1") => ({
  id:uid(), preset,
  bgColor:"", bgImage:"", overlayOpacity:0, padding:"md",
  cells: preset==="1" ? [defaultCell()] : preset==="3" ? [defaultCell(), defaultCell(), defaultCell()] : [defaultCell(), defaultCell()],
});
const defaultPage = () => ({ id:uid(), name:"Home", slug:"/", rows:[defaultRow("1")], seo:{ title:"", description:"", ogImage:"" } });

// ─── Portal Templates — now imported from portalTemplates.js ──────────────────
// Legacy TEMPLATES array for backwards compat with existing code
const TEMPLATES = [
  { id:"career_site", name:"Career Site", desc:"Branded job listings and application experience", icon:"globe", accent:"#4361EE", tags:["Public","Jobs","Apply"],
    theme:{ primaryColor:"#4361EE",secondaryColor:"#7C3AED",bgColor:"#FFFFFF",textColor:"#0F1729",fontFamily:"'Plus Jakarta Sans', sans-serif",buttonStyle:"filled",buttonRadius:"10px",maxWidth:"1200px" }, pages:[] },
  { id:"hm_portal", name:"Hiring Manager Portal", desc:"Review candidates and manage requisitions", icon:"users2", accent:"#334155", tags:["Internal","Review"],
    theme:{ primaryColor:"#334155",secondaryColor:"#475569",bgColor:"#F8FAFC",textColor:"#0F172A",fontFamily:"'Inter', sans-serif",buttonStyle:"filled",buttonRadius:"6px",maxWidth:"1100px" }, pages:[] },
  { id:"onboarding", name:"Onboarding Portal", desc:"Welcome new hires with guided post-offer journey", icon:"userCheck", accent:"#0D9488", tags:["New Hire","Welcome"],
    theme:{ primaryColor:"#0D9488",secondaryColor:"#0891B2",bgColor:"#F0FDFA",textColor:"#134E4A",fontFamily:"'Outfit', sans-serif",buttonStyle:"filled",buttonRadius:"999px",maxWidth:"960px" }, pages:[] },
  { id:"agency_portal", name:"Agency Portal", desc:"Let agencies submit candidates against open roles", icon:"briefcase", accent:"#D97706", tags:["Agency","Submit"],
    theme:{ primaryColor:"#D97706",secondaryColor:"#B45309",bgColor:"#FFFBEB",textColor:"#1C1917",fontFamily:"'Raleway', sans-serif",buttonStyle:"outline",buttonRadius:"8px",maxWidth:"1100px" }, pages:[] },
  { id:"campaign", name:"Campaign Page", desc:"Targeted landing pages for specific roles, graduate programmes and talent communities", icon:"megaphone", accent:"#7C3AED", tags:["Campaign","Targeted","Community"],
    theme:{ primaryColor:"#7C3AED",secondaryColor:"#5B21B6",bgColor:"#FAFAFA",textColor:"#0F1729",fontFamily:"'Space Grotesk', sans-serif",buttonStyle:"filled",buttonRadius:"12px",maxWidth:"1100px" }, pages:[] },


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
    smartphone:"M17 1H7a2 2 0 00-2 2v18a2 2 0 002 2h10a2 2 0 002-2V3a2 2 0 00-2-2zm0 18H7V5h10v14zm-5 2a1 1 0 100-2 1 1 0 000 2z",    more:"M12 13a1 1 0 100-2 1 1 0 000 2zM19 13a1 1 0 100-2 1 1 0 000 2zM5 13a1 1 0 100-2 1 1 0 000 2z",    "play-circle":"M12 22a10 10 0 100-20 10 10 0 000 20zM10 8l6 4-6 4V8z",


    film:"M19.82 2H4.18A2.18 2.18 0 002 4.18v15.64A2.18 2.18 0 004.18 22h15.64A2.18 2.18 0 0022 19.82V4.18A2.18 2.18 0 0019.82 2zM7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5",
    bookmark:"M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z",
    user:"M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8",
    messageSquare:"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    sparkles:"M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM5 3l.6 1.8L7.4 5.4 5.6 6l-.6 1.8L4.4 6l-1.8-.6L4.4 4.8zM19 15l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z",
    anchor:"M12 2a3 3 0 100 6 3 3 0 000-6zM12 8v14M5 10a7 7 0 0014 0",
    fileText:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    quote:"M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z",
    map:"M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16",
    megaphone:"M3 11l19-9-9 19-2-8-8-2zM11 13l1.5 5.5",
    userCheck:"M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM22 11l2 2 4-4",
    paperclip:"M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48",
    gift:"M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z",
    help:"M12 22a10 10 0 100-20 10 10 0 000 20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01",
    star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
    award:"M12 15a6 6 0 100-12 6 6 0 000 12zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
    bell:"M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
    photos:"M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM4 11h16M9 5v11",
    search:"M11 17a6 6 0 100-12 6 6 0 000 12zM21 21l-4.35-4.35",
    layout:"M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
    list:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    grid:"M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    code:"M10 20l4-16M4 15l4-4-4-4M20 15l-4-4 4-4",
    chevU:"M18 15l-6-6-6 6",
    library:"M4 19V5h16v14M4 9h16M9 5v14",
    award:"M12 15a7 7 0 100-14 7 7 0 000 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12",
    photos:"M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM9 3v18M15 3v18M3 9h18M3 15h18",
    layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    help:"M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01",
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
        <button onClick={()=>{
          if(isDirty&&!window.confirm("You have unsaved changes. Leave without saving?")){return;}
          onClose();
        }} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,
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


// ─── Equal Opportunities Tab ───────────────────────────────────────────────────
const EqualOppsTab = ({ portal, onChange }) => {
  const inp = { padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:C.surface, width:"100%", boxSizing:"border-box" };
  const lbl = t => <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>{t}</div>;
  const set = (k, v) => onChange({ ...portal, [k]: v });
  const TEMPLATE_FIELDS = { uk:['Gender identity','Age range','Ethnic origin','Disability','Religion or belief','Sexual orientation'], us:['Gender','Race / Ethnicity','Veteran status','Disability status'], uae:['Gender','Age range'], generic:['Gender identity','Age range'] };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ background:"#F0FDF4", border:"1px solid #86EFAC", borderRadius:10, padding:"10px 14px" }}>
        <p style={{ fontSize:12, color:"#15803D", margin:0, lineHeight:1.6 }}>Equal Opportunities monitoring is <strong>anonymous and optional</strong> for applicants. Data is stored separately from the application and not visible to hiring managers during shortlisting.</p>
      </div>
      <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:C.text2 }}>
        <input type="checkbox" checked={portal.eo_enabled!==false} onChange={e=>set("eo_enabled",e.target.checked)} style={{ width:14, height:14 }}/>
        <span style={{ fontWeight:600 }}>Enable Equal Opportunities section on application forms</span>
      </label>
      {portal.eo_enabled!==false && (<>
        <div style={{ background:C.accentLight, border:`1px solid ${C.accent}28`, borderRadius:10, padding:"10px 14px", marginBottom:4 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.accent, marginBottom:4 }}>📍 Location-driven templates</div>
          <p style={{ fontSize:11, color:C.text2, margin:0, lineHeight:1.6 }}>The EO template is <strong>automatically selected from the job's location</strong> when a candidate applies. UK / EU → full UK EO form. US → EEO form. UAE / Gulf → gender + age. The setting below is the <em>fallback</em> for ambiguous locations.</p>
        </div>
        <div style={{ marginTop:10 }}>
          {lbl("Fallback template (when job location is ambiguous)")}
          <select value={portal.eo_country||"generic"} onChange={e=>set("eo_country",e.target.value)} style={inp}>
            <option value="uk">United Kingdom — gender, age, ethnicity, disability, religion, orientation</option>
            <option value="us">United States — EEO compliant (gender, race, veteran, disability)</option>
            <option value="uae">UAE / Middle East — gender and age</option>
            <option value="generic">Generic / International — gender and age</option>
          </select>
        </div>
        <div style={{ background:C.surface2, borderRadius:10, padding:12, border:`1px solid ${C.border}`, marginTop:4 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, marginBottom:8 }}>EXAMPLE — UK / EU template questions</div>
          {(TEMPLATE_FIELDS["uk"]||[]).map(q=>(
            <div key={q} style={{ fontSize:12, color:C.text2, padding:"3px 0", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:6 }}><span style={{ color:"#0CA678" }}>✓</span> {q} <span style={{ color:C.text3, marginLeft:"auto", fontSize:11 }}>+ Prefer not to say</span></div>
          ))}
        </div>
      </>)}
    </div>
  );
};

// ─── Feedback Tab (config + reports) ──────────────────────────────────────────
const FeedbackTab = ({ portal, onChange, accent, api: apiProp }) => {
  const [sub, setSub] = useState("configure");
  const _api = apiProp || { get: p => fetch("/api"+p).then(r=>r.json()), post: (p,b) => fetch("/api"+p,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()) };
  return (<div>
    <div style={{display:"flex",gap:4,marginBottom:16}}>
      {[["configure","Configure"],["reports","Reports"]].map(([id,l])=>(
        <button key={id} onClick={()=>setSub(id)} style={{flex:1,padding:"7px 0",borderRadius:8,border:`1.5px solid ${sub===id?(accent||"#4361EE"):"#E5E7EB"}`,
          background:sub===id?((accent||"#4361EE")+"0A"):"transparent",fontSize:12,fontWeight:sub===id?700:400,
          cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",color:sub===id?(accent||"#4361EE"):"#6B7280"}}>{l}</button>
      ))}
    </div>
    {sub==="configure"&&<FeedbackConfigPanel portal={portal} onChange={onChange} accent={accent}/>}
    {sub==="reports"&&portal.id&&<FeedbackReports portalId={portal.id} accent={accent} api={_api}/>}
    {sub==="reports"&&!portal.id&&<div style={{padding:24,textAlign:"center",color:"#9CA3AF",fontSize:13}}>Save the portal first to view feedback reports.</div>}
  </div>);
};

// ─── Portal Settings Modal ────────────────────────────────────────────────────
const PortalSettingsDrawer = ({ portal, onChange, onClose, api: apiProp }) => {
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
      <div style={{background:C.surface,borderRadius:18,width:760,maxWidth:"calc(100vw - 48px)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.2)"}}>
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Ic n="settings" s={16} c={C.accent}/>
            <span style={{fontSize:16,fontWeight:800,color:C.text1}}>Portal Settings</span>
          </div>
          <button onClick={onClose} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",color:C.text2,padding:"5px 10px",display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,fontFamily:F}}>
            <Ic n="x" s={12}/> Close
          </button>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,overflowX:"auto",flexShrink:0}}>
          {[["branding","Branding"],["access","Access"],["domain","Domain & Embed"],["gdpr","GDPR"],["eo","Equal Opps"],["feedback","Feedback"],["copilot","Copilot"],["hub","Hub"],["wizard","🧙 Wizard"]].map(([id,l])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:"10px 16px",border:"none",background:"transparent",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,color:tab===id?C.accent:C.text3,borderBottom:tab===id?`2px solid ${C.accent}`:"2px solid transparent",whiteSpace:"nowrap"}}>{l}</button>
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
        {tab==="access"&&<>
          {lbl("Portal visibility")}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {value:"public",label:"Public",desc:"Anyone with the link can access this portal. Ideal for career sites and application pages."},
              {value:"internal",label:"Internal (requires login)",desc:"Only logged-in users can access this portal. Ideal for hiring manager portals, agency portals, and internal tools."},
            ].map(opt=>(
              <label key={opt.value} onClick={()=>onChange({...portal,access_type:opt.value})}
                style={{display:"flex",gap:12,padding:"12px 14px",borderRadius:10,border:`1.5px solid ${(portal.access_type||"public")===opt.value?C.accent:C.border}`,
                  background:(portal.access_type||"public")===opt.value?C.accentLight:"transparent",cursor:"pointer",transition:"all .15s"}}>
                <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${(portal.access_type||"public")===opt.value?C.accent:C.border}`,flexShrink:0,marginTop:1,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {(portal.access_type||"public")===opt.value&&<div style={{width:10,height:10,borderRadius:"50%",background:C.accent}}/>}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{opt.label}</div>
                  <div style={{fontSize:12,color:C.text3,marginTop:2,lineHeight:1.5}}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          {(portal.access_type||"public")==="internal"&&<>
            {lbl("Allowed roles (blank = any logged-in user)")}
            <input value={portal.allowed_roles?.join(", ")||""} onChange={e=>onChange({...portal,allowed_roles:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}
              placeholder="e.g. recruiter, hiring_manager" style={inp}/>
            <div style={{fontSize:11,color:C.text3}}>Comma-separated role slugs. Leave empty to allow any authenticated user.</div>
          </>}
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
        {tab==="eo"&&<EqualOppsTab portal={portal} onChange={onChange}/>}
        {tab==="feedback"&&<FeedbackTab portal={portal} onChange={onChange} accent={C.accent} api={apiProp}/>}
        {tab==="copilot"&&(()=>{
          const cop = portal.copilot || {};
          const setCop = (k,v) => onChange({ ...portal, copilot: { ...cop, [k]: v } });
          const chipStyle = (active) => ({padding:"6px 12px",borderRadius:8,border:`1.5px solid ${active?C.accent:C.border}`,background:active?C.accentLight:"transparent",color:active?C.accent:C.text2,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F,transition:"all .15s"});
          return (<>
            {/* Enable toggle */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:12,border:`1.5px solid ${cop.enabled?C.accent:C.border}`,background:cop.enabled?C.accentLight:"transparent",transition:"all .15s"}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Enable Copilot</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>Show an AI assistant on this portal</div>
              </div>
              <button onClick={()=>setCop("enabled",!cop.enabled)} style={{width:44,height:24,borderRadius:12,border:"none",background:cop.enabled?C.accent:"#D1D5DB",cursor:"pointer",position:"relative",transition:"background .2s"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:3,left:cop.enabled?23:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </button>
            </div>
            {cop.enabled&&<>
              {/* Identity */}
              <div style={{padding:"12px 14px",borderRadius:10,background:C.surface2,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Ic n="user" s={13} c={C.text3}/> Copilot Identity</div>
                {lbl("Name")}<input value={cop.name||""} onChange={e=>setCop("name",e.target.value)} placeholder="e.g. Aria, Recruiter Bot, Career Guide" style={inp}/>
                <div style={{height:10}}/>
                {lbl("Subtitle")}<input value={cop.subtitle||""} onChange={e=>setCop("subtitle",e.target.value)} placeholder="Explore roles & apply" style={inp}/>
                <div style={{height:10}}/>
                {lbl("Avatar / logo URL")}<input value={cop.avatar_url||""} onChange={e=>setCop("avatar_url",e.target.value)} placeholder="https://…/avatar.png" style={inp}/>
                {cop.avatar_url&&<img src={cop.avatar_url} alt="" style={{width:40,height:40,borderRadius:10,objectFit:"cover",marginTop:6,border:`1px solid ${C.border}`}} onError={e=>e.target.style.display="none"}/>}
              </div>
              {/* Messaging */}
              <div style={{padding:"12px 14px",borderRadius:10,background:C.surface2,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Ic n="messageSquare" s={13} c={C.text3}/> Messaging</div>
                {lbl("Welcome message")}<textarea value={cop.welcome_message||""} onChange={e=>setCop("welcome_message",e.target.value)} rows={3} placeholder="Hi! I can help you find roles and apply..." style={{...inp,resize:"vertical"}}/>
                <div style={{height:10}}/>
                {lbl("Company context (helps AI answer questions)")}<textarea value={cop.welcome_context||""} onChange={e=>setCop("welcome_context",e.target.value)} rows={3} placeholder="We are a global technology company with offices in 12 countries..." style={{...inp,resize:"vertical"}}/>
                <div style={{height:10}}/>
                {lbl("Input placeholder")}<input value={cop.input_placeholder||""} onChange={e=>setCop("input_placeholder",e.target.value)} placeholder="Ask about roles, or start applying..." style={inp}/>
              </div>
              {/* Quick actions */}
              <div style={{padding:"12px 14px",borderRadius:10,background:C.surface2,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:6,display:"flex",alignItems:"center",gap:6}}><Ic n="zap" s={13} c={C.text3}/> Quick Action Buttons</div>
                <div style={{fontSize:11,color:C.text3,marginBottom:10}}>Shown as chips below the welcome message. Leave empty for defaults.</div>
                {(cop.quick_actions||[]).map((qa,i)=>(
                  <div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
                    <input value={qa.label||""} onChange={e=>{const arr=[...(cop.quick_actions||[])];arr[i]={...arr[i],label:e.target.value};setCop("quick_actions",arr);}} placeholder="Button label" style={{...inp,flex:1}}/>
                    <input value={qa.prompt||""} onChange={e=>{const arr=[...(cop.quick_actions||[])];arr[i]={...arr[i],prompt:e.target.value};setCop("quick_actions",arr);}} placeholder="What it sends" style={{...inp,flex:2}}/>
                    <button onClick={()=>{const arr=[...(cop.quick_actions||[])];arr.splice(i,1);setCop("quick_actions",arr);}} style={{background:"none",border:"none",cursor:"pointer",padding:2,color:C.text3}}><Ic n="x" s={12}/></button>
                  </div>
                ))}
                <button onClick={()=>setCop("quick_actions",[...(cop.quick_actions||[]),{label:"",prompt:""}])} style={{fontSize:11,fontWeight:700,color:C.accent,background:"none",border:"none",cursor:"pointer",padding:"4px 0",fontFamily:F}}>+ Add quick action</button>
              </div>
              {/* Preview */}
              <div style={{padding:"14px",borderRadius:12,background:`linear-gradient(135deg, ${br.primary_color||br.primary||C.accent}, ${br.secondary_color||br.secondary||br.primary_color||br.primary||C.accent}dd)`,color:"white"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                    {cop.avatar_url?<img src={cop.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<Ic n="messageSquare" s={18} c="white"/>}
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800}}>{cop.name||"Career Assistant"}</div>
                    <div style={{fontSize:11,opacity:.8}}>{cop.subtitle||"Explore roles & apply"}</div>
                  </div>
                </div>
                <div style={{marginTop:10,fontSize:11,opacity:.7}}>Preview — this is how the copilot header will look</div>
              </div>
            </>}
          </>);
        })()}
        {tab==="hub"&&(()=>{
          const hub = portal.hub || {};
          const setHub = (k,v) => onChange({ ...portal, hub: { ...hub, [k]: v } });
          const hubUrl = `${typeof window!=="undefined"?window.location.origin:""}/hub?portal_id=${portal.id}`;
          return (<>
            {/* Enable toggle */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:12,border:`1.5px solid ${hub.enabled?C.accent:C.border}`,background:hub.enabled?C.accentLight:"transparent",transition:"all .15s",marginBottom:4}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Enable Candidate Hub</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>Candidates can log in to track their application journey</div>
              </div>
              <button onClick={()=>setHub("enabled",!hub.enabled)} style={{width:44,height:24,borderRadius:12,border:"none",background:hub.enabled?C.accent:"#D1D5DB",cursor:"pointer",position:"relative",transition:"background .2s"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:3,left:hub.enabled?23:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </button>
            </div>
            {/* RPO mode */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface2}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.text1}}>RPO / White-label mode</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>Only show applications made through this portal</div>
              </div>
              <button onClick={()=>setHub("rpo_mode",!hub.rpo_mode)} style={{width:36,height:20,borderRadius:10,border:"none",background:hub.rpo_mode?"#e03131":"#D1D5DB",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:"white",position:"absolute",top:2,left:hub.rpo_mode?18:2,transition:"left .2s"}}/>
              </button>
            </div>
            {/* Welcome message */}
            <div>
              {lbl("Hub tagline (shown on login screen)")}
              <input value={hub.tagline||""} onChange={e=>setHub("tagline",e.target.value)}
                placeholder="Track your application journey" style={inp}/>
            </div>
            {/* Hub URL */}
            <div>
              {lbl("Hub link — share with candidates")}
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <code style={{flex:1,padding:"8px 10px",borderRadius:8,background:C.surface2,fontSize:11,color:C.text1,border:`1px solid ${C.border}`,wordBreak:"break-all",lineHeight:1.5}}>{hubUrl}</code>
                <button onClick={()=>navigator.clipboard?.writeText(hubUrl)}
                  style={{padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",flexShrink:0,fontFamily:F,fontSize:12,color:C.text2,whiteSpace:"nowrap"}}>Copy</button>
              </div>
            </div>
            <div style={{padding:"12px 14px",background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,fontSize:12,color:"#15803D",lineHeight:1.7}}>
              <strong>Branding is automatic.</strong> The hub inherits this portal's colours, logo, font, and company name — no extra config needed.<br/>
              <strong>Stage visibility</strong> is configured per workflow step — open any workflow, click a step, then the <strong>Hub</strong> tab.
            </div>
          </>);
        })()}
        {tab==="wizard"&&<WizardBuilder portal={portal} onChange={onChange}/>}
        </div>
      </div>
    </div>
  );
};

// ─── Widget Picker Modal ───────────────────────────────────────────────────────
const WIDGET_CATEGORIES = [
  { id:"layout",     label:"Layout",      color:"#64748b", icon:"grid",      widgets:["divider","spacer","tabs"] },
  { id:"content",    label:"Content",     color:"#7c3aed", icon:"align",     widgets:["hero","text","rich_text","image","image_gallery","video","stats","trust_bar","testimonials","benefits_grid","faq","cta_banner","content","accordion","cta","html_embed"] },
  { id:"recruitment",label:"Recruitment", color:"#0891b2", icon:"briefcase", widgets:["jobs","featured_jobs","dept_grid","job_alerts","app_status","saved_jobs","hm_widget"] },
  { id:"people",     label:"People",      color:"#059669", icon:"users2",    widgets:["people","team"] },
  { id:"forms",      label:"Forms",       color:"#d97706", icon:"form",      widgets:["form","multistep_form","files","map_embed"] },
  { id:"insights",   label:"Insights",    color:"#7c3aed", icon:"sparkles",  widgets:["ai_summary","report_widget","hm_widget"] },
];
const WIDGET_TYPE_MAP = Object.fromEntries(WIDGET_TYPES.map(w=>[w.type,w]));

const WidgetPicker = ({ onSelect, onClose }) => {
  const [activeCat, setActiveCat] = useState("content");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  // All widgets across every category, deduplicated (hm_widget appears in multiple cats)
  const allWidgets = Object.values(WIDGET_TYPE_MAP);

  const cat = WIDGET_CATEGORIES.find(c=>c.id===activeCat)||WIDGET_CATEGORIES[0];
  const catWidgets = cat.widgets.map(t=>WIDGET_TYPE_MAP[t]).filter(Boolean);

  const searchWidgets = allWidgets.filter(w=>
    w.label.toLowerCase().includes(q) || (w.desc||"").toLowerCase().includes(q)
  );

  // In search mode we lose the category context for hover colours — use accent
  const displayWidgets = isSearching ? searchWidgets : catWidgets;
  const hoverColor     = isSearching ? C.accent : cat.color;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,.42)",zIndex:800,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"60px 16px 16px"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:18,width:760,maxWidth:"96vw",maxHeight:"calc(100vh - 80px)",display:"flex",flexDirection:"column",boxShadow:"0 24px 72px rgba(0,0,0,.22)",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"18px 22px 14px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexShrink:0,borderBottom:`1px solid ${C.border}`}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.text1}}>Add Widget</div>
            <div style={{fontSize:12,color:C.text3,marginTop:2}}>Pick a widget to add to this section</div>
          </div>
          <button onClick={onClose} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:"6px 12px",display:"flex",alignItems:"center",gap:5,color:C.text2,fontSize:12,fontWeight:600,fontFamily:F}}>
            <Ic n="x" s={12}/>Close
          </button>
        </div>
        {/* Body: sidebar + right panel */}
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          {/* Left sidebar — category list; subdued while searching */}
          <div style={{
            width:172,flexShrink:0,borderRight:`1px solid ${C.border}`,
            overflowY:"auto",padding:"10px 8px",display:"flex",flexDirection:"column",gap:2,
            background:C.surface2,
            opacity:isSearching?0.4:1,
            pointerEvents:isSearching?"none":"auto",
            transition:"opacity .15s",
          }}>
            {WIDGET_CATEGORIES.map(c=>{
              const isActive = activeCat===c.id;
              const count = c.widgets.filter(t=>WIDGET_TYPE_MAP[t]).length;
              return (
                <button key={c.id} onClick={()=>setActiveCat(c.id)}
                  style={{
                    display:"flex",alignItems:"center",gap:9,
                    padding:"9px 10px",borderRadius:10,border:"none",
                    cursor:"pointer",fontFamily:F,fontSize:12,fontWeight:isActive?700:500,
                    background:isActive?c.color+"12":"transparent",
                    color:isActive?c.color:C.text2,
                    transition:"all .12s",
                    textAlign:"left",width:"100%",
                  }}
                  onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.background=C.border; e.currentTarget.style.color=C.text1; }}}
                  onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.text2; }}}>
                  <div style={{width:28,height:28,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:isActive?c.color+"20":C.border}}>
                    <Ic n={c.icon} s={13} c={isActive?c.color:C.text3}/>
                  </div>
                  <span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.label}</span>
                  <span style={{
                    fontSize:10,fontWeight:isActive?700:500,
                    background:isActive?c.color+"20":C.border,
                    color:isActive?c.color:C.text3,
                    padding:"1px 6px",borderRadius:99,flexShrink:0,
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
          {/* Right panel — search bar + widget grid */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* Search input */}
            <div style={{padding:"10px 14px 0",flexShrink:0}}>
              <div style={{position:"relative",display:"flex",alignItems:"center"}}>
                <div style={{position:"absolute",left:10,pointerEvents:"none",display:"flex",alignItems:"center"}}>
                  <Ic n="search" s={13} c={C.text3}/>
                </div>
                <input
                  autoFocus
                  value={query}
                  onChange={e=>setQuery(e.target.value)}
                  placeholder="Search widgets…"
                  style={{
                    width:"100%",padding:"8px 10px 8px 32px",
                    borderRadius:9,border:`1.5px solid ${isSearching?C.accent:C.border}`,
                    fontFamily:F,fontSize:12,color:C.text1,background:C.surface,
                    outline:"none",transition:"border-color .15s",boxSizing:"border-box",
                  }}
                  onFocus={e=>{ e.target.style.borderColor=C.accent; }}
                  onBlur={e=>{ e.target.style.borderColor=isSearching?C.accent:C.border; }}
                />
                {isSearching && (
                  <button onClick={()=>setQuery("")}
                    style={{position:"absolute",right:8,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:2,borderRadius:4}}>
                    <Ic n="x" s={11} c={C.text3}/>
                  </button>
                )}
              </div>
              {isSearching && (
                <div style={{fontSize:11,color:C.text3,marginTop:6,paddingLeft:2}}>
                  {searchWidgets.length} result{searchWidgets.length!==1?"s":""} across all categories
                </div>
              )}
            </div>
            {/* Widget grid */}
            <div style={{flex:1,overflowY:"auto",padding:14,display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,alignContent:"start"}}>
              {displayWidgets.length===0 && (
                <div style={{gridColumn:"1/-1",textAlign:"center",padding:"32px 0",color:C.text3,fontSize:12}}>
                  No widgets match <strong style={{color:C.text2}}>"{query}"</strong>
                </div>
              )}
              {displayWidgets.map(w=>(
                <div key={w.type} onClick={()=>onSelect(w.type)}
                  style={{padding:"12px 14px",borderRadius:12,border:`1.5px solid ${C.border}`,cursor:"pointer",
                    display:"flex",alignItems:"flex-start",gap:10,transition:"all .15s",background:C.surface,userSelect:"none"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=hoverColor;e.currentTarget.style.background=hoverColor+"0d";e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=`0 4px 12px ${hoverColor}18`;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                  <div style={{width:36,height:36,borderRadius:10,background:hoverColor+"14",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Ic n={w.icon} s={16} c={hoverColor}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.text1,marginBottom:3}}>{w.label}</div>
                    <div style={{fontSize:10,color:C.text3,lineHeight:1.45}}>{w.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
      background: cfg.videoUrl ? "#0F1729"
        : cfg.bgImage ? `url(${cfg.bgImage}) center/cover no-repeat`
        : `linear-gradient(135deg,${t.primaryColor}18,${t.secondaryColor}0a)`,
      position:"relative", borderRadius:8, overflow:"hidden", minHeight: cfg.videoUrl ? 180 : "auto"
    }}>
      {cfg.videoUrl&&<video src={cfg.videoUrl} autoPlay loop muted playsInline
        style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:cfg.videoFit||"cover",zIndex:0}}/>}
      {cfg.videoUrl&&cfg.videoOverlayDarken&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1}}/>}
      {!cfg.videoUrl&&cfg.bgImage&&(cfg.overlayOpacity||0)>0&&<div style={{position:"absolute",inset:0,background:`rgba(0,0,0,${(cfg.overlayOpacity||0)/100})`}}/>}
      <div style={{position:"relative",zIndex:2}}>
        {cfg.eyebrow&&<div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:t.primaryColor,marginBottom:8,fontFamily:t.fontFamily}}>{cfg.eyebrow}</div>}
        <div style={{fontSize:20,fontWeight:parseInt(t.headingWeight)||700,color: cfg.headingColor||(cfg.videoUrl||( cfg.bgImage&&(cfg.overlayOpacity||0)>20)?"#fff":t.textColor),fontFamily:t.headingFont,marginBottom:6}}>
          {cfg.headline||"Your Compelling Headline"}
        </div>
        <div style={{fontSize:12,color: cfg.bodyColor||(cfg.videoUrl||(cfg.bgImage&&(cfg.overlayOpacity||0)>20)?"rgba(255,255,255,.8)":t.textColor),opacity:0.65,marginBottom:14,fontFamily:t.fontFamily,lineHeight:1.6}}>
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

  if (cell.widgetType==="jobs") {
    const isPeopleW = cfg._objectSlug === 'people';
    const previewHeading = cfg.heading || (isPeopleW ? 'Our Team' : 'Open Positions');
    const previewItems = isPeopleW
      ? [{n:'Sarah Chen',s:'Engineering Lead · Dubai'},{n:'Marcus Reed',s:'Product Manager · London'},{n:'Priya Nair',s:'Data Scientist · Singapore'}]
      : [{n:'Senior Engineer',s:'Engineering · Remote'},{n:'Product Designer',s:'Design · Hybrid'},{n:'Head of Sales',s:'Sales · On-site'}];
    return (
      <div style={{padding:"14px 20px",fontFamily:t.fontFamily}}>
        <div style={{fontSize:15,fontWeight:parseInt(t.headingWeight)||700,color:t.textColor,fontFamily:t.headingFont,marginBottom:10}}>{previewHeading}</div>
        {cfg.savedList && <div style={{fontSize:10,color:t.primaryColor,fontWeight:600,marginBottom:8,padding:'2px 8px',background:t.primaryColor+'15',borderRadius:4,display:'inline-block'}}>List: {cfg.savedList}</div>}
        {previewItems.map((j,i)=>(
          <div key={i} style={{padding:"8px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {isPeopleW && <div style={{width:24,height:24,borderRadius:"50%",background:t.primaryColor+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:t.primaryColor}}>{j.n.split(' ').map(w=>w[0]).join('')}</div>}
              <div>
                <div style={{fontSize:12,fontWeight:600,color:t.textColor}}>{j.n}</div>
                <div style={{fontSize:10,color:C.text3}}>{j.s}</div>
              </div>
            </div>
            <span style={{fontSize:11,color:t.primaryColor,fontWeight:600}}>{isPeopleW?"View →":"Apply →"}</span>
          </div>
        ))}
      </div>
    );
  }

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

  if (cell.widgetType==="hm_widget") return (
    <div style={{padding:"16px 20px",display:"flex",gap:10,alignItems:"center",background:"#EEF2FF",borderRadius:8}}>
      <div style={{width:36,height:36,borderRadius:10,background:"#4361EE18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Ic n="users2" s={17} c="#4361EE"/>
      </div>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:"#1E2235"}}>{cfg.widget_title||"HM Widget"}</div>
        <div style={{fontSize:11,color:"#4B5675"}}>
          {cfg.display_mode||"card"} · {(cfg.cta_buttons||[]).length} CTAs{cfg.list_id?" · list linked":"· no list selected"}
        </div>
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

  if (cell.widgetType==="html_embed") {
    const html = cfg.html||'';
    const css  = cfg.css||'';
    const t2 = theme||{};
    if (!html) return (
      <div style={{padding:"20px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,color:C.text3}}>
        <Ic n="code" s={22} c={C.text3}/>
        <div style={{fontSize:11}}>HTML / Code block · Click to configure</div>
      </div>
    );
    const fullDoc = `<!DOCTYPE html><html><head><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:${t2.fontFamily||'sans-serif'};padding:12px;}${css}</style></head><body>${html}</body></html>`;
    return (
      <iframe srcDoc={fullDoc} sandbox="allow-scripts" title="html-preview"
        style={{width:'100%',border:'none',minHeight:100,display:'block',pointerEvents:'none'}}
        onLoad={e=>{try{e.target.style.height=e.target.contentDocument.body.scrollHeight+'px';}catch{}}}/>
    );
  }

  const wt = WIDGET_TYPES.find(w=>w.type===cell.widgetType);
  const NEW_PREVIEW_TYPES = { dept_grid:'Dept Grid', benefits_grid:'Benefits Grid', faq:'FAQ Accordion', featured_jobs:'Featured Jobs', trust_bar:'Stats Bar', job_alerts:'Job Alerts', image_gallery:'Image Gallery', app_status:'App Status', saved_jobs:'Saved Jobs', tabs:'Tabs', files:'Files / Docs Widget' };
  if (NEW_PREVIEW_TYPES[cell.widgetType]) return (
    <div style={{padding:"16px 20px",display:"flex",gap:10,alignItems:"center"}}>
      <div style={{width:32,height:32,borderRadius:8,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Ic n={wt?.icon||"square"} s={15} c={C.accent}/>
      </div>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{NEW_PREVIEW_TYPES[cell.widgetType]}</div>
        <div style={{fontSize:11,color:C.text3}}>{wt?.desc||'Click to configure'}</div>
      </div>
    </div>
  );
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


// ─── Detail & List Field Configuration for portal list widgets ────────────────
const DetailFieldsConfig = ({ objectId, environmentId, detailFields, listFields, onChange, onListChange, inp, lbl }) => {
  const [fields, setFields] = useState([]);
  const [tab, setTab] = useState("detail"); // "detail" | "list"
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => {
    if (!objectId) return;
    api.get("/fields?object_id=" + objectId).then(d => setFields(Array.isArray(d) ? d : []));
  }, [objectId]);

  const HIDDEN_KEYS = ["id", "created_at", "updated_at", "deleted_at", "object_id", "environment_id"];

  const availableFields = fields.filter(f => !HIDDEN_KEYS.includes(f.api_key));

  // Currently selected keys
  const activeKeys = tab === "detail" ? (detailFields || []) : (listFields || []);
  const setActive = tab === "detail" ? onChange : onListChange;

  const isSelected = (apiKey) => activeKeys.some(f => (typeof f === "string" ? f : f.key) === apiKey);

  const toggle = (field) => {
    const key = field.api_key;
    if (isSelected(key)) {
      setActive(activeKeys.filter(f => (typeof f === "string" ? f : f.key) !== key));
    } else {
      setActive([...activeKeys, { key, label: field.name }]);
    }
  };

  const moveField = (from, to) => {
    const arr = [...activeKeys];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setActive(arr);
  };

  const selectedList = activeKeys.map(f => {
    const key = typeof f === "string" ? f : f.key;
    const label = typeof f === "string" ? f.replace(/_/g, " ") : f.label;
    const fieldDef = fields.find(fd => fd.api_key === key);
    return { key, label: label || fieldDef?.name || key, type: fieldDef?.field_type || "text" };
  }).filter(f => f.key);

  if (!fields.length) return null;

  return (
    <div style={{ borderTop: "1px solid " + C.border, paddingTop: 14, marginTop: 6 }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {[["detail", "Detail View"], ["list", "List Preview"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: tab === id ? 700 : 400,
              border: "1.5px solid " + (tab === id ? C.accent : C.border), fontFamily: F,
              background: tab === id ? C.accentLight : "transparent",
              color: tab === id ? C.accent : C.text3, cursor: "pointer"
            }}>{label}</button>
        ))}
      </div>

      <div style={{ fontSize: 10, color: C.text3, marginBottom: 8, lineHeight: 1.4 }}>
        {tab === "detail"
          ? "Choose which fields visitors see when they click a record. Drag to reorder."
          : "Choose which fields show in each row of the list. Drag to reorder."}
      </div>

      {/* Selected fields — reorderable */}
      {selectedList.length > 0 && (
        <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
            Active ({selectedList.length})
          </div>
          {selectedList.map((f, i) => (
            <div key={f.key}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragIdx !== null && dragIdx !== i) moveField(dragIdx, i); setDragIdx(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                background: C.accentLight, borderRadius: 7, border: "1px solid " + C.accent + "30",
                cursor: "grab", fontSize: 12, color: C.text1,
              }}>
              <span style={{ color: C.text3, fontSize: 10, cursor: "grab" }}>⠿</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{f.label}</span>
              <span style={{ fontSize: 9, color: C.text3, textTransform: "uppercase" }}>{f.type}</span>
              <button onClick={() => toggle({ api_key: f.key, name: f.label })}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 14, padding: 0, lineHeight: 1 }}>
                <Ic n="x" s={11} c={C.red}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available fields */}
      <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
        Available fields
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {availableFields.filter(f => !isSelected(f.api_key)).map(f => (
          <div key={f.api_key} onClick={() => toggle(f)}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 10px",
              borderRadius: 6, cursor: "pointer", fontSize: 12, color: C.text2,
              border: "1px solid " + C.border, transition: "all .1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLight; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "transparent"; }}>
            <Ic n="plus" s={11} c={C.accent}/>
            <span style={{ flex: 1 }}>{f.name}</span>
            <span style={{ fontSize: 9, color: C.text3, textTransform: "uppercase" }}>{f.field_type}</span>
          </div>
        ))}
        {availableFields.filter(f => !isSelected(f.api_key)).length === 0 && (
          <div style={{ padding: 12, textAlign: "center", color: C.text3, fontSize: 11 }}>All fields selected</div>
        )}
      </div>
    </div>
  );
};

// ─── List Widget Config (needs hooks for API calls) ───────────────────────────
const ListWidgetConfig = ({ cfg, set, setMany, inp, lbl, environmentId, cellId, defaultSlug }) => {
  const [objects, setObjects] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    if (!environmentId) return;
    api.get(`/objects?environment_id=${environmentId}`).then(d => {
      const objs = Array.isArray(d) ? d : [];
      setObjects(objs);
      // Auto-select the default object if none is configured yet
      if (!cfg.objectId && defaultSlug && objs.length) {
        const match = objs.find(o => o.slug === defaultSlug);
        if (match) setMany({ objectId: match.id, _objectSlug: match.slug });
      }
    });
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
        <select value={cfg.objectId||""} onChange={e => {
            const selO = objects.find(o => o.id === e.target.value);
            const newCfg = { objectId: e.target.value, _objectSlug: selO?.slug || "", savedListId: "", savedList: "" };
            setMany(newCfg);
            // Direct server PATCH — bypass React state chain
            if (_activePortalCtx.id && cellId) {
              const pages = _activePortalCtx.pages || [];
              for (let pi = 0; pi < pages.length; pi++) {
                for (let ri = 0; ri < (pages[pi]?.rows||[]).length; ri++) {
                  for (let ci = 0; ci < (pages[pi].rows[ri]?.cells||[]).length; ci++) {
                    if (pages[pi].rows[ri].cells[ci].id === cellId) {
                      api.patch(`/portals/${_activePortalCtx.id}/widget-config`, {
                        pageIndex: pi, rowIndex: ri, cellIndex: ci,
                        widgetConfig: { ...cfg, ...newCfg }
                      }).catch(err => console.error('[ListWidget] objectId PATCH failed:', err));
                      return;
                    }
                  }
                }
              }
            }
          }}
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
            setMany(newCfg);
            // Direct server PATCH — bypass React state chain
            if (_activePortalCtx.id && cellId) {
              const pages = _activePortalCtx.pages || [];
              let found = false;
              for (let pi = 0; pi < pages.length && !found; pi++) {
                for (let ri = 0; ri < (pages[pi]?.rows||[]).length && !found; ri++) {
                  for (let ci = 0; ci < (pages[pi].rows[ri]?.cells||[]).length && !found; ci++) {
                    if (pages[pi].rows[ri].cells[ci].id === cellId) {
                      api.patch(`/portals/${_activePortalCtx.id}/widget-config`, {
                        pageIndex: pi, rowIndex: ri, cellIndex: ci,
                        widgetConfig: { ...cfg, ...newCfg }
                      }).catch(e => console.error('[ListWidget] Direct PATCH failed:', e));
                      found = true;
                    }
                  }
                }
              }
              if (!found) console.warn('[ListWidget] Cell not found for direct save');
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

      {/* ── Detail View Field Configuration ── */}
      {cfg.objectId && (
        <DetailFieldsConfig
          objectId={cfg.objectId}
          environmentId={environmentId}
          detailFields={cfg.detailFields || []}
          listFields={cfg.listFields || []}
          onChange={(detailFields) => set("detailFields", detailFields)}
          onListChange={(listFields) => set("listFields", listFields)}
          inp={inp}
          lbl={lbl}
        />
      )}
    </div>
  );
};

// ─── Rich Text Editor (markdown toolbar) ─────────────────────────────────────
const RichTextEditor = ({ value, onChange, inp }) => {
  const ref = React.useRef(null);

  const wrap = (before, after='') => {
    const el = ref.current;
    if (!el) return;
    const {selectionStart:s, selectionEnd:e} = el;
    const sel = value.slice(s, e);
    const newVal = value.slice(0,s) + before + sel + after + value.slice(e);
    onChange(newVal);
    setTimeout(()=>{ el.focus(); el.setSelectionRange(s+before.length, e+before.length); }, 0);
  };

  const prefixLine = (prefix) => {
    const el = ref.current;
    if (!el) return;
    const {selectionStart:s} = el;
    const lineStart = value.lastIndexOf('\n', s-1)+1;
    const lineContent = value.slice(lineStart);
    // Toggle: if already prefixed, remove it; otherwise add
    const already = lineContent.startsWith(prefix);
    let newVal;
    if (already) {
      newVal = value.slice(0,lineStart) + value.slice(lineStart+prefix.length);
    } else {
      newVal = value.slice(0,lineStart) + prefix + value.slice(lineStart);
    }
    onChange(newVal);
    setTimeout(()=>{ el.focus(); }, 0);
  };

  const FMT_BTNS = [
    { label:'B', title:'Bold',     action:()=>wrap('**','**'),  style:{fontWeight:900} },
    { label:'I', title:'Italic',   action:()=>wrap('*','*'),    style:{fontStyle:'italic'} },
    { label:'H1',title:'Heading 1',action:()=>prefixLine('# '), style:{fontWeight:700,fontSize:10} },
    { label:'H2',title:'Heading 2',action:()=>prefixLine('## '),style:{fontWeight:700,fontSize:10} },
    { label:'H3',title:'Heading 3',action:()=>prefixLine('### '),style:{fontWeight:700,fontSize:10} },
    { label:'•', title:'Bullet list',action:()=>prefixLine('- '),style:{fontSize:16,lineHeight:1} },
    { label:'🔗',title:'Link',     action:()=>wrap('[','](url)'),style:{} },
  ];

  return (
    <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",background:C.surface}}>
      {/* Toolbar */}
      <div style={{display:"flex",gap:2,padding:"6px 8px",borderBottom:`1px solid ${C.border}`,background:C.surface2,flexWrap:"wrap"}}>
        {FMT_BTNS.map(b=>(
          <button key={b.label} title={b.title} onClick={b.action}
            style={{minWidth:28,height:26,borderRadius:6,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:12,fontFamily:F,color:C.text1,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 6px",flexShrink:0,...b.style}}
            onMouseEnter={e=>{e.currentTarget.style.background=C.accentLight;e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.surface;e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text1;}}>
            {b.label}
          </button>
        ))}
        <div style={{width:1,background:C.border,margin:"0 4px",alignSelf:"stretch"}}/>
        <span style={{fontSize:10,color:C.text3,alignSelf:"center",paddingLeft:4}}>Markdown</span>
      </div>
      {/* Textarea */}
      <textarea ref={ref} value={value} onChange={e=>onChange(e.target.value)} rows={10}
        placeholder={"## Heading\n\nBody text with **bold** and *italic*.\n\n- List item\n- Another item\n\n[Link text](https://…)"}
        style={{...inp,resize:"vertical",fontFamily:"monospace",fontSize:12,border:"none",borderRadius:0,outline:"none"}}/>
    </div>
  );
};

// ─── Widget Config Panel ──────────────────────────────────────────────────────
const HM_CTA_OPTIONS = [
  { action:'submit_feedback',    label:'Submit Feedback' },
  { action:'move_stage',         label:'Move Stage' },
  { action:'arrange_interview',  label:'Arrange Interview' },
  { action:'approve_offer',      label:'Approve Offer' },
  { action:'reject',             label:'Reject' },
  { action:'view_profile',       label:'View Profile' },
];

// ── ReportWidgetConfig ────────────────────────────────────────────────────────
const ReportWidgetConfig = ({ cfg, set, environmentId }) => {
  const [reports, setReports] = useState([]);
  useEffect(() => {
    if (!environmentId) return;
    api.get(`/saved-views/all-reports?environment_id=${environmentId}`)
      .then(d => setReports(Array.isArray(d) ? d : []))
      .catch(() => setReports([]));
  }, [environmentId]);
  const pr = cfg.accent_color || C.accent;
  const inp = { width:'100%', padding:'8px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box', background:C.surface };
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Widget Title</div>
        <input value={cfg.widget_title||''} onChange={e=>set('widget_title',e.target.value)} placeholder="Pipeline Overview" style={inp}/>
      </div>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Saved Report</div>
        <select value={cfg.report_id||''} onChange={e=>set('report_id',e.target.value)} style={inp}>
          <option value=''>— Select a report —</option>
          {reports.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {reports.length===0&&<div style={{ fontSize:11, color:'#D97706', marginTop:4 }}>No saved reports yet. Go to Reports → build one → save it.</div>}
      </div>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Chart Type</div>
        <div style={{ display:'flex', gap:6 }}>
          {[['bar','Bar'],['line','Line'],['pie','Pie'],['none','None']].map(([v,l])=>(
            <button key={v} onClick={()=>set('chart_type',v)} style={{
              flex:1, padding:'7px 0', borderRadius:8, cursor:'pointer', fontFamily:F,
              border:`1.5px solid ${(cfg.chart_type||'bar')===v?pr:C.border}`,
              background:(cfg.chart_type||'bar')===v?`${pr}14`:C.surface,
              color:(cfg.chart_type||'bar')===v?pr:C.text2, fontSize:11, fontWeight:700 }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:16 }}>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:C.text2, cursor:'pointer' }}>
          <input type="checkbox" checked={cfg.show_chart!==false} onChange={e=>set('show_chart',e.target.checked)} style={{ accentColor:pr }}/>
          Show chart
        </label>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:C.text2, cursor:'pointer' }}>
          <input type="checkbox" checked={cfg.show_table!==false} onChange={e=>set('show_table',e.target.checked)} style={{ accentColor:pr }}/>
          Show table
        </label>
      </div>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Max table rows</div>
        <input type="number" value={cfg.max_rows||10} min={1} max={100} onChange={e=>set('max_rows',parseInt(e.target.value)||10)} style={inp}/>
      </div>
    </div>
  );
};

// ── AISummaryWidgetConfig ─────────────────────────────────────────────────────
const AISummaryWidgetConfig = ({ cfg, set, environmentId }) => {
  const [objects, setObjects] = useState([]);
  const [lists,   setLists]   = useState({});
  const pr  = cfg.accent_color || C.accent;
  const inp = { width:'100%', padding:'8px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, fontFamily:F, outline:'none', boxSizing:'border-box', background:C.surface };

  useEffect(() => {
    if (!environmentId) return;
    api.get(`/objects?environment_id=${environmentId}`)
      .then(d => setObjects(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [environmentId]);

  const loadLists = (objectId) => {
    if (!objectId || lists[objectId]) return;
    api.get(`/saved-views/portal-lists?environment_id=${environmentId}&object_id=${objectId}`)
      .then(d => setLists(prev => ({ ...prev, [objectId]: Array.isArray(d) ? d : [] })))
      .catch(() => {});
  };

  const addSource = () => set('data_sources', [...(cfg.data_sources||[]), { object_id:'', object_name:'', list_id:'', label:'' }]);
  const updSrc = (i, k, v) => { const s=[...(cfg.data_sources||[])]; s[i]={...s[i],[k]:v}; set('data_sources',s); };
  const delSrc = i => { const s=[...(cfg.data_sources||[])]; s.splice(i,1); set('data_sources',s); };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Widget Title</div>
        <input value={cfg.widget_title||''} onChange={e=>set('widget_title',e.target.value)} placeholder="Your Daily Briefing" style={inp}/>
      </div>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Portal User Role</div>
        <input value={cfg.role||''} onChange={e=>set('role',e.target.value)} placeholder="Hiring Manager" style={inp}/>
        <div style={{ fontSize:11, color:C.text3, marginTop:4 }}>Used to personalise the AI tone and suggestions.</div>
      </div>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Data Sources</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {(cfg.data_sources||[]).map((src,i) => (
            <div key={i} style={{ padding:12, borderRadius:10, border:`1.5px solid ${C.border}`, background:'#FAFBFF' }}>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <input value={src.label||''} onChange={e=>updSrc(i,'label',e.target.value)}
                  placeholder="e.g. Candidates to Review"
                  style={{ flex:1, padding:'7px 10px', borderRadius:7, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:'none' }}/>
                <button onClick={()=>delSrc(i)} style={{ padding:'0 10px', borderRadius:7,
                  border:'1px solid #FCA5A5', background:'#FEF2F2', color:'#DC2626', cursor:'pointer', fontSize:14 }}>✕</button>
              </div>
              <select value={src.object_id||''} onChange={e=>{
                const obj=objects.find(o=>o.id===e.target.value);
                updSrc(i,'object_id',e.target.value);
                updSrc(i,'object_name',obj?.name||'');
                loadLists(e.target.value);
              }} style={{ width:'100%', padding:'7px 10px', borderRadius:7, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:'none', background:'white', marginBottom:6 }}>
                <option value=''>— Choose object —</option>
                {objects.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <select value={src.list_id||''} onChange={e=>updSrc(i,'list_id',e.target.value)}
                style={{ width:'100%', padding:'7px 10px', borderRadius:7, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:'none', background:'white' }}>
                <option value=''>All records (no filter)</option>
                {(lists[src.object_id]||[]).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          ))}
          <button onClick={addSource} style={{ padding:'9px 0', borderRadius:9,
            border:`1.5px dashed ${pr}50`, background:`${pr}06`, color:pr,
            cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:600 }}>
            + Add Data Source
          </button>
        </div>
      </div>
      <div style={{ padding:10, borderRadius:9, background:'#EEF1FF', border:'1px solid #C7D2FE', fontSize:12, color:'#4338CA' }}>
        💡 Claude reads live data and generates a personalised briefing — oldest/most urgent items highlighted first.
      </div>
    </div>
  );
};

const HMWidgetConfig = ({ cfg, set, setMany, environmentId }) => {
  const [objects,    setObjects]    = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);

  // Load objects once
  useEffect(() => {
    if (!environmentId) return;
    api.get(`/objects?environment_id=${environmentId}`)
      .then(d => setObjects(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [environmentId]);

  // Load saved lists when object changes
  useEffect(() => {
    const obj = objects.find(o => o.id === cfg.object_id);
    if (!obj) { setSavedLists([]); return; }
    setLoadingLists(true);
    // Use a system user_id so all shared lists show
    api.get(`/saved-views?object_id=${obj.id}&environment_id=${environmentId}&user_id=system`)
      .then(d => setSavedLists(Array.isArray(d) ? d : []))
      .catch(() => setSavedLists([]))
      .finally(() => setLoadingLists(false));
  }, [cfg.object_id, objects, environmentId]);

  const accentColor = cfg.accent_color || C.accent;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>

      {/* Title + Colour */}
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'end'}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Widget Title</div>
          <input value={cfg.widget_title||''} onChange={e=>set('widget_title',e.target.value)}
            placeholder="My Candidates"
            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Accent</div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <input type="color" value={accentColor} onChange={e=>set('accent_color',e.target.value)}
              style={{width:36,height:36,padding:2,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:'pointer'}}/>
            <span style={{fontSize:11,color:C.text3,fontFamily:'monospace'}}>{accentColor}</span>
          </div>
        </div>
      </div>

      {/* Step 1: Object type */}
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>
          1 · Object Type
        </div>
        <select value={cfg.object_id||''} onChange={e=>setMany({object_id:e.target.value, list_id:''})}
          style={{width:'100%',padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:'none',background:C.surface}}>
          <option value=''>— Select an object —</option>
          {objects.map(o=><option key={o.id} value={o.id}>{o.plural_name||o.name}</option>)}
        </select>
      </div>

      {/* Step 2: Saved list (only when object is selected) */}
      {cfg.object_id && (
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>
            2 · Saved List (optional — blank shows all records)
          </div>
          <select value={cfg.list_id||''} onChange={e=>set('list_id',e.target.value)}
            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:'none',background:C.surface}}>
            <option value=''>— All records (no filter) —</option>
            {loadingLists
              ? <option disabled>Loading…</option>
              : savedLists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)
            }
          </select>
          {!loadingLists && savedLists.length === 0 && (
            <div style={{fontSize:11,color:C.text3,marginTop:4}}>
              No saved lists for this object yet. Create one in the list view.
            </div>
          )}
        </div>
      )}

      {/* Display mode pills */}
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Display Mode</div>
        <div style={{display:'flex',gap:8}}>
          {['card','table','kanban'].map(m=>(
            <button key={m} onClick={()=>set('display_mode',m)} style={{
              flex:1,padding:'8px 0',borderRadius:9,cursor:'pointer',fontFamily:F,
              border:`1.5px solid ${(cfg.display_mode||'card')===m?accentColor:C.border}`,
              background:(cfg.display_mode||'card')===m?`${accentColor}14`:C.surface,
              color:(cfg.display_mode||'card')===m?accentColor:C.text2,
              fontSize:12,fontWeight:700,textTransform:'capitalize',transition:'all .12s'
            }}>{m}</button>
          ))}
        </div>
      </div>

      {/* Kanban stages */}
      {cfg.display_mode==='kanban'&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Kanban Stages (comma-separated)</div>
          <input value={(cfg.stages||[]).join(', ')} onChange={e=>set('stages',e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}
            placeholder="Applied, Screening, Interview, Offer"
            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:'none',boxSizing:'border-box'}}/>
        </div>
      )}

      {/* CTA Actions */}
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>CTA Actions</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {HM_CTA_OPTIONS.map(opt=>{
            const active=(cfg.cta_buttons||[]).some(b=>b.action===opt.action);
            return (
              <button key={opt.action} onClick={()=>{
                const btns=active
                  ?(cfg.cta_buttons||[]).filter(b=>b.action!==opt.action)
                  :[...(cfg.cta_buttons||[]),{action:opt.action,label:opt.label,color:''}];
                set('cta_buttons',btns);
              }} style={{
                padding:'6px 12px',borderRadius:8,cursor:'pointer',fontFamily:F,
                border:`1.5px solid ${active?accentColor:C.border}`,
                background:active?`${accentColor}14`:C.surface,
                color:active?accentColor:C.text2,
                fontSize:12,fontWeight:600,transition:'all .12s'
              }}>{active?'✓ ':''}{opt.label}</button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Empty State Message</div>
        <input value={cfg.empty_message||''} onChange={e=>set('empty_message',e.target.value)}
          placeholder="No candidates to show"
          style={{width:'100%',padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:'none',boxSizing:'border-box'}}/>
      </div>
    </div>
  );
  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Title + Colour */}
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'end'}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Widget Title</div>
          <input value={cfg.widget_title||''} onChange={e=>set('widget_title',e.target.value)}
            placeholder="My Candidates"
            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:'none',boxSizing:'border-box'}}
            onFocus={e=>e.target.style.borderColor=accentColor} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Accent</div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <input type="color" value={accentColor} onChange={e=>set('accent_color',e.target.value)}
              style={{width:36,height:36,padding:2,borderRadius:8,border:`1.5px solid ${C.border}`,cursor:'pointer'}}/>
            <span style={{fontSize:11,color:C.text3,fontFamily:'monospace'}}>{accentColor}</span>
          </div>
        </div>
      </div>

      {/* Data source */}
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Data Source (Saved List)</div>
        <select value={cfg.list_id||''} onChange={e=>set('list_id',e.target.value)}
          style={{width:'100%',padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:'none',background:C.surface}}>
          <option value=''>— Select a saved list —</option>
          {savedLists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        {savedLists.length===0&&(
          <div style={{fontSize:11,color:'#D97706',marginTop:4}}>
            ⚠ Mark lists as "Portal Visible" in the Lists panel to use them here.
          </div>
        )}
      </div>

      {/* Display mode pills */}
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Display Mode</div>
        <div style={{display:'flex',gap:8}}>
          {['card','table','kanban'].map(m=>(
            <button key={m} onClick={()=>set('display_mode',m)} style={{
              flex:1,padding:'8px 0',borderRadius:9,cursor:'pointer',fontFamily:F,
              border:`1.5px solid ${(cfg.display_mode||'card')===m?accentColor:C.border}`,
              background:(cfg.display_mode||'card')===m?`${accentColor}14`:C.surface,
              color:(cfg.display_mode||'card')===m?accentColor:C.text2,
              fontSize:12,fontWeight:700,textTransform:'capitalize',transition:'all .12s'
            }}>{m}</button>
          ))}
        </div>
      </div>

      {/* Kanban stages */}
      {cfg.display_mode==='kanban'&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Kanban Stages</div>
          <input value={(cfg.stages||[]).join(', ')} onChange={e=>set('stages',e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}
            placeholder="Applied, Screening, Interview, Offer"
            style={{width:'100%',padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:'none',boxSizing:'border-box'}}/>
        </div>
      )}

      {/* CTA Actions */}
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>CTA Actions</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {HM_CTA_OPTIONS.map(opt=>{
            const active=(cfg.cta_buttons||[]).some(b=>b.action===opt.action);
            return (
              <button key={opt.action} onClick={()=>{
                const btns=active
                  ?(cfg.cta_buttons||[]).filter(b=>b.action!==opt.action)
                  :[...(cfg.cta_buttons||[]),{action:opt.action,label:opt.label,color:''}];
                set('cta_buttons',btns);
              }} style={{
                padding:'6px 12px',borderRadius:8,cursor:'pointer',fontFamily:F,
                border:`1.5px solid ${active?accentColor:C.border}`,
                background:active?`${accentColor}14`:C.surface,
                color:active?accentColor:C.text2,
                fontSize:12,fontWeight:600,transition:'all .12s'
              }}>{active?'✓ ':''}{opt.label}</button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      <div>
        <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>Empty State Message</div>
        <input value={cfg.empty_message||''} onChange={e=>set('empty_message',e.target.value)}
          placeholder="No candidates to show"
          style={{width:'100%',padding:'8px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:'none',boxSizing:'border-box'}}/>
      </div>
    </div>
  );
};

// ─── HTML Embed Config ─────────────────────────────────────────────────────────
const HtmlEmbedConfig = ({ cfg, set, inp, lbl }) => {
  const [tab,       setTab]      = useState(cfg.html ? 'html' : 'ai');
  const [prompt,    setPrompt]   = useState('');
  const [styleMode, setStyleMode]= useState(cfg.styleMode || 'portal');
  const [loading,   setLoading]  = useState(false);
  const [err,       setErr]      = useState(null);

  const STYLE_MODES = [
    { id:'portal', label:'Inherit portal theme', desc:'Uses portal colours & font via CSS vars' },
    { id:'custom', label:'Custom CSS',           desc:'Write your own scoped styles'            },
    { id:'none',   label:'No extra styles',      desc:'Raw HTML only'                           },
  ];

  const generateHtml = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setErr(null);
    try {
      const system = styleMode === 'portal'
        ? `You are an expert HTML/CSS developer building portal widgets.
The portal injects CSS custom properties on :root — use them in your styles:
  --primary (brand colour), --text (text colour), --bg (page bg), --font (font family), --radius (border radius).
Write clean self-contained HTML with an embedded <style> block that references var(--primary) etc.
Output ONLY valid HTML — no markdown fences, no explanation.`
        : styleMode === 'custom'
        ? `You are an expert HTML/CSS developer. Write clean self-contained HTML with an embedded <style> block.
Output ONLY valid HTML — no markdown fences, no explanation.`
        : `You are an expert HTML developer. Write clean HTML with minimal styling.
Output ONLY valid HTML — no markdown fences, no explanation.`;
      const res  = await fetch('/api/ai/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:[{role:'user',content:prompt}], system, max_tokens:2000 }),
      });
      const data = await res.json();
      const raw  = (data?.content || data?.content?.[0]?.text || data?.reply || '').trim();
      const html = raw.replace(/^```html?\n?/i,'').replace(/```$/,'').trim();
      set('html', html);
      set('styleMode', styleMode);
      setTab('html');
    } catch(e) { setErr('Generation failed — check API key / connection'); }
    finally     { setLoading(false); }
  };

  const TABS = [{id:'html',label:'HTML'},{id:'ai',label:'✨ AI Generate'},{id:'css',label:'CSS'},{id:'preview',label:'Preview'}];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:4,borderBottom:`1px solid ${C.border}`,paddingBottom:8}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'4px 12px',borderRadius:6,border:'none',cursor:'pointer',fontFamily:F,fontSize:12,
              fontWeight:tab===t.id?700:400,background:tab===t.id?C.accent:'transparent',
              color:tab===t.id?'white':C.text3}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='html' && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {lbl('HTML Code')}
          <textarea value={cfg.html||''} onChange={e=>set('html',e.target.value)} rows={14}
            placeholder={'<div class="widget">\n  <h2>Hello from HTML</h2>\n</div>'}
            style={{...inp,fontFamily:'monospace',fontSize:12,resize:'vertical',lineHeight:1.5}}/>
          <div style={{fontSize:11,color:C.text3}}>Use <code>var(--primary)</code>, <code>var(--font)</code> etc. to align with the portal theme.</div>
        </div>
      )}

      {tab==='ai' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {lbl('Style alignment')}
          {STYLE_MODES.map(m=>(
            <label key={m.id} style={{display:'flex',alignItems:'flex-start',gap:8,cursor:'pointer',padding:'8px 10px',borderRadius:8,
              border:`1.5px solid ${styleMode===m.id?C.accent:C.border}`,background:styleMode===m.id?C.accentLight:C.surface}}>
              <input type="radio" checked={styleMode===m.id} onChange={()=>setStyleMode(m.id)} style={{marginTop:2,accentColor:C.accent}}/>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{m.label}</div>
                <div style={{fontSize:11,color:C.text3}}>{m.desc}</div>
              </div>
            </label>
          ))}
          {lbl('Describe what you want')}
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={4}
            placeholder="e.g. A card showing 3 company values with icons, using the portal's primary colour for the icon backgrounds..."
            style={{...inp,resize:'vertical',lineHeight:1.5}}/>
          {err && <div style={{fontSize:12,color:C.red,padding:'6px 10px',background:C.redLight,borderRadius:6}}>{err}</div>}
          <button onClick={generateHtml} disabled={loading||!prompt.trim()}
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px',borderRadius:8,border:'none',
              background:loading||!prompt.trim()?C.border:C.accent,color:'white',fontFamily:F,fontSize:13,fontWeight:700,
              cursor:loading||!prompt.trim()?'not-allowed':'pointer'}}>
            {loading ? <>Generating…</> : <><Ic n="sparkles" s={13} c="white"/> Generate HTML</>}
          </button>
          {cfg.html && <div style={{fontSize:11,color:C.green,display:'flex',alignItems:'center',gap:4}}><Ic n="check" s={11} c={C.green}/> HTML generated — check the HTML or Preview tab</div>}
        </div>
      )}

      {tab==='css' && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {lbl('Custom CSS (scoped to this widget)')}
          <textarea value={cfg.css||''} onChange={e=>set('css',e.target.value)} rows={12}
            placeholder={'.widget { color: var(--primary); }\n\n/* Portal CSS vars:\n   var(--primary)  brand colour\n   var(--text)     text colour\n   var(--font)     font family\n   var(--radius)   border-radius */'}
            style={{...inp,fontFamily:'monospace',fontSize:12,resize:'vertical',lineHeight:1.5}}/>
        </div>
      )}

      {tab==='preview' && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {lbl('Live preview')}
          {!cfg.html
            ? <div style={{padding:'24px',textAlign:'center',color:C.text3,fontSize:12,border:`1.5px dashed ${C.border}`,borderRadius:8}}>No HTML yet — use the HTML or AI Generate tab first</div>
            : <iframe
                srcDoc={`<!DOCTYPE html><html><head><style>*{box-sizing:border-box;margin:0;padding:0;}body{padding:16px;font-family:sans-serif;}${cfg.css||''}</style></head><body>${cfg.html}</body></html>`}
                sandbox="allow-scripts" title="preview"
                style={{width:'100%',border:`1px solid ${C.border}`,borderRadius:8,minHeight:160}}
                onLoad={e=>{try{e.target.style.height=e.target.contentDocument.body.scrollHeight+32+'px';}catch{}}}/>
          }
        </div>
      )}
    </div>
  );
};

const WidgetConfigPanel = ({ cell, onUpdate, onClose, environmentId }) => {
  // Keep local cfg state so sequential set() calls accumulate rather than overwrite each other
  const [localCfg, setLocalCfg] = useState(cell.widgetConfig || {});
  const localCfgRef = useRef(localCfg);
  localCfgRef.current = localCfg;

  const set = (k, v) => {
    const next = { ...localCfgRef.current, [k]: v };
    setLocalCfg(next);
    onUpdate({ ...cell, widgetConfig: next });
  };
  const setMany = (obj) => {
    const next = { ...localCfgRef.current, ...obj };
    setLocalCfg(next);
    onUpdate({ ...cell, widgetConfig: next });
  };
  const cfg = localCfg;
  const inp = { padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13,
    fontFamily:F, outline:"none", color:C.text1, background:C.surface, width:"100%", boxSizing:"border-box" };
  const lbl = (text) => (
    <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase",
      letterSpacing:"0.06em", marginBottom:5 }}>{text}</div>
  );
  const WIDGET_LABELS = {
    hero:"Hero Banner", text:"Rich Text", image:"Image", stats:"Stats",
    video:"Video", jobs:"Job List", job_list:"Job List", people:"People List", team:"Team", form:"Form", divider:"Divider", spacer:"Spacer", files:"Files / Docs", html_embed:"HTML / Code",
    content:"Content Block", accordion:"Accordion", cta:"CTA Section", hm_widget:"HM Widget",
    report_widget:"Report", ai_summary:"AI Briefing",
  };
  const renderFields = () => {
    switch (cell.widgetType) {
      case "hero": return (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{borderBottom:`1px solid ${C.border}`,paddingBottom:12,marginBottom:4}}>
            {lbl("Video background")}
            <input value={cfg.videoUrl||""} onChange={e=>set("videoUrl",e.target.value)} placeholder="https://example.com/video.mp4" style={inp}/>
            <div style={{fontSize:10,color:C.text3,marginTop:4}}>MP4 or WebM URL. Overrides the background image when set. Video loops silently.</div>
            {cfg.videoUrl&&<div style={{display:"flex",gap:8,marginTop:6}}>
              <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.text2,cursor:"pointer"}}>
                <input type="checkbox" checked={!!cfg.videoOverlayDarken} onChange={e=>set("videoOverlayDarken",e.target.checked)}/> Darken overlay
              </label>
              <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.text2,cursor:"pointer"}}>
                <input type="checkbox" checked={cfg.videoFit!=="contain"} onChange={e=>set("videoFit",e.target.checked?"cover":"contain")}/> Cover (crop to fill)
              </label>
            </div>}
          </div>
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
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:4}}>
            {lbl("Font colours")}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:6}}>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:4}}>Heading</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <input type="color" value={cfg.headingColor||"#000000"} onChange={e=>set("headingColor",e.target.value)} style={{width:32,height:28,borderRadius:4,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/>
                  <span style={{fontSize:10,fontFamily:"monospace",color:C.text2}}>{cfg.headingColor||"auto"}</span>
                  {cfg.headingColor&&<button onClick={()=>set("headingColor","")} style={{fontSize:9,color:C.text3,background:"none",border:"none",cursor:"pointer",padding:0}}>reset</button>}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:4}}>Body</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <input type="color" value={cfg.bodyColor||"#000000"} onChange={e=>set("bodyColor",e.target.value)} style={{width:32,height:28,borderRadius:4,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/>
                  <span style={{fontSize:10,fontFamily:"monospace",color:C.text2}}>{cfg.bodyColor||"auto"}</span>
                  {cfg.bodyColor&&<button onClick={()=>set("bodyColor","")} style={{fontSize:9,color:C.text3,background:"none",border:"none",cursor:"pointer",padding:0}}>reset</button>}
                </div>
              </div>
            </div>
            <div style={{fontSize:10,color:C.text3,marginTop:6}}>Leave unset to use theme defaults (auto-white on dark/image backgrounds).</div>
          </div>
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
        <ListWidgetConfig cfg={cfg} set={set} setMany={setMany} inp={inp} lbl={lbl} environmentId={environmentId} cellId={cell.id} defaultSlug="jobs"/>
      );
      case "people": return (
        <ListWidgetConfig cfg={cfg} set={set} setMany={setMany} inp={inp} lbl={lbl} environmentId={environmentId} cellId={cell.id} defaultSlug="people"/>
      );
      case "hm_widget": return (
        <HMWidgetConfig cfg={cfg} set={set} setMany={setMany} environmentId={environmentId}/>
      );
      case "report_widget": return (
        <ReportWidgetConfig cfg={cfg} set={set} environmentId={environmentId}/>
      );
      case "ai_summary": return (
        <AISummaryWidgetConfig cfg={cfg} set={set} environmentId={environmentId}/>
      );
      case "job_list": return (
        <ListWidgetConfig cfg={cfg} set={set} setMany={setMany} inp={inp} lbl={lbl} environmentId={environmentId} cellId={cell.id} defaultSlug="jobs"/>
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
          {lbl("Content")}
          <RichTextEditor value={cfg.content||""} onChange={v=>set("content",v)} inp={inp}/>
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
      case "dept_grid": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Explore by department" style={inp}/>
          {lbl("Columns")}
          <select value={cfg.columns||4} onChange={e=>set("columns",Number(e.target.value))} style={inp}>
            {[2,3,4,5].map(n=><option key={n} value={n}>{n} columns</option>)}
          </select>
          {lbl("Text align")}
          <select value={cfg.align||"center"} onChange={e=>set("align",e.target.value)} style={inp}><option value="left">Left</option><option value="center">Center</option></select>
          <p style={{fontSize:11,color:C.text3,margin:"4px 0 0"}}>Department tiles are pulled live from your Jobs object and auto-detected from job data.</p>
        </div>
      );
      case "benefits_grid": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Why join us?" style={inp}/>
          {lbl("Subheading")}<input value={cfg.subheading||""} onChange={e=>set("subheading",e.target.value)} placeholder="Optional supporting text" style={inp}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>{lbl("Layout")}
              <select value={cfg.layout||"card"} onChange={e=>set("layout",e.target.value)} style={inp}><option value="card">Cards</option><option value="icon-left">Icon left</option><option value="minimal">Minimal</option></select>
            </div>
            <div>{lbl("Columns")}
              <select value={cfg.columns||3} onChange={e=>set("columns",Number(e.target.value))} style={inp}><option value="2">2</option><option value="3">3</option><option value="4">4</option></select>
            </div>
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            {lbl("Benefits")}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
              {(cfg.items||[]).map((item,i)=>(
                <div key={i} style={{padding:10,borderRadius:10,border:`1px solid ${C.border}`,background:C.surface2,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",gap:6}}>
                    <input value={item.icon||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],icon:e.target.value};set("items",it);}} placeholder="🎯" style={{...inp,flex:"0 0 48px",textAlign:"center",fontSize:18,padding:"4px 6px"}}/>
                    <input value={item.title||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],title:e.target.value};set("items",it);}} placeholder="Benefit title" style={{...inp,flex:1,fontSize:12,fontWeight:600,padding:"5px 8px"}}/>
                    <button onClick={()=>set("items",(cfg.items||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:C.red,padding:2}}><Ic n="x" s={14} c={C.red}/></button>
                  </div>
                  <textarea value={item.text||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],text:e.target.value};set("items",it);}} placeholder="Short description…" rows={2} style={{...inp,fontSize:11,padding:"5px 8px",resize:"vertical"}}/>
                </div>
              ))}
              <button onClick={()=>set("items",[...(cfg.items||[]),{icon:"✨",title:"",text:""}])} style={{padding:"6px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.text3,fontFamily:F}}>+ Add benefit</button>
            </div>
          </div>
        </div>
      );
      case "faq": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Section heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Frequently asked questions" style={inp}/>
          {lbl("Text alignment")}
          <select value={cfg.align||"left"} onChange={e=>set("align",e.target.value)} style={inp}><option value="left">Left</option><option value="center">Center</option></select>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            {lbl("Questions & Answers")}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
              {(cfg.items||[{q:"",a:""}]).map((item,i)=>(
                <div key={i} style={{padding:10,borderRadius:10,border:`1px solid ${C.border}`,background:C.surface2,display:"flex",flexDirection:"column",gap:6}}>
                  <input value={item.q||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],q:e.target.value};set("items",it);}} placeholder="Question" style={{...inp,fontSize:12,fontWeight:600,padding:"5px 8px"}}/>
                  <textarea value={item.a||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],a:e.target.value};set("items",it);}} placeholder="Answer…" rows={2} style={{...inp,fontSize:11,padding:"5px 8px",resize:"vertical"}}/>
                  {(cfg.items||[]).length>1&&<button onClick={()=>set("items",(cfg.items||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:11,textAlign:"left"}}>Remove</button>}
                </div>
              ))}
              <button onClick={()=>set("items",[...(cfg.items||[]),{q:"",a:""}])} style={{padding:"6px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.text3,fontFamily:F}}>+ Add question</button>
            </div>
          </div>
        </div>
      );
      case "featured_jobs": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Latest opportunities" style={inp}/>
          {lbl("Layout")}
          <select value={cfg.layout||"cards"} onChange={e=>set("layout",e.target.value)} style={inp}><option value="cards">Cards</option><option value="list">List</option></select>
          {lbl("Job selection")}
          <select value={cfg.selectionMode||"auto"} onChange={e=>set("selectionMode",e.target.value)} style={inp}>
            <option value="auto">Auto — latest / filtered</option>
            <option value="manual">Manual — pick specific jobs</option>
          </select>
          {(!cfg.selectionMode||cfg.selectionMode==="auto")&&<>
            {lbl("Max jobs to show")}
            <select value={cfg.limit||5} onChange={e=>set("limit",Number(e.target.value))} style={inp}><option value="3">3</option><option value="5">5</option><option value="8">8</option><option value="10">10</option></select>
            {lbl("Filter by department (optional)")}<input value={cfg.department||""} onChange={e=>set("department",e.target.value)} placeholder="e.g. Engineering" style={inp}/>
          </>}
          {cfg.selectionMode==="manual"&&<>
            {lbl("Pinned job IDs")}
            <div style={{fontSize:11,color:C.text3,marginTop:-6}}>Enter one Job record ID per line. Copy IDs from the Jobs list in Vercentic.</div>
            <textarea
              value={(cfg.pinnedJobIds||[]).join("\n")}
              onChange={e=>set("pinnedJobIds",e.target.value.split("\n").map(s=>s.trim()).filter(Boolean))}
              rows={4} placeholder={"abc123\ndef456\nghi789"} style={{...inp,resize:"vertical",fontFamily:"monospace",fontSize:11}}/>
            <div style={{fontSize:11,color:C.text3}}>
              {(cfg.pinnedJobIds||[]).length} job{(cfg.pinnedJobIds||[]).length!==1?"s":""} pinned
            </div>
          </>}
          {lbl("View all link")}<input value={cfg.viewAllHref||""} onChange={e=>set("viewAllHref",e.target.value)} placeholder="#jobs or /vacancies" style={inp}/>
          {lbl("View all button text")}<input value={cfg.viewAllText||""} onChange={e=>set("viewAllText",e.target.value)} placeholder="View all jobs" style={inp}/>
        </div>
      );
      case "trust_bar": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              {lbl("Layout")}
              <select value={cfg.layout||"centered"} onChange={e=>set("layout",e.target.value)} style={inp}><option value="centered">Centred</option><option value="spread">Spread</option><option value="cards">Cards</option></select>
            </div>
            <div>
              {lbl("Background colour")}<input value={cfg.bgColor||""} onChange={e=>set("bgColor",e.target.value)} placeholder="#FAFAFA" style={inp}/>
            </div>
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            {lbl("Stats")}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
              {(cfg.items||[{value:"500+",label:"Employees"},{value:"15",label:"Offices"},{value:"8",label:"Countries"},{value:"4.3★",label:"Glassdoor"}]).map((item,i)=>(
                <div key={i} style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input value={item.value||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],value:e.target.value};set("items",it);}} placeholder="500+" style={{...inp,flex:"0 0 80px"}}/>
                  <input value={item.label||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],label:e.target.value};set("items",it);}} placeholder="Employees" style={inp}/>
                  {(cfg.items||[]).length>1&&<button onClick={()=>set("items",(cfg.items||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:C.red,padding:4,flexShrink:0}}><Ic n="x" s={14} c={C.red}/></button>}
                </div>
              ))}
              <button onClick={()=>set("items",[...(cfg.items||[{value:"500+",label:"Employees"},{value:"15",label:"Offices"},{value:"8",label:"Countries"},{value:"4.3★",label:"Glassdoor"}]),{value:"",label:""}])} style={{padding:"6px 12px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.text3,fontFamily:F}}>+ Add stat</button>
            </div>
          </div>
        </div>
      );
      case "job_alerts": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Never miss an opportunity" style={inp}/>
          {lbl("Subheading")}<input value={cfg.subheading||""} onChange={e=>set("subheading",e.target.value)} placeholder="Get notified when new roles are posted." style={inp}/>
          {lbl("Layout")}
          <select value={cfg.layout||"inline"} onChange={e=>set("layout",e.target.value)} style={inp}><option value="inline">Inline (single row)</option><option value="card">Stacked card</option></select>
          {lbl("Button text")}<input value={cfg.buttonText||""} onChange={e=>set("buttonText",e.target.value)} placeholder="Get alerts" style={inp}/>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><input type="checkbox" checked={!!cfg.showKeywords} onChange={e=>set("showKeywords",e.target.checked)}/><span style={{fontSize:12,color:C.text2}}>Show keywords field</span></div>
          {lbl("GDPR note text")}<input value={cfg.gdprNote||""} onChange={e=>set("gdprNote",e.target.value)} placeholder="We will only use your email to send job alerts." style={inp}/>
        </div>
      );
      case "image_gallery": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Section heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Life at our offices" style={inp}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>{lbl("Columns")}
              <select value={cfg.columns||3} onChange={e=>set("columns",Number(e.target.value))} style={inp}><option value="2">2</option><option value="3">3</option><option value="4">4</option></select>
            </div>
            <div>{lbl("Aspect ratio")}
              <select value={cfg.aspect||"square"} onChange={e=>set("aspect",e.target.value)} style={inp}>
                <option value="square">Square (1:1)</option><option value="landscape">Landscape (4:3)</option><option value="wide">Wide (16:9)</option>
              </select>
            </div>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.text2,cursor:"pointer"}}>
            <input type="checkbox" checked={cfg.lightbox!==false} onChange={e=>set("lightbox",e.target.checked)}/> Lightbox on click
          </label>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            {lbl("Images")}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
              {(cfg.items||[]).map((img,i)=>(
                <div key={i} style={{background:C.surface2,borderRadius:10,padding:10,border:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"flex-start"}}>
                  {img.url&&<img src={img.url} alt="" style={{width:40,height:40,objectFit:"cover",borderRadius:6,flexShrink:0}} onError={e=>e.target.style.display="none"}/>}
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                    <input value={img.url||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],url:e.target.value};set("items",it);}} placeholder="Image URL" style={{...inp,fontSize:11,padding:"5px 8px"}}/>
                    <input value={img.alt||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],alt:e.target.value};set("items",it);}} placeholder="Alt text (accessibility)" style={{...inp,fontSize:11,padding:"4px 8px"}}/>
                  </div>
                  <button onClick={()=>set("items",(cfg.items||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:C.red,padding:2,flexShrink:0}}><Ic n="x" s={14} c={C.red}/></button>
                </div>
              ))}
              <button onClick={()=>set("items",[...(cfg.items||[]),{url:"",alt:""}])} style={{padding:"6px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.text3,fontFamily:F}}>+ Add image</button>
            </div>
          </div>
        </div>
      );
      case "app_status": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Track your application" style={inp}/>
          {lbl("Subheading")}<input value={cfg.subheading||""} onChange={e=>set("subheading",e.target.value)} placeholder="Enter your email to check your application status." style={inp}/>
        </div>
      );
      case "saved_jobs": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Your saved jobs" style={inp}/>
          <p style={{fontSize:11,color:C.text3,margin:"4px 0 0"}}>Saved jobs are stored in the candidate's browser localStorage.</p>
        </div>
      );
      case "tabs": return (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lbl("Tab style")}
          <select value={cfg.tabStyle||"underline"} onChange={e=>set("tabStyle",e.target.value)} style={inp}><option value="underline">Underline</option><option value="pill">Pill</option><option value="boxed">Boxed</option></select>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            {lbl("Tabs")}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
              {(cfg.tabs||[{title:"Culture",content:""},{title:"Learning",content:""},{title:"Diversity",content:""}]).map((tab,i)=>(
                <div key={i} style={{padding:10,borderRadius:10,border:`1px solid ${C.border}`,background:C.surface2,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input value={tab.title||""} onChange={e=>{const ts=[...(cfg.tabs||[])];ts[i]={...ts[i],title:e.target.value};set("tabs",ts);}} placeholder="Tab name" style={{...inp,flex:1,fontSize:12,fontWeight:600,padding:"5px 8px"}}/>
                    {(cfg.tabs||[]).length>1&&<button onClick={()=>set("tabs",(cfg.tabs||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:C.red,padding:2}}><Ic n="x" s={14} c={C.red}/></button>}
                  </div>
                  <textarea value={tab.content||""} onChange={e=>{const ts=[...(cfg.tabs||[])];ts[i]={...ts[i],content:e.target.value};set("tabs",ts);}} placeholder="Tab content (text or Markdown)…" rows={3} style={{...inp,fontSize:11,padding:"5px 8px",resize:"vertical"}}/>
                </div>
              ))}
              <button onClick={()=>set("tabs",[...(cfg.tabs||[{title:"Culture",content:""},{title:"Learning",content:""},{title:"Diversity",content:""}]),{title:"New Tab",content:""}])} style={{padding:"6px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.text3,fontFamily:F}}>+ Add tab</button>
            </div>
          </div>
        </div>
      );
      case "files": return (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>{lbl("Section heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Documents" style={inp}/></div>
          <div>
            {lbl("File types to display")}
            <p style={{fontSize:10,color:C.text3,margin:"2px 0 6px"}}>Comma-separated type names to show (e.g. "CV / Resume, Offer Letter"). Leave blank to show all types.</p>
            <input value={(cfg.file_types||[]).join(", ")} onChange={e=>set("file_types",e.target.value.split(",").map(s=>s.trim()).filter(Boolean))} placeholder="CV / Resume, Offer Letter, Contract…" style={inp}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer",color:C.text2}}>
              <input type="checkbox" checked={cfg.allow_preview!==false} onChange={e=>set("allow_preview",e.target.checked)}/>
              <span style={{fontWeight:600}}>Allow inline preview (PDF + images)</span>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer",color:C.text2}}>
              <input type="checkbox" checked={cfg.allow_download!==false} onChange={e=>set("allow_download",e.target.checked)}/>
              <span style={{fontWeight:600}}>Allow download</span>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer",color:C.text2}}>
              <input type="checkbox" checked={!!cfg.hide_when_empty} onChange={e=>set("hide_when_empty",e.target.checked)}/>
              <span style={{fontWeight:600}}>Hide widget when no files</span>
            </label>
          </div>
          <div>
            {lbl("Record ID source")}
            <p style={{fontSize:10,color:C.text3,margin:"2px 0 6px"}}>URL param name that carries the person/record ID — e.g. <code>person_id</code> in <em>?person_id=abc</em>. Leave blank to auto-detect.</p>
            <input value={cfg.record_id_param||""} onChange={e=>set("record_id_param",e.target.value)} placeholder="person_id" style={inp}/>
          </div>
          <div>{lbl("Empty state message")}<input value={cfg.empty_text||""} onChange={e=>set("empty_text",e.target.value)} placeholder="No documents available." style={inp}/></div>
        </div>
      );
      case "content": return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>{lbl("Heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="Section heading" style={inp}/></div>
          <div>{lbl("Body text")}<textarea value={cfg.body||""} onChange={e=>set("body",e.target.value)} rows={4} placeholder="Supporting text…" style={{...inp,resize:"vertical",height:80}}/></div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            {lbl("Button label (optional)")}
            <input value={cfg.buttonText||""} onChange={e=>set("buttonText",e.target.value)} placeholder="e.g. Learn more" style={inp}/>
            <input value={cfg.buttonLink||""} onChange={e=>set("buttonLink",e.target.value)} placeholder="https://… or #anchor" style={{...inp,marginTop:6}}/>
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            {lbl("Cards (optional)")}
            {(cfg.cards||[]).map((card,i)=>(
              <div key={i} style={{background:C.surface2,borderRadius:8,padding:"8px 10px",marginBottom:6,display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input value={card.icon||""} onChange={e=>{const c=[...(cfg.cards||[])];c[i]={...c[i],icon:e.target.value};set("cards",c);}} placeholder="icon (e.g. check)" style={{...inp,flex:"0 0 80px",fontSize:11}}/>
                  <input value={card.title||""} onChange={e=>{const c=[...(cfg.cards||[])];c[i]={...c[i],title:e.target.value};set("cards",c);}} placeholder="Card title" style={{...inp,flex:1}}/>
                  <button onClick={()=>{const c=(cfg.cards||[]).filter((_,j)=>j!==i);set("cards",c);}} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,padding:2}}>✕</button>
                </div>
                <textarea value={card.desc||""} onChange={e=>{const c=[...(cfg.cards||[])];c[i]={...c[i],desc:e.target.value};set("cards",c);}} rows={2} placeholder="Card description" style={{...inp,resize:"vertical",fontSize:11,height:44}}/>
              </div>
            ))}
            <button onClick={()=>set("cards",[...(cfg.cards||[]),{icon:"",title:"",desc:""}])} style={{fontSize:11,color:C.accent,background:"none",border:`1px dashed ${C.accent}`,borderRadius:6,padding:"5px 10px",cursor:"pointer",width:"100%"}}>+ Add card</button>
          </div>
        </div>
      );
      case "accordion": return (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>{lbl("Section heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="e.g. Frequently Asked Questions" style={inp}/></div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            {lbl("Items")}
            {(cfg.items||[]).map((item,i)=>(
              <div key={i} style={{background:C.surface2,borderRadius:8,padding:"8px 10px",marginBottom:6,display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input value={item.title||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],title:e.target.value};set("items",it);}} placeholder="Question or title" style={{...inp,flex:1}}/>
                  <button onClick={()=>set("items",(cfg.items||[]).filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,padding:2}}>✕</button>
                </div>
                <textarea value={item.content||""} onChange={e=>{const it=[...(cfg.items||[])];it[i]={...it[i],content:e.target.value};set("items",it);}} rows={2} placeholder="Answer or body text" style={{...inp,resize:"vertical",fontSize:11,height:52}}/>
              </div>
            ))}
            <button onClick={()=>set("items",[...(cfg.items||[]),{title:"",content:""}])} style={{fontSize:11,color:C.accent,background:"none",border:`1px dashed ${C.accent}`,borderRadius:6,padding:"5px 10px",cursor:"pointer",width:"100%"}}>+ Add item</button>
          </div>
        </div>
      );
      case "cta": return (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>{lbl("Heading")}<input value={cfg.heading||""} onChange={e=>set("heading",e.target.value)} placeholder="e.g. Ready to join us?" style={inp}/></div>
          <div>{lbl("Subheading (optional)")}<input value={cfg.subheading||""} onChange={e=>set("subheading",e.target.value)} placeholder="Supporting line of text" style={inp}/></div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            {lbl("Button label")}<input value={cfg.buttonText||""} onChange={e=>set("buttonText",e.target.value)} placeholder="e.g. See open roles" style={inp}/>
            <input value={cfg.buttonLink||""} onChange={e=>set("buttonLink",e.target.value)} placeholder="https://… or #anchor" style={{...inp,marginTop:6}}/>
          </div>
          <div>
            {lbl("Style")}
            <div style={{display:"flex",gap:6}}>
              {["dark","accent","light"].map(s=>(
                <button key={s} onClick={()=>set("style",s)} style={{flex:1,padding:"5px 0",borderRadius:6,border:`1.5px solid ${cfg.style===s?C.accent:C.border}`,background:cfg.style===s?C.accentLight:"transparent",color:cfg.style===s?C.accent:C.text2,fontSize:11,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      );
      case "html_embed":     return <HtmlEmbedConfig cfg={cfg} set={set} inp={inp} lbl={lbl} cell={cell} onUpdate={onUpdate}/>;
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

            {lbl("Full width")}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:row.fullWidth?C.greenLight:C.surface2,borderRadius:8,border:`1px solid ${row.fullWidth?C.green:C.border}`}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.text1}}>Edge-to-edge</div>
                <div style={{fontSize:10,color:C.text3}}>Content spans full viewport width</div>
              </div>
              <button onClick={()=>set("fullWidth",!row.fullWidth)} style={{width:36,height:20,borderRadius:10,background:row.fullWidth?C.green:"#D1D5DB",position:"relative",cursor:"pointer",transition:"background 0.2s",border:"none"}}>
                <div style={{position:"absolute",top:2,left:row.fullWidth?18:2,width:16,height:16,borderRadius:"50%",background:"white",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </button>
            </div>

            {lbl("Max height")}
            <input value={style.maxHeight||""} onChange={e=>setStyle("maxHeight",e.target.value)}
              placeholder="e.g. 500px, 60vh" style={inp}/>
            <div style={{fontSize:10,color:C.text3}}>Content will be clipped if it exceeds this height. Useful for hero banners.</div>
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
    const g = parseInt(row.style?.gap) || 16;
    const half = g/2;
    if (row.preset==="1")   return "1 1 100%";
    if (row.preset==="1-1") return `0 0 calc(50% - ${half}px)`;
    if (row.preset==="1-2") return ci===0?`0 0 calc(33.33% - ${half}px)`:`0 0 calc(66.66% - ${half}px)`;
    if (row.preset==="2-1") return ci===0?`0 0 calc(66.66% - ${half}px)`:`0 0 calc(33.33% - ${half}px)`;
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
        ...(row.style?.zIndex?{zIndex:row.style.zIndex}:{}),...(row.style?.maxHeight?{maxHeight:row.style.maxHeight,overflow:"hidden"}:{})}}>
      {/* Overlay */}
      {row.bgImage&&(row.overlayOpacity||0)>0&&(
        <div style={{position:"absolute",inset:0,background:`rgba(0,0,0,${(row.overlayOpacity||0)/100})`,borderRadius:isEditing?10:0,pointerEvents:"none"}}/>
      )}
      {/* Content */}
      <div style={{position:"relative",padding:`${padding} ${isEditing?"16px":"0"}`,maxWidth:row.fullWidth===true?"none":(row.style?.maxWidth)||theme.maxWidth||"1200px",margin:row.fullWidth===true?"0":"0 auto",boxSizing:"border-box",textAlign:row.style?.textAlign||undefined,...(row.style?.paddingTop?{paddingTop:row.style.paddingTop}:{}),...(row.style?.paddingBottom?{paddingBottom:row.style.paddingBottom}:{}),...(row.style?.paddingLeft?{paddingLeft:row.style.paddingLeft}:{}),...(row.style?.paddingRight?{paddingRight:row.style.paddingRight}:{}),...(row.style?.borderRadius?{borderRadius:row.style.borderRadius}:{}),...(row.style?.boxShadow?{boxShadow:row.style.boxShadow}:{}),...(row.style?.minHeight?{minHeight:row.style.minHeight}:{})}}>
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
      <div style={{background:nav.overlay?"transparent":bg, borderBottom:(nav.overlay||!nav.showBorder)?"none":`1px solid ${nav.borderColor||pr+'18'}`, boxShadow:nav.overlay||nav.shadow===false?"none":"0 1px 8px rgba(0,0,0,.06)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:`0 32px`, height:nav.headerHeight||60, fontFamily:ff, ...(nav.overlay?{position:"absolute",top:0,left:0,right:0,zIndex:50}:{})}}
        onClick={isEditing ? ()=>setEditOpen(e=>!e) : undefined}
        title={isEditing?"Click to edit nav":""}
        onMouseEnter={e=>{if(isEditing)e.currentTarget.style.outline=`2px dashed ${pr}`;}}
        onMouseLeave={e=>{e.currentTarget.style.outline="none";}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {nav.logoUrl
            ? <img src={nav.logoUrl} alt={nav.logoText||"Logo"} style={{height:nav.logoHeight||32,maxWidth:nav.logoMaxWidth||140,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
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
            <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                {lbl(`Logo height: ${nav.logoHeight||32}px`)}
                <input type="range" min={16} max={80} value={nav.logoHeight||32} onChange={e=>set("logoHeight",Number(e.target.value))} style={{width:"100%",marginTop:4}}/>
              </div>
              <div>
                {lbl(`Header height: ${nav.headerHeight||60}px`)}
                <input type="range" min={40} max={120} value={nav.headerHeight||60} onChange={e=>set("headerHeight",Number(e.target.value))} style={{width:"100%",marginTop:4}}/>
              </div>
            </div>
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
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:C.text2,cursor:"pointer"}}>
                <input type="checkbox" checked={nav.sticky!==false} onChange={e=>set("sticky",e.target.checked)}/> Sticky nav
              </label>
              <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,color:C.text2,cursor:"pointer"}}>
                <input type="checkbox" checked={!!nav.overlay} onChange={e=>set("overlay",e.target.checked)}/> Overlay hero (transparent, floats over content)
              </label>
            </div>
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
  const logoH=nav.logoHeight||32;
  const headerH=nav.headerHeight||60;
  return(
    <div style={{position:"fixed",top:0,right:0,width:360,height:"100vh",background:C.surface,borderLeft:`1px solid ${C.border}`,zIndex:500,display:"flex",flexDirection:"column",boxShadow:"-8px 0 40px rgba(0,0,0,.1)"}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Ic n="menu" s={15} c={C.accent}/><span style={{fontSize:15,fontWeight:800,color:C.text1}}>Navigation</span></div>
        <button onClick={onClose} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,cursor:"pointer",color:C.text2,padding:"5px 10px",display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,fontFamily:F}}><Ic n="x" s={12}/> Close</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>

          {/* Logo */}
          <div style={{background:C.surface2,borderRadius:10,padding:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:10}}>Logo</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>{lbl("Logo URL")}<input value={nav.logoUrl||""} onChange={e=>set("logoUrl",e.target.value)} placeholder="https://…/logo.png" style={inp}/></div>
              <div>{lbl("Fallback text")}<input value={nav.logoText||""} onChange={e=>set("logoText",e.target.value)} placeholder="Company name" style={inp}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  {lbl(`Logo height: ${logoH}px`)}
                  <input type="range" min={20} max={80} value={logoH} onChange={e=>set("logoHeight",Number(e.target.value))} style={{width:"100%",marginTop:4}}/>
                </div>
                <div>
                  {lbl("Logo max width")}
                  <input type="number" value={nav.logoMaxWidth||140} onChange={e=>set("logoMaxWidth",Number(e.target.value))} placeholder="140" style={{...inp,padding:"5px 8px"}} min={40} max={320}/>
                </div>
              </div>
            </div>
          </div>

          {/* Layout */}
          <div style={{background:C.surface2,borderRadius:10,padding:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:10}}>Layout & Height</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                {lbl(`Header height: ${headerH}px`)}
                <input type="range" min={40} max={120} value={headerH} onChange={e=>set("headerHeight",Number(e.target.value))} style={{width:"100%",marginTop:4}}/>
              </div>
              <div>{lbl("Nav alignment")}
                <select value={nav.alignment||"spread"} onChange={e=>set("alignment",e.target.value)} style={inp}>
                  <option value="spread">Logo left · Links right</option>
                  <option value="center">Logo centre · Links below</option>
                  <option value="left">All left-aligned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Colours */}
          <div style={{background:C.surface2,borderRadius:10,padding:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:10}}>Colours</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>{lbl("Background")}<input type="color" value={nav.bgColor||theme?.bgColor||"#ffffff"} onChange={e=>set("bgColor",e.target.value)} style={{width:"100%",height:32,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/></div>
              <div>{lbl("Text / links")}<input type="color" value={nav.textColor||theme?.textColor||"#0F1729"} onChange={e=>set("textColor",e.target.value)} style={{width:"100%",height:32,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/></div>
              <div>{lbl("Active / hover")}<input type="color" value={nav.activeColor||theme?.primaryColor||"#4361EE"} onChange={e=>set("activeColor",e.target.value)} style={{width:"100%",height:32,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/></div>
              <div>{lbl("Border / divider")}<input type="color" value={nav.borderColor||"#E8ECF8"} onChange={e=>set("borderColor",e.target.value)} style={{width:"100%",height:32,borderRadius:6,border:`1px solid ${C.border}`,cursor:"pointer",padding:2}}/></div>
            </div>
          </div>

          {/* Behaviour */}
          <div style={{background:C.surface2,borderRadius:10,padding:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:10}}>Behaviour</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}>
                <input type="checkbox" checked={!!nav.sticky} onChange={e=>set("sticky",e.target.checked)} style={{width:14,height:14}}/>Sticky — stays at top on scroll
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}>
                <input type="checkbox" checked={!!nav.overlay} onChange={e=>set("overlay",e.target.checked)} style={{width:14,height:14}}/>Overlay hero (transparent, floats over content)
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}>
                <input type="checkbox" checked={nav.shadow!==false} onChange={e=>set("shadow",e.target.checked)} style={{width:14,height:14}}/>Drop shadow
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.text2,cursor:"pointer"}}>
                <input type="checkbox" checked={!!nav.showBorder} onChange={e=>set("showBorder",e.target.checked)} style={{width:14,height:14}}/>Bottom border
              </label>
            </div>
          </div>

          {/* Nav links */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
            {lbl("Nav links")}
            {links.map((lnk,i)=>(<div key={lnk.id} style={{background:C.surface2,borderRadius:8,padding:10,marginBottom:8,border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",gap:6,marginBottom:6}}>
                <input value={lnk.label} onChange={e=>updateLink(i,{label:e.target.value})} placeholder="Label" style={{...inp,flex:1,fontSize:12,padding:"5px 8px"}}/>
                <button onClick={()=>removeLink(i)} style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:14,padding:"0 4px"}}>✕</button>
              </div>
              <div style={{display:"flex",gap:6}}>
                <input value={lnk.href} onChange={e=>updateLink(i,{href:e.target.value})} placeholder="URL, /page, or #section-id" style={{...inp,flex:1,fontSize:12,padding:"5px 8px"}}/>
                <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.text3,cursor:"pointer",flexShrink:0}}>
                  <input type="checkbox" checked={!!lnk.isButton} onChange={e=>updateLink(i,{isButton:e.target.checked})}/> Btn
                </label>
              </div>
            </div>))}
            <button onClick={addLink} style={{width:"100%",padding:"6px",borderRadius:8,border:`1.5px dashed ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,color:C.text3,fontFamily:F}}>+ Add link</button>
          </div>
        </div>
      </div>

      {/* Live mini-preview */}
      <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Preview</div>
        <div style={{borderRadius:8,background:nav.bgColor||"#fff",border:`1px solid ${nav.borderColor||C.border}`,
          boxShadow:nav.shadow!==false?"0 1px 4px rgba(0,0,0,.08)":"none",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:`0 16px`,height:Math.min(Math.max(headerH,36),56),overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {nav.logoUrl
              ? <img src={nav.logoUrl} alt="" style={{height:Math.min(logoH,32),maxWidth:Math.min(nav.logoMaxWidth||140,80),objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>
              : <span style={{fontSize:12,fontWeight:800,color:theme?.primaryColor||"#4361EE"}}>{nav.logoText||"Company"}</span>
            }
          </div>
          <div style={{display:"flex",gap:12}}>{links.slice(0,3).map(l=><span key={l.id} style={{fontSize:10,color:nav.textColor||"#374151",fontWeight:l.isButton?700:400,background:l.isButton?`${theme?.primaryColor||"#4361EE"}18`:"transparent",padding:l.isButton?"2px 6px":"0",borderRadius:4}}>{l.label}</span>)}</div>
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

// ─── HM Widget Configurator (for hm_portal type) ─────────────────────────────
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
        await onSaveRef.current(p);
      }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal]);

  // Force-save listener — widgets can request an immediate save
  useEffect(() => {
    const handler = async () => {
      const p = portalRef.current;
      if (p.id && !String(p.id).startsWith("new_")) {
        await onSaveRef.current(p);
      }
    };
    window.addEventListener('talentos:portal-force-save', handler);
    return () => window.removeEventListener('talentos:portal-force-save', handler);
  }, []);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Tell the copilot we're inside the portal builder
  useEffect(() => {
    const dispatch = () => window.dispatchEvent(new CustomEvent('talentos:editor-context', {
      detail: {
        type: 'portal',
        name: portal.name || 'Portal',
        portalType: portal.type || 'career_site',
        activePage: portal.pages?.[activePageIdx]?.name || 'Home',
        status: portal.status || 'draft',
      }
    }));
    dispatch();
    return () => window.dispatchEvent(new CustomEvent('talentos:editor-context', { detail: null }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal.name, portal.type, activePageIdx]);
  const [showTheme,       setShowTheme]       = useState(false);
  const [showLibrary,     setShowLibrary]     = useState(false);

  const [showDomainWizard, setShowDomainWizard] = useState(false);
  const [showBrandKit,     setShowBrandKit]     = useState(false);
  const [showPortalSettings, setShowPortalSettings] = useState(false);
  const [pageActionsFor,  setPageActionsFor]  = useState(null);
  const [isEditing, setIsEditing] = useState(true);
  const [viewportMode, setViewportMode] = useState("desktop"); // "desktop" | "mobile"
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const savedSnapshotRef = React.useRef(null);

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

  // Track dirty state
  React.useEffect(() => {
    if (!savedSnapshotRef.current) {
      savedSnapshotRef.current = JSON.stringify({name:portal.name,pages:portal.pages,theme:portal.theme,nav:portal.nav,footer:portal.footer,status:portal.status});
      return;
    }
    const current = JSON.stringify({name:portal.name,pages:portal.pages,theme:portal.theme,nav:portal.nav,footer:portal.footer,status:portal.status});
    setIsDirty(current !== savedSnapshotRef.current);
  }, [portal]);

  // Warn on browser close/reload if dirty
  React.useEffect(() => {
    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSave = async () => {
    const latest = portalRef.current;
    setSaving(true);
    await onSave(latest);
    setSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:"100vh",fontFamily:F,background:C.bg}}>
      {/* Top bar */}
      <div style={{height:48,background:C.surface,borderBottom:`1px solid ${C.border}`,zIndex:200,position:"relative",display:"flex",alignItems:"center",gap:0,flexShrink:0,padding:"0 12px"}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:6,fontFamily:F,fontSize:13}}
          onMouseEnter={e=>e.currentTarget.style.color=C.text1} onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
          <Ic n="arrowL" s={14}/> Portals
        </button>
        <div style={{width:1,height:24,background:C.border,margin:"0 12px"}}/>
        <input value={portal.name} onChange={e=>setPortal(p=>({...p,name:e.target.value}))}
          style={{border:"none",outline:"none",fontSize:14,fontWeight:700,color:C.text1,background:"transparent",fontFamily:F,minWidth:140}}/>
        {isDirty&&<span style={{width:7,height:7,borderRadius:"50%",background:"#F59E0B",flexShrink:0,marginLeft:-4}} title="Unsaved changes"/>}
        <div style={{flex:1}}/>
        {/* Page tabs — draggable to reorder */}
        <div style={{display:"flex",gap:2,background:C.surface2,borderRadius:8,padding:3,border:`1px solid ${C.border}`,maxWidth:280,overflowX:"auto",flexShrink:0}}>
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
            style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,
              border:`1px solid ${C.border}`,background:isEditing?C.accentLight:"transparent",color:isEditing?C.accent:C.text2}}>
            <Ic n="eye" s={12} c={isEditing?C.accent:C.text2}/>{isEditing?"Editing":"Preview"}
          </button>
          {/* More menu — Brand, Domain, Settings */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowMoreMenu(m=>!m)}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 9px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,border:`1px solid ${C.border}`,background:showMoreMenu?C.accentLight:"transparent",color:showMoreMenu?C.accent:C.text2}}>
              <Ic n="more" s={13} c={showMoreMenu?C.accent:C.text2}/>
            </button>
            {showMoreMenu&&<>
              <div onClick={()=>setShowMoreMenu(false)} style={{position:"fixed",inset:0,zIndex:699}}/>
              <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:C.surface,borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,.15)",border:`1px solid ${C.border}`,zIndex:700,minWidth:160,padding:4}}>
                {[
                  {icon:"sparkles",label:"Brand Kit",onClick:()=>{setShowBrandKit(true);setShowMoreMenu(false);}},
                  {icon:"externalLink",label:"Domain",onClick:()=>{setShowDomainWizard(true);setShowMoreMenu(false);}},
                  {icon:"settings",label:"Settings",onClick:()=>{setShowPortalSettings(s=>!s);setShowTheme(false);setShowMoreMenu(false);}},
                ].map(item=>(
                  <button key={item.label} onClick={item.onClick}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:7,border:"none",background:"transparent",cursor:"pointer",fontFamily:F,fontSize:12,fontWeight:500,color:C.text1,textAlign:"left"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.surface2;}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                    <Ic n={item.icon} s={13} c={C.text2}/>{item.label}
                  </button>
                ))}
              </div>
            </>}
          </div>
          
          
          <button onClick={()=>{setShowTheme(s=>!s);}}
            style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,
              border:`1px solid ${C.border}`,background:showTheme?C.accentLight:"transparent",color:showTheme?C.accent:C.text2}}>
            <Ic n="palette" s={12} c={showTheme?C.accent:C.text2}/>Theme
          </button>
          <Btn v="secondary" s="sm" icon="library" onClick={()=>setShowLibrary(true)}>Sections</Btn>
          <Btn v="primary" s="sm" onClick={handleSave} disabled={saving}>{saving?"Saving…":isDirty?"Save":"Saved ✓"}</Btn>
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
            }} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 9px",borderRadius:7,cursor:"pointer",fontFamily:F,fontSize:11,fontWeight:600,border:`1px solid ${C.green}`,background:C.greenLight,color:C.green}}>
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
      {showPortalSettings&&<PortalSettingsDrawer portal={portal} onChange={updated=>setPortal(updated)} onClose={()=>setShowPortalSettings(false)} api={api}/>}
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

// ─── Mini Preview ─────────────────────────────────────────────────────────────
const PRESET_FRACS = { "1":[1], "2":[1,1], "3":[1,1,1], "1-2":[1,2], "2-1":[2,1] };

const MiniPreview = ({ portal, onClick }) => {
  const t = portal.theme || defaultTheme();
  const pages = portal.pages || [];
  const page = pages[0];
  const rows = page?.rows || [];
  const nav = portal.nav || {};
  const footer = portal.footer || {};

  const navBg = nav.bgColor || t.bgColor || "#FFFFFF";
  const navFg = nav.textColor || t.textColor || "#0F1729";
  const pr = t.primaryColor || "#4361EE";
  const ff = t.fontFamily || F;
  const ftBg = footer.bgColor || "#0F1729";
  const ftFg = footer.textColor || "#F1F5F9";

  // Scale: render at 1200px wide, fit into card width (~320px → scale ~0.25)
  const renderW = 1200;
  const cardH = 200;
  const scale = 0.27;

  return (
    <div onClick={onClick} style={{
      cursor:"pointer", borderRadius:"10px 10px 0 0", overflow:"hidden",
      height: cardH, position:"relative", background:"#F3F4F8",
    }}>
      {/* Browser chrome */}
      <div style={{height:20,background:"#E8ECF2",display:"flex",alignItems:"center",padding:"0 10px",gap:4,zIndex:2,position:"relative"}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#FC5C5C"}}/>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#FCBB40"}}/>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#34C749"}}/>
        <div style={{flex:1,marginLeft:8}}>
          <div style={{background:"#FFFFFF",borderRadius:4,height:12,maxWidth:140,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid #E5E7EB"}}>
            <span style={{fontSize:7,color:"#9CA3AF",letterSpacing:".3px"}}>{portal.slug||"yoursite.com"}</span>
          </div>
        </div>
      </div>

      {/* Scaled portal render */}
      <div style={{
        width: renderW, transformOrigin:"top left", transform:`scale(${scale})`,
        position:"relative", background: t.bgColor||"#FFFFFF",
      }}>
        {/* ── Nav bar ── */}
        <div style={{
          background:navBg, borderBottom:`1px solid ${pr}18`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 48px", height:64, fontFamily:ff,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {nav.logoUrl
              ? <img src={nav.logoUrl} alt="" style={{height:nav.logoHeight||32,maxWidth:nav.logoMaxWidth||140,objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>
              : <span style={{fontSize:20,fontWeight:800,color:pr,fontFamily:ff}}>{nav.logoText||portal.name||"Your Company"}</span>
            }
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {(nav.links||[]).map(lnk=>(
              <span key={lnk.id} style={{padding:"6px 14px",borderRadius:8,fontSize:14,fontWeight:500,color:navFg,fontFamily:ff}}>{lnk.label}</span>
            ))}
            {(nav.links||[]).length===0 && <>
              <span style={{padding:"6px 14px",fontSize:14,color:navFg+"90",fontFamily:ff}}>Careers</span>
              <span style={{padding:"6px 14px",fontSize:14,color:navFg+"90",fontFamily:ff}}>About</span>
              <span style={{padding:"6px 14px",fontSize:14,color:navFg+"90",fontFamily:ff}}>Contact</span>
            </>}
          </div>
        </div>

        {/* ── Page rows ── */}
        {rows.map(row => {
          const fracs = PRESET_FRACS[row.preset] || [1];
          const totalFrac = fracs.reduce((a,b)=>a+b,0);
          const cells = row.cells || [];
          const padObj = PADDING_OPTS.find(p=>p.value===(row.padding||"md"));
          const py = padObj?.py || "56px";

          return (
            <div key={row.id} style={{
              background: row.bgColor || "transparent",
              backgroundImage: row.bgImage ? `url(${row.bgImage})` : "none",
              backgroundSize:"cover", backgroundPosition:"center",
              position:"relative",
            }}>
              {row.bgImage && (row.overlayOpacity||0)>0 && (
                <div style={{position:"absolute",inset:0,background:`rgba(0,0,0,${(row.overlayOpacity||0)/100})`}}/>
              )}
              <div style={{
                maxWidth: t.maxWidth||"1200px", margin:"0 auto",
                padding:`${py} 40px`,
                display:"flex", gap:24, position:"relative", zIndex:1,
              }}>
                {fracs.map((fr,i) => {
                  const cell = cells[i];
                  if (!cell || !cell.widgetType) return (
                    <div key={i} style={{flex:fr,minHeight:40}}/>
                  );
                  return (
                    <div key={i} style={{flex:fr, minWidth:0}}>
                      <WidgetPreview cell={cell} theme={t}/>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {rows.length===0 && (
          <div style={{padding:"80px 40px",textAlign:"center"}}>
            <div style={{fontSize:18,color:"#D1D5DB"}}>Empty page — click to start building</div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{
          background:ftBg, padding:"40px 48px 32px",
          fontFamily:ff, color:ftFg,
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:40}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>{footer.companyName||nav.logoText||portal.name||"Company"}</div>
              <div style={{fontSize:12,opacity:.6,maxWidth:280}}>{footer.tagline||"Building the future of work."}</div>
            </div>
            <div style={{display:"flex",gap:24}}>
              <span style={{fontSize:12,opacity:.6}}>Privacy</span>
              <span style={{fontSize:12,opacity:.6}}>Terms</span>
              <span style={{fontSize:12,opacity:.6}}>Contact</span>
            </div>
          </div>
          <div style={{marginTop:24,paddingTop:16,borderTop:`1px solid ${ftFg}20`,fontSize:11,opacity:.4}}>
            © {new Date().getFullYear()} {footer.companyName||nav.logoText||portal.name||"Company"}. All rights reserved.
          </div>
        </div>
      </div>

      {/* Status badge overlay */}
      <div style={{position:"absolute",top:24,right:8,zIndex:3}}>
        <span style={{fontSize:8,fontWeight:700,padding:"2px 7px",borderRadius:99,
          background:portal.status==="published"?"#ECFDF5":"#FFFBEB",
          color:portal.status==="published"?"#0CAF77":"#F79009",
          border:`1px solid ${portal.status==="published"?"#0CAF7730":"#F7900930"}`,
          boxShadow:"0 1px 4px rgba(0,0,0,.1)",
        }}>
          {portal.status==="published"?"LIVE":"DRAFT"}
        </span>
      </div>

      {/* Page count */}
      {pages.length > 1 && (
        <div style={{position:"absolute",bottom:6,right:8,zIndex:3}}>
          <span style={{fontSize:7,fontWeight:600,color:"#6B7280",background:"rgba(255,255,255,.9)",padding:"2px 6px",borderRadius:4,boxShadow:"0 1px 3px rgba(0,0,0,.08)"}}>
            {pages.length} pages
          </span>
        </div>
      )}

      {/* Fade to white at bottom */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:40,
        background:"linear-gradient(transparent, rgba(255,255,255,.95))",zIndex:2,pointerEvents:"none"}}/>
    </div>
  );
};

// ─── Portal Card ──────────────────────────────────────────────────────────────
const PortalCard = ({ portal, onEdit, onDelete, onDuplicate, stats, onLinks, onABTest }) => {
  const t = portal.theme||defaultTheme();
  const pageCount = (portal.pages||[]).length||1;
  const widgetCount = (portal.pages||[]).reduce((a,pg)=>(pg.rows||[]).reduce((b,r)=>b+(r.cells||[]).filter(c=>c.widgetType).length,a),0);

  return (
    <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",transition:"all .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.08)";e.currentTarget.style.borderColor=C.border2;}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.border;}}>
      {/* Mini Preview */}
      <MiniPreview portal={portal} onClick={onEdit}/>
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
          {portal.status==="published" && (
            <button onClick={onLinks} title="Campaign Links"
              style={{background:"#EEF0FF",border:"1px solid #4361EE30",borderRadius:6,cursor:"pointer",padding:"4px 8px",color:"#4361EE",fontSize:10,fontWeight:700,fontFamily:F,display:"flex",alignItems:"center",gap:4}}>
              Links
            </button>
          )}
          {portal.status==="published" && (
            <button onClick={onABTest} title="A/B Test Results"
              style={{background:"#F3F0FF",border:"1px solid #7048e830",borderRadius:6,cursor:"pointer",padding:"4px 8px",color:"#7048e8",fontSize:10,fontWeight:700,fontFamily:F}}>
              A/B
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
export default function PortalsPage({ environment, onFullScreen }) {
  const [portals, setPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [analytics,setAnalytics]=useState({});
  const [linksPortal,setLinksPortal]=useState(null);
  const [abPortal,setAbPortal]=useState(null);
  const loadStats=useCallback(async(list)=>{if(!list?.length)return;const res=await Promise.all(list.map(p=>api.get('/portal-analytics/'+p.id+'/stats?days=30').catch(()=>null)));const m={};list.forEach((p,i)=>{if(res[i])m[p.id]=res[i];});setAnalytics(m);},[]);
  const [newName, setNewName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null); // null = blank
  const [templatePickerType, setTemplatePickerType] = useState(null); // portal type for rich template picker

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    const data = await api.get(`/portals?environment_id=${environment.id}`);
    const list=Array.isArray(data)?data:[];
    setPortals(list);
    setLoading(false);
    loadStats(list);
    // Auto-open portal if ?edit=<id> is in the URL (e.g. from campaign page creation)
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId) {
      const target = list.find(p => p.id === editId);
      if (target) {
        setEditing(target);
        // Clean up the URL so refreshing doesn't re-open it
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [environment?.id]);

  useEffect(()=>{ load(); },[load]);

  // Listen for copilot portal creation — reload list and open the new portal
  useEffect(() => {
    const handler = async (e) => {
      const portalId = e.detail?.portalId;
      if (!portalId || !environment?.id) return;
      // Reload list to include the newly created portal
      const data = await api.get(`/portals?environment_id=${environment.id}`);
      const list = Array.isArray(data) ? data : [];
      setPortals(list);
      loadStats(list);
      // Find and open the portal
      const portal = list.find(p => p.id === portalId);
      if (portal) {
        setEditing(portal);
        setLoading(false);
      }
    };
    window.addEventListener("talentos:open-portal", handler);
    return () => window.removeEventListener("talentos:open-portal", handler);
  }, [environment?.id, loadStats]);

  // Tell Settings to go full-width when builder is open
  useEffect(() => {
    if (onFullScreen) onFullScreen(!!editing);
  }, [editing, onFullScreen]);

  if (editing) {
    return (
      <PortalBuilder
        portal={editing}
        onClose={()=>{ setEditing(null); load(); }}
        onSave={async (updated) => {
          if (updated.id&&!String(updated.id).startsWith("new_")) {
            await api.patch(`/portals/${updated.id}`, updated);
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
    // If a portal type is selected (not blank), show the rich template picker instead
    if (selectedTemplate) {
      setTemplatePickerType(selectedTemplate);
      setCreating(false);
      return;
    }
    // Blank canvas — create immediately
    const p = {
      name: newName.trim(),
      slug: `/${newName.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
      environment_id: environment.id,
      status: "draft",
      theme: defaultTheme(),
      pages: [defaultPage()],
    };
    const created = await api.post("/portals", p);
    setNewName(""); setCreating(false); setSelectedTemplate(null);
    setEditing(created);
  };

  const handleApplyRichTemplate = async (richTemplate) => {
    const applied = applyTemplate(richTemplate, uid);
    const name = newName.trim() || richTemplate.name + ' Portal';
    const p = {
      name,
      slug: `/${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
      environment_id: environment.id,
      status: "draft",
      type: templatePickerType,
      theme: applied.theme,
      nav: applied.nav,
      footer: applied.footer,
      pages: applied.pages,
    };
    const created = await api.post("/portals", p);
    setNewName(""); setTemplatePickerType(null); setSelectedTemplate(null);
    setEditing(created);
  };

  const handleSkipTemplate = async () => {
    const name = newName.trim() || 'New Portal';
    const p = {
      name,
      slug: `/${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
      environment_id: environment.id,
      status: "draft",
      type: templatePickerType,
      theme: defaultTheme(),
      pages: [defaultPage()],
    };
    const created = await api.post("/portals", p);
    setNewName(""); setTemplatePickerType(null); setSelectedTemplate(null);
    setEditing(created);
  };

  const handleDelete = async (id) => {
    if (!(await window.__confirm({ title:'Delete this portal?', danger:true }))) return;
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

      {linksPortal && <CampaignLinksModal environment={environment} portalId={linksPortal.id} onClose={()=>setLinksPortal(null)}/>}
      {abPortal && <ABTestModal portalId={abPortal.id} links={[]} onClose={()=>setAbPortal(null)}/>}

      {creating&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
          onClick={e=>e.target===e.currentTarget&&(setCreating(false),setSelectedTemplate(null),setNewName(""))}>
          <div style={{background:C.surface,borderRadius:16,width:740,maxWidth:"96vw",boxShadow:"0 24px 64px rgba(0,0,0,.2)",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"90vh"}}>
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
                    <div style={{width:36,height:36,borderRadius:8,background:`${t.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Ic n={t.icon} s={18} c={t.accent}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:selectedTemplate===t.id?t.accent:C.text1}}>{t.name}</div>
                      <div style={{fontSize:10,color:C.text3,marginTop:1,lineHeight:1.5}}>{t.desc}</div>
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
                  {selectedTemplate?"Choose Layout →":"Create blank"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rich Template Picker Overlay */}
      {templatePickerType && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,41,.5)",zIndex:1000,overflowY:"auto",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"40px 24px"}}>
          <div style={{background:C.surface,borderRadius:20,width:"100%",maxWidth:1160,boxShadow:"0 24px 80px rgba(0,0,0,.25)",overflow:"hidden",position:"relative"}}>
            <button onClick={()=>{setTemplatePickerType(null);setCreating(true);}}
              style={{position:"absolute",top:16,right:16,zIndex:10,background:"none",border:"none",cursor:"pointer",color:C.text3,padding:4}}>
              <Ic n="x" s={18}/>
            </button>
            <PortalTemplatePicker
              portalType={templatePickerType}
              onSelect={handleApplyRichTemplate}
              onSkip={handleSkipTemplate}
            />
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
              onDuplicate={()=>handleDuplicate(p)}
              onLinks={()=>setLinksPortal(p)}
              onABTest={()=>setAbPortal(p)}/>
          ))}
        </div>
      )}
    </div>
  );
}
