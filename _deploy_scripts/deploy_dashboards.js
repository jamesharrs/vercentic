#!/usr/bin/env node
// deploy_dashboards.js — run from ~/projects/talentos
// node deploy_dashboards.js

const fs = require('fs');
const path = require('path');

const APP = 'client/src/App.jsx';
let app = fs.readFileSync(APP, 'utf8');
let changed = false;

// ── 1. Add lazy imports for new dashboards ──────────────────────────────────
if (!app.includes('ScreeningDashboard')) {
  app = app.replace(
    `const AdminDashboard     = lazy(() => import("./AdminDashboard.jsx"));`,
    `const AdminDashboard     = lazy(() => import("./AdminDashboard.jsx"));
const ScreeningDashboard  = lazy(() => import("./ScreeningDashboard.jsx"));
const OnboardingDashboard = lazy(() => import("./OnboardingDashboard.jsx"));`
  );
  console.log('✅ Added lazy imports');
  changed = true;
} else { console.log('⏭  Imports already present'); }

// ── 2. Update the OVERVIEW nav section ──────────────────────────────────────
// Remove dashboard from nav, add screening + onboarding
const oldOverviewItems = `        { id: "dashboard",   icon: "home",    label: t("nav.dashboard") },
        { id: "inbox",       icon: "inbox",   label: "Inbox", badge: inboxUnread || null },
        { id: "admin_stats", icon: "shield",  label: "Admin Stats" },`;

const newOverviewItems = `        { id: "inbox",        icon: "inbox",     label: "Inbox",       badge: inboxUnread || null },
        { id: "screening",    icon: "eye",       label: "Screening" },
        { id: "onboarding",   icon: "star",      label: "Onboarding" },
        { id: "admin_stats",  icon: "shield",    label: "Admin Stats" },`;

if (app.includes(oldOverviewItems)) {
  app = app.replace(oldOverviewItems, newOverviewItems);
  console.log('✅ Updated OVERVIEW nav items');
  changed = true;
} else { console.log('⚠️  OVERVIEW nav items not matched — check manually'); }

// ── 3. Add "eye" and "star" icon paths ──────────────────────────────────────
if (!app.includes('"eye"')) {
  app = app.replace(
    `"shield": "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",`,
    `"shield": "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    "eye":    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    "star":   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",`
  );
  console.log('✅ Added eye + star icon paths');
  changed = true;
} else { console.log('⏭  Icon paths already present'); }

// ── 4. Make logo click go to dashboard ──────────────────────────────────────
// Find the logo div and make it navigate to dashboard
if (!app.includes('logoClickNav') && !app.includes('switchNav("dashboard")')) {
  // Find logo div — look for the Vercentic/TalentOS logo text
  const logoPatterns = [
    'onClick={() => switchNav("dashboard")}',
    'style={{ cursor:"pointer" }} onClick={()=>switchNav("dashboard")}',
  ];
  // Add onClick to the sidebar logo area
  const oldLogo1 = `<div style={{ padding: "20px 16px 16px"`;
  const newLogo1 = `<div onClick={()=>switchNav("dashboard")} style={{ padding: "20px 16px 16px", cursor:"pointer"`;
  if (app.includes(oldLogo1) && !app.includes('cursor:"pointer"', app.indexOf(oldLogo1))) {
    app = app.replace(oldLogo1, newLogo1);
    console.log('✅ Logo now navigates to dashboard');
    changed = true;
  } else {
    // Try another common pattern
    const oldLogo2 = `style={{ padding:"20px 16px 16px"`;
    if (app.includes(oldLogo2)) {
      app = app.replace(oldLogo2, `onClick={()=>switchNav("dashboard")} style={{ padding:"20px 16px 16px", cursor:"pointer"`);
      console.log('✅ Logo now navigates to dashboard (variant 2)');
      changed = true;
    } else {
      console.log('⚠️  Logo div not matched — add onClick={()=>switchNav("dashboard")} to the sidebar logo div manually');
    }
  }
}

// ── 5. Add render cases for new dashboards ───────────────────────────────────
if (!app.includes('activeNav === "screening"')) {
  // Add before admin_stats render case
  app = app.replace(
    `) : activeNav === "admin_stats" ? (`,
    `) : activeNav === "screening" ? (
          <Suspense fallback={<div style={{padding:32,color:"#9ca3af"}}>Loading…</div>}>
            <ScreeningDashboard environment={selectedEnv} onNavigate={id=>{
              const obj=navObjects.find(o=>o.slug===id||o.plural_name?.toLowerCase()===id);
              if(obj) switchNav(\`obj_\${obj.id}\`);
              else switchNav(id);
            }}/>
          </Suspense>
        ) : activeNav === "onboarding" ? (
          <Suspense fallback={<div style={{padding:32,color:"#9ca3af"}}>Loading…</div>}>
            <OnboardingDashboard environment={selectedEnv} onNavigate={id=>{
              const obj=navObjects.find(o=>o.slug===id||o.plural_name?.toLowerCase()===id);
              if(obj) switchNav(\`obj_\${obj.id}\`);
              else switchNav(id);
            }}/>
          </Suspense>
        ) : activeNav === "admin_stats" ? (`
  );
  console.log('✅ Added screening + onboarding render cases');
  changed = true;
} else { console.log('⏭  Render cases already present'); }

// ── 6. Remove "dashboard" from nav access filter if gated ────────────────────
// Make sure screening/onboarding pass the access check
const oldAccess = `if (item.id === 'dashboard' || item.id === 'dashboard_interviews' || item.id === 'dashboard_offers')`;
const newAccess = `if (['dashboard','dashboard_interviews','dashboard_offers','screening','onboarding'].includes(item.id))`;
if (app.includes(oldAccess)) {
  app = app.replace(oldAccess, newAccess);
  console.log('✅ Updated nav access filter');
  changed = true;
}

// ── 7. Add quick links to existing interview/offer dashboards ────────────────
// Add InterviewDashboard quick links patch
const INTERVIEW_DASH = 'client/src/InterviewDashboard.jsx';
const OFFER_DASH     = 'client/src/OfferDashboard.jsx';

function addQuickLinksBar(filePath, links, afterPattern) {
  if (!fs.existsSync(filePath)) { console.log(`⚠️  ${filePath} not found`); return; }
  let f = fs.readFileSync(filePath, 'utf8');
  if (f.includes('Quick Links')) { console.log(`⏭  ${path.basename(filePath)} already has quick links`); return; }

  const qlBar = `
      {/* Quick Links */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24, flexWrap:"wrap", padding:"14px 18px", background:"white", borderRadius:14, border:"1px solid #f0f0f0" }}>
        <span style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", marginRight:4 }}>Quick Links</span>
        ${links.map(l => `<button onClick={()=>{${l.nav}}} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:9, border:\`1.5px solid ${l.color}30\`, background:\`${l.color}08\`, cursor:"pointer", fontSize:13, fontWeight:600, color:"${l.color}", fontFamily:"inherit", whiteSpace:"nowrap" }}>${l.icon?`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${l.color}" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="${l.svgPath}"/></svg> `:""}${l.label}</button>`).join('\n        ')}
      </div>`;

  if (f.includes(afterPattern)) {
    f = f.replace(afterPattern, afterPattern + '\n' + qlBar);
    fs.writeFileSync(filePath, f);
    console.log(`✅ Added quick links to ${path.basename(filePath)}`);
  } else {
    console.log(`⚠️  Pattern not found in ${path.basename(filePath)} — add quick links manually`);
  }
}

// Interview dashboard quick links
addQuickLinksBar(INTERVIEW_DASH, [
  { label:"All Interviews",    color:"#4361ee", nav:`window.dispatchEvent(new CustomEvent('talentos:nav',{detail:'interviews'}))`, svgPath:"M3 9h18M3 15h18M8 3v3M16 3v3M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" },
  { label:"Schedule Interview", color:"#0ca678", nav:`window.dispatchEvent(new CustomEvent('talentos:openCopilot',{detail:{message:'schedule an interview'}}))`, svgPath:"M12 5v14M5 12h14" },
  { label:"Candidates",         color:"#7c3aed", nav:`window.dispatchEvent(new CustomEvent('talentos:nav',{detail:'people'}))`, svgPath:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z" },
  { label:"Interview Templates", color:"#f59f00", nav:`window.dispatchEvent(new CustomEvent('talentos:nav',{detail:'interviews'}))`, svgPath:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" },
  { label:"Open Jobs",          color:"#3b82f6", nav:`window.dispatchEvent(new CustomEvent('talentos:nav',{detail:'jobs'}))`, svgPath:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" },
  { label:"Scorecards",         color:"#9ca3af", nav:`console.log('scorecards coming soon')`, svgPath:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" },
], 'return (');

// Offer dashboard quick links
addQuickLinksBar(OFFER_DASH, [
  { label:"All Offers",       color:"#0ca678", nav:`window.dispatchEvent(new CustomEvent('talentos:nav',{detail:'offers'}))`, svgPath:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" },
  { label:"New Offer",        color:"#4361ee", nav:`window.dispatchEvent(new CustomEvent('talentos:openCopilot',{detail:{message:'create a new offer'}}))`, svgPath:"M12 5v14M5 12h14" },
  { label:"Pending Approval", color:"#f59f00", nav:`window.dispatchEvent(new CustomEvent('talentos:nav',{detail:'offers'}))`, svgPath:"M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v5l3 3" },
  { label:"Candidates",       color:"#7c3aed", nav:`window.dispatchEvent(new CustomEvent('talentos:nav',{detail:'people'}))`, svgPath:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z" },
  { label:"Onboarding",       color:"#0d9488", nav:`window.dispatchEvent(new CustomEvent('talentos:nav',{detail:'onboarding'}))`, svgPath:"M20 6L9 17l-5-5" },
], 'return (');

// ── Save App.jsx ──────────────────────────────────────────────────────────────
if (changed) {
  fs.writeFileSync(APP, app);
  console.log('\n✅ App.jsx saved');
} else {
  console.log('\nℹ️  No changes needed to App.jsx');
}

console.log('\n📋 Manual step — copy new component files:');
console.log('   cp ScreeningDashboard.jsx client/src/ScreeningDashboard.jsx');
console.log('   cp OnboardingDashboard.jsx client/src/OnboardingDashboard.jsx');
console.log('\n🚀 Then run:');
console.log('   git add -A && git commit -m "feat: screening + onboarding dashboards, logo nav, quick links" && git push origin main');
console.log('   cd client && vercel --prod --yes');
