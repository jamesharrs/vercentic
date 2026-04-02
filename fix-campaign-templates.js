/**
 * fix-campaign-templates.js
 * Run from project root: node fix-campaign-templates.js
 */
const fs = require('fs');
const path = require('path');

const PORTALS = path.join(__dirname, 'client/src/Portals.jsx');
const TEMPLATES_FILE = path.join(__dirname, 'client/src/portalTemplates.js');

// ── 1. Fix Portals.jsx ────────────────────────────────────────────────────────
let portals = fs.readFileSync(PORTALS, 'utf8');

// Remove the wrongly-placed campaign entries from the PORTAL_TYPES array
// They start at "  // ── CAMPAIGN PAGES" and end before the closing ]; of the types array
// Strategy: find the campaign comment block and remove through to the closing of the array section

const campaignBlockStart = portals.indexOf('  // ── CAMPAIGN PAGES ──');
if (campaignBlockStart !== -1) {
  // Find the closing ]; of the entire PORTAL_TYPES/TEMPLATES array that contains it
  // We need to find where the types array ends - it ends with "];" followed by const/function
  // The campaign block is at the end of the array, so find the ]; after the last campaign template
  
  // Find the end of the last campaign template object  
  // Look for the ]; that closes the array after the campaign block
  let arrayEnd = portals.indexOf('\n];', campaignBlockStart);
  if (arrayEnd === -1) arrayEnd = portals.indexOf('\n];\n', campaignBlockStart);
  
  if (arrayEnd !== -1) {
    // Remove from campaign comment to just before the ]; 
    portals = portals.slice(0, campaignBlockStart) + portals.slice(arrayEnd);
    console.log('✓ Removed campaign entries from PORTAL_TYPES array');
  } else {
    console.log('⚠ Could not find array end - skipping removal');
  }
}

// Add "Campaign Page" as a portal type entry (simple entry, no pages)
const lastTypeEntry = `  { id:"agency_portal", name:"Agency Portal", desc:"Let agencies submit candidates against open roles", icon:"", accent:"#D97706", tags:["Agency","Submit"],
    theme:{ primaryColor:"#D97706",secondaryColor:"#B45309",bgColor:"#FFFBEB",textColor:"#1C1917",fontFamily:"'Raleway', sans-serif",buttonStyle:"outline",buttonRadius:"8px",maxWidth:"1100px" }, pages:[] },`;

const campaignTypeEntry = `  { id:"campaign", name:"Campaign Page", desc:"Targeted landing pages for specific roles, graduate programmes and talent communities", icon:"", accent:"#7C3AED", tags:["Campaign","Targeted","Community"],
    theme:{ primaryColor:"#7C3AED",secondaryColor:"#5B21B6",bgColor:"#FAFAFA",textColor:"#0F1729",fontFamily:"'Space Grotesk', sans-serif",buttonStyle:"filled",buttonRadius:"12px",maxWidth:"1100px" }, pages:[] },`;

if (!portals.includes('id:"campaign"') && !portals.includes("id:'campaign'")) {
  portals = portals.replace(lastTypeEntry, lastTypeEntry + '\n' + campaignTypeEntry);
  console.log('✓ Added campaign portal type to PORTAL_TYPES');
} else {
  console.log('✓ Campaign type already in PORTAL_TYPES');
}

fs.writeFileSync(PORTALS, portals);

// ── 2. Add campaign templates to portalTemplates.js ───────────────────────────
let tmpl = fs.readFileSync(TEMPLATES_FILE, 'utf8');

if (tmpl.includes("type: 'campaign'") || tmpl.includes('type:"campaign"')) {
  console.log('✓ Campaign templates already in portalTemplates.js');
} else {
  const campaignTemplates = `

// ── CAMPAIGN PAGE TEMPLATES ───────────────────────────────────────────────────
{
  id: 'campaign_1',
  type: 'campaign',
  name: 'Role Campaign',
  desc: 'High-impact single-page campaign for a specific role or hiring surge',
  accent: '#7C3AED',
  tags: ['Campaign', 'Role', 'Targeted'],
  theme: {
    primaryColor:'#7C3AED', secondaryColor:'#5B21B6',
    bgColor:'#0F0A1E', textColor:'#F9FAFB', accentColor:'#F59E0B',
    fontFamily:"'Space Grotesk', sans-serif", headingFont:"'Space Grotesk', sans-serif",
    fontSize:'16px', headingWeight:'800',
    borderRadius:'12px', buttonStyle:'filled', buttonRadius:'12px', maxWidth:'1100px',
  },
  pages: [
    { id:uid(), name:'Home', slug:'/', rows:[
      { id:uid(), preset:'1',
        bgImage:'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=80',
        bgColor:'', overlayOpacity:60, padding:'xl',
        cells:[{ id:uid(), widgetType:'hero', widgetConfig:{
          headline:"We're Hiring 50 Engineers.",
          subheading:'Join a team building the future of intelligent software. Remote-first, world-class benefits, and work that actually matters.',
          ctaText:'Apply Now', align:'left',
        }}]},
      { id:uid(), preset:'4', bgColor:'#7C3AED', bgImage:'', overlayOpacity:0, padding:'sm',
        cells:[{ id:uid(), widgetType:'stats', widgetConfig:{ stats:[{value:'50',label:'Open Roles'},{value:'Remote',label:'Work Style'},{value:'$180k+',label:'Comp Range'},{value:'2 wks',label:'To Hire'}]}}]},
      { id:uid(), preset:'3', bgColor:'#160D2E', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Why engineers love it here', content:'No bureaucracy. No endless meetings. Just small teams with big impact, shipping software used by millions.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'The stack you will work with', content:'TypeScript, React, Node.js, PostgreSQL, and a modern AI-powered pipeline. We pick the right tool — not the trendy one.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Your first 90 days', content:'Paired with a senior engineer from day one. First PR merged in week one. Running your first release in month two.' }},
        ]},
      { id:uid(), preset:'1', bgColor:'', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'image', widgetConfig:{ url:'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80', alt:'Engineering team', borderRadius:'16px' }}]},
      { id:uid(), preset:'1', bgColor:'#0F0A1E', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'jobs', widgetConfig:{ heading:'Open Engineering Roles' }}]},
      { id:uid(), preset:'3', bgColor:'#160D2E', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Compensation', content:'Base $120-$180k · Equity · Annual performance bonus · Salary reviewed every 6 months.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Remote-first', content:'Work from anywhere. We have hubs in Dubai, London and NYC for those who want them.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Growth', content:'Learning budget $3k/yr · Conference sponsorship · Internal mobility encouraged.' }},
        ]},
      { id:uid(), preset:'1', bgColor:'#0F0A1E', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'accordion', widgetConfig:{ heading:'Frequently Asked Questions', items:[
          { q:'What does the interview process look like?', a:'A 30-min intro call, a take-home task (max 3 hours), and a final loop with the team. Total time: under 2 weeks.' },
          { q:'Do I need to relocate?', a:'No. We are fully remote-first. Our hubs are optional.' },
          { q:'What level of experience are you looking for?', a:'We have roles for mid-level through staff engineer. Each listing specifies the level.' },
        ]}}]},
      { id:uid(), preset:'1',
        bgImage:'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1400&q=80',
        bgColor:'', overlayOpacity:70, padding:'xl',
        cells:[{ id:uid(), widgetType:'hero', widgetConfig:{ headline:'Ready to build something great?', subheading:'Applications reviewed within 48 hours. We always respond either way.', ctaText:'Apply Now', align:'center' }}]},
    ]},
  ],
},

{
  id: 'campaign_2',
  type: 'campaign',
  name: 'Early Careers',
  desc: 'Graduate programmes, internships and entry-level recruitment campaigns',
  accent: '#059669',
  tags: ['Graduate', 'Internship', 'Early Careers'],
  theme: {
    primaryColor:'#059669', secondaryColor:'#0D9488',
    bgColor:'#ECFDF5', textColor:'#064E3B', accentColor:'#7C3AED',
    fontFamily:"'Plus Jakarta Sans', sans-serif", headingFont:"'Plus Jakarta Sans', sans-serif",
    fontSize:'16px', headingWeight:'800',
    borderRadius:'16px', buttonStyle:'filled', buttonRadius:'999px', maxWidth:'1060px',
  },
  pages: [
    { id:uid(), name:'Home', slug:'/', rows:[
      { id:uid(), preset:'2', bgColor:'#064E3B', bgImage:'', overlayOpacity:0, padding:'xl',
        cells:[
          { id:uid(), widgetType:'hero', widgetConfig:{ headline:'Start your career where it counts.', subheading:'Our Graduate Programme is designed to turn ambitious graduates into confident professionals — fast. 12 months, real responsibility, mentorship from day one.', ctaText:'Apply for 2026 Cohort', align:'left' }},
          { id:uid(), widgetType:'image', widgetConfig:{ url:'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80', alt:'Young professionals collaborating', borderRadius:'20px' }},
        ]},
      { id:uid(), preset:'4', bgColor:'#059669', bgImage:'', overlayOpacity:0, padding:'md',
        cells:[{ id:uid(), widgetType:'stats', widgetConfig:{ stats:[{value:'12 months',label:'Programme Length'},{value:'4',label:'Rotations'},{value:'92%',label:'Permanent Hire Rate'},{value:'250+',label:'Alumni Network'}]}}]},
      { id:uid(), preset:'1', bgColor:'#F0FDF4', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'text', widgetConfig:{ heading:'The journey', content:'Month 1-3: Foundation — orientation, training, and your first rotation.\nMonth 4-6: Explore — second rotation across a different business area.\nMonth 7-9: Deliver — a live project with real ownership.\nMonth 10-12: Lead — present to leadership, secure your permanent offer.' }}]},
      { id:uid(), preset:'2', bgColor:'', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'image', widgetConfig:{ url:'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80', alt:'Graduate cohort', borderRadius:'16px' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Who we are looking for', content:'Any degree, any classification. We care about how you think.\n\n✓ Final-year students or recent graduates\n✓ Strong communication skills\n✓ Comfortable with ambiguity\n✓ Passion for the industry' }},
        ]},
      { id:uid(), preset:'3', bgColor:'#ECFDF5', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'"I had real ownership from month one."', content:'— Sarah K., 2024 cohort, now Product Manager\n\nThe programme threw me in at the deep end in the best possible way. My manager trusted me to lead a client project in my second rotation.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'"Best career decision I ever made."', content:'— Marcus T., 2023 cohort, now Senior Analyst\n\nI applied thinking I might get a foot in the door. What I got was a proper career. Two years on I am managing a team of four.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'"They invest in you like they mean it."', content:'— Priya M., 2024 cohort, now UX Designer\n\nConferences, coaching, a learning budget — they do not just say they invest in people. I went to three conferences in my first year alone.' }},
        ]},
      { id:uid(), preset:'1', bgColor:'#F0FDF4', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'accordion', widgetConfig:{ heading:'Your questions answered', items:[
          { q:'When does the 2026 cohort start?', a:'September 2026. Applications close 31 May 2026. We review on a rolling basis — apply early.' },
          { q:'What degree do I need?', a:'Any degree, any classification. We care far more about how you think than what you studied.' },
          { q:'Is the programme paid?', a:'Yes. Competitive graduate salary with full benefits from day one.' },
          { q:'What happens after the programme?', a:'92% of graduates receive a permanent offer based on rotations and preference.' },
        ]}}]},
      { id:uid(), preset:'1',
        bgImage:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=80',
        bgColor:'', overlayOpacity:65, padding:'xl',
        cells:[{ id:uid(), widgetType:'hero', widgetConfig:{ headline:'Applications now open for 2026.', subheading:'Cohort sizes are limited. Do not leave it to the last minute.', ctaText:'Apply Now — Takes 15 mins', align:'center' }}]},
    ]},
    { id:uid(), name:'Apply', slug:'/apply', rows:[
      { id:uid(), preset:'1', bgColor:'', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'form', widgetConfig:{ title:'Graduate Programme Application 2026', description:'Tell us about yourself. We read every application.' }}]},
    ]},
  ],
},

{
  id: 'campaign_3',
  type: 'campaign',
  name: 'Talent Community',
  desc: 'Alumni networks, talent pools and stay-in-touch communities for future hiring',
  accent: '#0EA5E9',
  tags: ['Alumni', 'Community', 'Talent Pool'],
  theme: {
    primaryColor:'#0EA5E9', secondaryColor:'#0284C7',
    bgColor:'#F0F9FF', textColor:'#0C4A6E', accentColor:'#F59E0B',
    fontFamily:"'DM Sans', sans-serif", headingFont:"'DM Sans', sans-serif",
    fontSize:'16px', headingWeight:'700',
    borderRadius:'10px', buttonStyle:'filled', buttonRadius:'10px', maxWidth:'1100px',
  },
  pages: [
    { id:uid(), name:'Home', slug:'/', rows:[
      { id:uid(), preset:'1',
        bgImage:'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1400&q=80',
        bgColor:'', overlayOpacity:55, padding:'xl',
        cells:[{ id:uid(), widgetType:'hero', widgetConfig:{ headline:'Stay connected. Get first access.', subheading:'Join our talent community and be the first to hear about new roles, events, and news. No spam — just the good stuff.', ctaText:'Join the Community', align:'center' }}]},
      { id:uid(), preset:'3', bgColor:'#E0F2FE', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Early access to roles', content:'Community members hear about new opportunities 2 weeks before public posting. Many are filled before they go live.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Events and webinars', content:'Exclusive access to networking events, industry panels, and skills workshops run by our team and senior leaders.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Direct recruiter contact', content:'A real person who knows your background. No black holes — we actually respond and keep you updated.' }},
        ]},
      { id:uid(), preset:'4', bgColor:'#0EA5E9', bgImage:'', overlayOpacity:0, padding:'md',
        cells:[{ id:uid(), widgetType:'stats', widgetConfig:{ stats:[{value:'4,200+',label:'Community Members'},{value:'68%',label:'Hired From Community'},{value:'Monthly',label:'Events'},{value:'48hrs',label:'Avg Response'}]}}]},
      { id:uid(), preset:'2', bgColor:'', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Who joins our community?', content:'Former applicants who impressed us but were not right timing.\n\nPassive candidates open to the right opportunity.\n\nPast colleagues and alumni.\n\nAnyone curious about working with us — now or in the future.' }},
          { id:uid(), widgetType:'image', widgetConfig:{ url:'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80', alt:'Community networking event', borderRadius:'16px' }},
        ]},
      { id:uid(), preset:'1', bgColor:'#F0F9FF', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'jobs', widgetConfig:{ heading:'Roles open right now', limit:6 }}]},
      { id:uid(), preset:'2', bgColor:'#0C4A6E', bgImage:'', overlayOpacity:0, padding:'xl',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Join in 60 seconds.', content:'Tell us who you are and what you are interested in. We will match you to relevant roles and events. No CV required — you can share that later if and when it feels right.' }},
          { id:uid(), widgetType:'form', widgetConfig:{ title:'Join Our Talent Community', description:'We will only contact you with things that are actually relevant.' }},
        ]},
    ]},
  ],
},
`;

  // Find where to insert — before the closing of the templates array export
  // portalTemplates.js likely ends with: module.exports = [...] or export default [...]
  // Find the last template closing and insert before the array closes
  
  const moduleExport = tmpl.lastIndexOf('module.exports');
  const exportDefault = tmpl.lastIndexOf('export default');
  const exportPos = Math.max(moduleExport, exportDefault);
  
  if (exportPos !== -1) {
    // Find the opening [ of the exported array
    const arrOpen = tmpl.indexOf('[', exportPos);
    // Find the closing ] of the exported array
    let depth = 0;
    let arrClose = -1;
    for (let i = arrOpen; i < tmpl.length; i++) {
      if (tmpl[i] === '[') depth++;
      if (tmpl[i] === ']') { depth--; if (depth === 0) { arrClose = i; break; } }
    }
    
    if (arrClose !== -1) {
      tmpl = tmpl.slice(0, arrClose) + campaignTemplates + tmpl.slice(arrClose);
      fs.writeFileSync(TEMPLATES_FILE, tmpl);
      console.log('✓ Campaign templates added to portalTemplates.js');
    } else {
      console.log('⚠ Could not find array close in portalTemplates.js');
    }
  } else {
    // Append before end of file
    tmpl = tmpl.trimEnd() + '\n\n// Campaign templates\nconst CAMPAIGN_TEMPLATES = [' + campaignTemplates + '];\n';
    fs.writeFileSync(TEMPLATES_FILE, tmpl);
    console.log('✓ Campaign templates appended to portalTemplates.js');
  }
}

console.log('\n✅ Done. Vite will hot-reload.');
console.log('Open New Portal → you should see Campaign Page as a type with 3 templates.');
