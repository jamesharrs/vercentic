#!/usr/bin/env node
// fix_quicklinks.js — run from ~/projects/talentos
// node fix_quicklinks.js

const fs = require('fs');

function fixFile(filePath, links) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${filePath} not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the broken injection (the orphaned JSX block after "return (")
  // Pattern: the broken block starts with a newline + comment + <div style quicklinks
  content = content.replace(
    /\n\s*\{\/\* Quick Links \*\/\}\s*\n\s*<div style=\{\{[^}]+display:"flex"[^}]+\}\}>[^]*?<\/div>\s*\n\s*\n/,
    '\n'
  );

  // Now find the proper injection point — inside the root JSX div, before the first real content
  // Look for the first child div after the root wrapper
  const qlBar = `
        {/* Quick Links */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24, flexWrap:"wrap", padding:"14px 18px", background:"white", borderRadius:14, border:"1px solid #f0f0f0" }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", marginRight:4 }}>Quick Links</span>
          ${links.map(l => `<button onClick={()=>{${l.nav}}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid "+\`${l.color}30\`, background:\`${l.color}08\`, cursor:"pointer", fontSize:13, fontWeight:600, color:"${l.color}", fontFamily:"inherit", whiteSpace:"nowrap" }}>${l.label}</button>`).join('\n          ')}
        </div>`;

  fs.writeFileSync(filePath, content);
  console.log(`✅ Cleaned ${filePath}`);
}

// ── InterviewDashboard.jsx ────────────────────────────────────────────────────
const INTERVIEW = 'client/src/InterviewDashboard.jsx';
if (fs.existsSync(INTERVIEW)) {
  let f = fs.readFileSync(INTERVIEW, 'utf8');
  
  // Remove all broken injections - find and remove the malformed quick links block
  // The issue: it was injected after `return (` on its own line, breaking JSX
  const brokenPattern = /(\n\s*\{\/\* Quick Links \*\/\}[\s\S]*?<\/div>\s*\n)/g;
  const cleaned = f.replace(brokenPattern, '\n');
  
  if (cleaned !== f) {
    fs.writeFileSync(INTERVIEW, cleaned);
    console.log('✅ Removed broken quick links from InterviewDashboard.jsx');
  }
  
  // Re-read and find the right injection point
  let f2 = fs.readFileSync(INTERVIEW, 'utf8');
  
  if (!f2.includes('Quick Links')) {
    // Find the return statement's first child element to inject before it
    // Look for the outermost wrapper div and inject after its opening tag
    // Common patterns: <div style={{ fontFamily, <div className=
    const patterns = [
      /(<div style=\{\{[^}]*fontFamily[^}]*\}}>\s*\n)/,
      /(<div style=\{\{[^}]*width:"100%"[^}]*\}}>\s*\n)/,
      /(return \(\s*\n\s*<div[^>]*>\s*\n)/,
    ];
    
    let injected = false;
    for (const pat of patterns) {
      const m = f2.match(pat);
      if (m) {
        const ql = `${m[1]}
        {/* Quick Links */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24, flexWrap:"wrap", padding:"14px 18px", background:"white", borderRadius:14, border:"1px solid #f0f0f0" }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", marginRight:4 }}>Quick Links</span>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"interviews"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #4361ee30", background:"#4361ee08", cursor:"pointer", fontSize:13, fontWeight:600, color:"#4361ee", fontFamily:"inherit", whiteSpace:"nowrap" }}>All Interviews</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:openCopilot",{detail:{message:"schedule an interview"}}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #0ca67830", background:"#0ca67808", cursor:"pointer", fontSize:13, fontWeight:600, color:"#0ca678", fontFamily:"inherit", whiteSpace:"nowrap" }}>Schedule Interview</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"people"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #7c3aed30", background:"#7c3aed08", cursor:"pointer", fontSize:13, fontWeight:600, color:"#7c3aed", fontFamily:"inherit", whiteSpace:"nowrap" }}>Candidates</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"jobs"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #3b82f630", background:"#3b82f608", cursor:"pointer", fontSize:13, fontWeight:600, color:"#3b82f6", fontFamily:"inherit", whiteSpace:"nowrap" }}>Open Jobs</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"screening"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #f59f0030", background:"#f59f0008", cursor:"pointer", fontSize:13, fontWeight:600, color:"#f59f00", fontFamily:"inherit", whiteSpace:"nowrap" }}>Screening</button>
        </div>
`;
        f2 = f2.replace(m[0], ql);
        fs.writeFileSync(INTERVIEW, f2);
        console.log('✅ Injected quick links into InterviewDashboard.jsx');
        injected = true;
        break;
      }
    }
    if (!injected) {
      console.log('⚠️  Could not find injection point in InterviewDashboard.jsx — add quick links manually');
    }
  } else {
    console.log('⏭  InterviewDashboard.jsx already has quick links');
  }
}

// ── OfferDashboard.jsx ────────────────────────────────────────────────────────
const OFFER = 'client/src/OfferDashboard.jsx';
if (fs.existsSync(OFFER)) {
  let f = fs.readFileSync(OFFER, 'utf8');
  
  // Remove broken injection
  const brokenPattern = /(\n\s*\{\/\* Quick Links \*\/\}[\s\S]*?<\/div>\s*\n)/g;
  const cleaned = f.replace(brokenPattern, '\n');
  if (cleaned !== f) {
    fs.writeFileSync(OFFER, cleaned);
    console.log('✅ Removed broken quick links from OfferDashboard.jsx');
  }
  
  let f2 = fs.readFileSync(OFFER, 'utf8');
  
  if (!f2.includes('Quick Links')) {
    const patterns = [
      /(<div style=\{\{[^}]*fontFamily[^}]*\}}>\s*\n)/,
      /(<div style=\{\{[^}]*width:"100%"[^}]*\}}>\s*\n)/,
      /(return \(\s*\n\s*<div[^>]*>\s*\n)/,
    ];
    
    let injected = false;
    for (const pat of patterns) {
      const m = f2.match(pat);
      if (m) {
        const ql = `${m[1]}
        {/* Quick Links */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24, flexWrap:"wrap", padding:"14px 18px", background:"white", borderRadius:14, border:"1px solid #f0f0f0" }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", marginRight:4 }}>Quick Links</span>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"offers"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #0ca67830", background:"#0ca67808", cursor:"pointer", fontSize:13, fontWeight:600, color:"#0ca678", fontFamily:"inherit", whiteSpace:"nowrap" }}>All Offers</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:openCopilot",{detail:{message:"create a new offer"}}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #4361ee30", background:"#4361ee08", cursor:"pointer", fontSize:13, fontWeight:600, color:"#4361ee", fontFamily:"inherit", whiteSpace:"nowrap" }}>New Offer</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"people"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #7c3aed30", background:"#7c3aed08", cursor:"pointer", fontSize:13, fontWeight:600, color:"#7c3aed", fontFamily:"inherit", whiteSpace:"nowrap" }}>Candidates</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"screening"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #f59f0030", background:"#f59f0008", cursor:"pointer", fontSize:13, fontWeight:600, color:"#f59f00", fontFamily:"inherit", whiteSpace:"nowrap" }}>Screening</button>
          <button onClick={()=>{window.dispatchEvent(new CustomEvent("talentos:nav",{detail:"onboarding"}))}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:"1.5px solid #0d948830", background:"#0d948808", cursor:"pointer", fontSize:13, fontWeight:600, color:"#0d9488", fontFamily:"inherit", whiteSpace:"nowrap" }}>Onboarding</button>
        </div>
`;
        f2 = f2.replace(m[0], ql);
        fs.writeFileSync(OFFER, f2);
        console.log('✅ Injected quick links into OfferDashboard.jsx');
        injected = true;
        break;
      }
    }
    if (!injected) {
      console.log('⚠️  Could not find injection point in OfferDashboard.jsx — add quick links manually');
    }
  } else {
    console.log('⏭  OfferDashboard.jsx already has quick links');
  }
}

// ── Verify build will succeed ────────────────────────────────────────────────
console.log('\n🔍 Verifying JSX structure...');
['client/src/InterviewDashboard.jsx', 'client/src/OfferDashboard.jsx'].forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  // Check for the broken pattern: return ( \n <QuickLinks div
  const broken = content.match(/return \(\s*\n\s*\{\/\* Quick Links/);
  if (broken) {
    console.log(`❌ ${f} still has broken injection — needs manual fix`);
  } else {
    console.log(`✅ ${f} looks clean`);
  }
});

console.log('\n🚀 Now run:');
console.log('   git add -A && git commit -m "fix: quick links injection in interview/offer dashboards"');
console.log('   git push origin main');
console.log('   cd client && vercel --prod --yes');
