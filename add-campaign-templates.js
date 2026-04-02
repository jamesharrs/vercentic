/**
 * add-campaign-templates.js
 * Run from project root: node add-campaign-templates.js
 * Adds 3 Campaign Page portal templates to Portals.jsx
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'client/src/Portals.jsx');
if (!fs.existsSync(FILE)) { console.error('Portals.jsx not found'); process.exit(1); }

let src = fs.readFileSync(FILE, 'utf8');

// ── Find the closing of the TEMPLATES array ───────────────────────────────────
// The array ends with something like:  },\n];\n  and then the next const/function
// We find the last template entry and append after it.

const CAMPAIGN_TEMPLATES = `
  // ── CAMPAIGN PAGES ──────────────────────────────────────────────────────────
  {
    id: "campaign_role",
    name: "Role Campaign",
    desc: "High-impact single-page campaign for a specific role or hiring surge",
    icon: "🎯",
    accent: "#7C3AED",
    tags: ["Campaign", "Role", "Targeted"],
    theme: {
      primaryColor:"#7C3AED", secondaryColor:"#5B21B6",
      bgColor:"#0F0A1E", textColor:"#F9FAFB", accentColor:"#F59E0B",
      fontFamily:"'Space Grotesk', sans-serif", headingFont:"'Space Grotesk', sans-serif",
      fontSize:"16px", headingWeight:"800",
      borderRadius:"12px", buttonStyle:"filled", buttonRadius:"12px", maxWidth:"1100px",
    },
    pages: [
      { id:"p1", name:"Home", slug:"/", rows:[
        // Hero — full bleed dark with overlay
        { id:"r1", preset:"1",
          bgImage:"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=80",
          bgColor:"", overlayOpacity:60, padding:"xl",
          cells:[{ id:"c1", widgetType:"hero", widgetConfig:{
            headline:"We're Hiring 50 Engineers.",
            subheading:"Join a team building the future of intelligent software. Remote-first, world-class benefits, and work that actually matters.",
            ctaText:"Apply Now",
            ctaUrl:"/apply",
            align:"left",
          }}]},
        // Urgency strip
        { id:"r2", preset:"4", bgColor:"#7C3AED", bgImage:"", overlayOpacity:0, padding:"sm",
          cells:[
            { id:"c2", widgetType:"stats", widgetConfig:{ stats:[{value:"50",label:"Open Roles"},{value:"Remote",label:"Work Style"},{value:"$180k+",label:"Comp Range"},{value:"2 wks",label:"To Hire"}]}},
          ]},
        // Role highlights
        { id:"r3", preset:"3", bgColor:"#160D2E", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c3", widgetType:"text", widgetConfig:{ heading:"Why engineers love it here", content:"No bureaucracy. No endless meetings. Just small teams with big impact, shipping software used by millions." }},
            { id:"c4", widgetType:"text", widgetConfig:{ heading:"The stack you'll work with", content:"TypeScript, React, Node.js, PostgreSQL, and a modern AI-powered pipeline. We pick the right tool for the job — not the trendy one." }},
            { id:"c5", widgetType:"text", widgetConfig:{ heading:"Your first 90 days", content:"Paired with a senior engineer from day one. Your first PR merged in week one. Running your first release in month two." }},
          ]},
        // Team photo
        { id:"r4", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c6", widgetType:"image", widgetConfig:{
            url:"https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80",
            alt:"Engineering team working together",
            borderRadius:"16px",
          }}]},
        // Open roles
        { id:"r5", preset:"1", bgColor:"#0F0A1E", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c7", widgetType:"jobs", widgetConfig:{ heading:"Open Engineering Roles", filterDept:"Engineering" }}]},
        // Benefits
        { id:"r6", preset:"3", bgColor:"#160D2E", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c8", widgetType:"text", widgetConfig:{ heading:"💰 Compensation", content:"Base $120–$180k · Equity · Annual performance bonus · Salary reviewed every 6 months." }},
            { id:"c9", widgetType:"text", widgetConfig:{ heading:"🌍 Remote-first", content:"Work from anywhere. We have hubs in Dubai, London and NYC for those who want them." }},
            { id:"c10", widgetType:"text", widgetConfig:{ heading:"⚡ Growth", content:"Learning budget $3k/yr · Conference sponsorship · Internal mobility encouraged · No dead-end roles." }},
          ]},
        // FAQ
        { id:"r7", preset:"1", bgColor:"#0F0A1E", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c11", widgetType:"accordion", widgetConfig:{
            heading:"Frequently Asked Questions",
            items:[
              { q:"What does the interview process look like?", a:"A 30-min intro call, a take-home task (max 3 hours), and a final loop with the team. Total time from apply to offer: under 2 weeks." },
              { q:"Do I need to relocate?", a:"No. We are fully remote-first. You're welcome to work from one of our hubs but it's never required." },
              { q:"Are you open to part-time or contract arrangements?", a:"For most roles, we prefer full-time. Exceptions exist — mention it in your application." },
              { q:"What level of experience are you looking for?", a:"We have roles for mid-level through staff engineer. Each listing specifies the level — apply to the one that fits." },
            ],
          }}]},
        // CTA
        { id:"r8", preset:"1",
          bgImage:"https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1400&q=80",
          bgColor:"", overlayOpacity:70, padding:"xl",
          cells:[{ id:"c12", widgetType:"hero", widgetConfig:{
            headline:"Ready to build something great?",
            subheading:"Applications reviewed within 48 hours. We'll always let you know either way.",
            ctaText:"Apply Now",
            ctaUrl:"/apply",
            align:"center",
          }}]},
      ]},
    ],
  },

  {
    id: "campaign_earlycareers",
    name: "Early Careers",
    desc: "Graduate programmes, internships and entry-level recruitment campaigns",
    icon: "🎓",
    accent: "#059669",
    tags: ["Graduate", "Internship", "Early Careers"],
    theme: {
      primaryColor:"#059669", secondaryColor:"#0D9488",
      bgColor:"#ECFDF5", textColor:"#064E3B", accentColor:"#7C3AED",
      fontFamily:"'Plus Jakarta Sans', sans-serif", headingFont:"'Plus Jakarta Sans', sans-serif",
      fontSize:"16px", headingWeight:"800",
      borderRadius:"16px", buttonStyle:"filled", buttonRadius:"999px", maxWidth:"1060px",
    },
    pages: [
      { id:"p1", name:"Home", slug:"/", rows:[
        // Hero
        { id:"r1", preset:"2",
          bgColor:"#064E3B", bgImage:"", overlayOpacity:0, padding:"xl",
          cells:[
            { id:"c1", widgetType:"hero", widgetConfig:{
              headline:"Start your career where it counts.",
              subheading:"Our Graduate Programme is designed to turn ambitious graduates into confident professionals — fast. 12 months, real responsibility, mentorship from day one.",
              ctaText:"Apply for 2026 Cohort",
              ctaUrl:"/apply",
              align:"left",
            }},
            { id:"c2", widgetType:"image", widgetConfig:{
              url:"https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80",
              alt:"Young professionals collaborating",
              borderRadius:"20px",
            }},
          ]},
        // Programme highlights
        { id:"r2", preset:"4", bgColor:"#059669", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[
            { id:"c3", widgetType:"stats", widgetConfig:{ stats:[{value:"12 months",label:"Programme Length"},{value:"4",label:"Rotations"},{value:"92%",label:"Permanent Hire Rate"},{value:"250+",label:"Alumni Network"}]}},
          ]},
        // How it works — timeline
        { id:"r3", preset:"1", bgColor:"#F0FDF4", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c4", widgetType:"text", widgetConfig:{
            heading:"The journey",
            content:"Month 1–3: Foundation — orientation, training, and your first rotation.\\nMonth 4–6: Explore — second rotation across a different business area.\\nMonth 7–9: Deliver — a live project with real ownership and measurable impact.\\nMonth 10–12: Lead — present findings to leadership, secure your permanent offer.",
          }}]},
        // Photo
        { id:"r4", preset:"2", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c5", widgetType:"image", widgetConfig:{
              url:"https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
              alt:"Graduate cohort",
              borderRadius:"16px",
            }},
            { id:"c6", widgetType:"text", widgetConfig:{
              heading:"Who we're looking for",
              content:"You don't need to have everything figured out. We're looking for curious, driven graduates with a growth mindset.\\n\\n✓ Final-year students or recent graduates (any degree)\\n✓ Strong communication and problem-solving skills\\n✓ Comfortable with ambiguity and change\\n✓ Passion for the industry — not just the job title",
            }},
          ]},
        // Testimonials
        { id:"r5", preset:"3", bgColor:"#ECFDF5", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c7", widgetType:"text", widgetConfig:{ heading:"\\"I had real ownership from month one.\\"", content:"— Sarah K., 2024 cohort, now Product Manager\\n\\nThe programme threw me in at the deep end in the best possible way. My manager trusted me to lead a client project in my second rotation. I made mistakes, learned fast, and never looked back." }},
            { id:"c8", widgetType:"text", widgetConfig:{ heading:"\\"Best career decision I ever made.\\"", content:"— Marcus T., 2023 cohort, now Senior Analyst\\n\\nI applied thinking I might get a foot in the door. What I got was a proper career. Two years on I'm managing a team of four and working with our biggest clients." }},
            { id:"c9", widgetType:"text", widgetConfig:{ heading:"\\"They invest in you like they mean it.\\"", content:"— Priya M., 2024 cohort, now UX Designer\\n\\nConferences, coaching, a learning budget — they don't just say they invest in people. They actually do it. I went to three conferences in my first year alone." }},
          ]},
        // FAQ
        { id:"r6", preset:"1", bgColor:"#F0FDF4", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c10", widgetType:"accordion", widgetConfig:{
            heading:"Your questions answered",
            items:[
              { q:"When does the 2026 cohort start?", a:"September 2026. The application window closes 31 May 2026. We review on a rolling basis so early applications are strongly encouraged." },
              { q:"What degree do I need?", a:"Any degree, any classification. We care far more about how you think than what you studied." },
              { q:"Is the programme paid?", a:"Yes. Competitive graduate salary with full benefits from day one. Salary disclosed at application stage." },
              { q:"Where is it based?", a:"We offer hybrid working from our Dubai, London and Singapore offices. Some rotations require travel between offices." },
              { q:"What happens after the programme?", a:"92% of graduates receive a permanent offer. The role and level depends on your rotations and preference." },
            ],
          }}]},
        // CTA banner
        { id:"r7", preset:"1",
          bgImage:"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=80",
          bgColor:"", overlayOpacity:65, padding:"xl",
          cells:[{ id:"c11", widgetType:"hero", widgetConfig:{
            headline:"Applications now open for 2026.",
            subheading:"Cohort sizes are limited. Don't leave it to the last minute.",
            ctaText:"Apply Now — Takes 15 mins",
            ctaUrl:"/apply",
            align:"center",
          }}]},
      ]},
      { id:"p2", name:"Apply", slug:"/apply", rows:[
        { id:"r8", preset:"1", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c12", widgetType:"form", widgetConfig:{ title:"Graduate Programme Application 2026", description:"Tell us about yourself. We read every application." }}]},
      ]},
    ],
  },

  {
    id: "campaign_alumni",
    name: "Talent Community",
    desc: "Alumni networks, talent pools and stay-in-touch communities for future hiring",
    icon: "🤝",
    accent: "#0EA5E9",
    tags: ["Alumni", "Community", "Talent Pool"],
    theme: {
      primaryColor:"#0EA5E9", secondaryColor:"#0284C7",
      bgColor:"#F0F9FF", textColor:"#0C4A6E", accentColor:"#F59E0B",
      fontFamily:"'DM Sans', sans-serif", headingFont:"'DM Sans', sans-serif",
      fontSize:"16px", headingWeight:"700",
      borderRadius:"10px", buttonStyle:"filled", buttonRadius:"10px", maxWidth:"1100px",
    },
    pages: [
      { id:"p1", name:"Home", slug:"/", rows:[
        // Hero
        { id:"r1", preset:"1",
          bgImage:"https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1400&q=80",
          bgColor:"", overlayOpacity:55, padding:"xl",
          cells:[{ id:"c1", widgetType:"hero", widgetConfig:{
            headline:"Stay connected. Get first access.",
            subheading:"Join our talent community and be the first to hear about new roles, events, and news from our team. No spam — just the good stuff.",
            ctaText:"Join the Community",
            ctaUrl:"#join",
            align:"center",
          }}]},
        // Why join
        { id:"r2", preset:"3", bgColor:"#E0F2FE", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c2", widgetType:"text", widgetConfig:{ heading:"🔔 Early access to roles", content:"Community members hear about new opportunities 2 weeks before public posting. Many are filled before they go live." }},
            { id:"c3", widgetType:"text", widgetConfig:{ heading:"🎟️ Events & webinars", content:"Exclusive access to networking events, industry panels, and skills workshops run by our team and senior leaders." }},
            { id:"c4", widgetType:"text", widgetConfig:{ heading:"🤝 Direct recruiter contact", content:"A real person who knows your background. No black holes — we actually respond and keep you updated." }},
          ]},
        // Community numbers
        { id:"r3", preset:"4", bgColor:"#0EA5E9", bgImage:"", overlayOpacity:0, padding:"md",
          cells:[
            { id:"c5", widgetType:"stats", widgetConfig:{ stats:[{value:"4,200+",label:"Community Members"},{value:"68%",label:"Hired From Community"},{value:"Monthly",label:"Events & Webinars"},{value:"48hrs",label:"Avg Response Time"}]}},
          ]},
        // Photo
        { id:"r4", preset:"2", bgColor:"", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[
            { id:"c6", widgetType:"text", widgetConfig:{
              heading:"Who joins our community?",
              content:"Former applicants who weren't quite right for a role but impressed us.\\n\\nPassive candidates open to the right opportunity.\\n\\nPast colleagues and alumni.\\n\\nIndustry professionals who want to stay close to what we're doing.\\n\\nIf you're curious about working with us — at any point in the future — this is the right place.",
            }},
            { id:"c7", widgetType:"image", widgetConfig:{
              url:"https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
              alt:"Community networking event",
              borderRadius:"16px",
            }},
          ]},
        // Current openings
        { id:"r5", preset:"1", bgColor:"#F0F9FF", bgImage:"", overlayOpacity:0, padding:"lg",
          cells:[{ id:"c8", widgetType:"jobs", widgetConfig:{ heading:"Roles open right now", limit:6 }}]},
        // Join form (anchor)
        { id:"r6", preset:"2",
          bgColor:"#0C4A6E", bgImage:"", overlayOpacity:0, padding:"xl",
          cells:[
            { id:"c9", widgetType:"text", widgetConfig:{
              heading:"Join in 60 seconds.",
              content:"Tell us who you are and what you're interested in. We'll match you to relevant roles and events. No CV required — you can share that later if and when it feels right.",
            }},
            { id:"c10", widgetType:"form", widgetConfig:{
              title:"Join Our Talent Community",
              description:"We'll only contact you with things that are actually relevant.",
            }},
          ]},
      ]},
    ],
  },
`;

// Find where the TEMPLATES array ends (look for the closing ]; after the last template)
// We'll look for the pattern that marks the end of the templates array

// Strategy: find the last occurrence of a template closing pattern and insert before the array terminator
// The array is const TEMPLATES = [...] or similar

// Find TEMPLATES array end
let insertPos = -1;

// Look for the closing of the templates array - find ]; after the template objects
// We search for the pattern: closing brace + comma/newline then ]; 
// More reliably: find "  },\n];" or similar at the end of the template array

// First find where TEMPLATES is defined
const templatesMatch = src.match(/const TEMPLATES\s*=\s*\[/);
if (!templatesMatch) {
  console.error('Could not find TEMPLATES array. Looking for PORTAL_TEMPLATES...');
  const ptMatch = src.match(/const PORTAL_TEMPLATES\s*=\s*\[/);
  if (!ptMatch) {
    console.error('Could not find PORTAL_TEMPLATES either. Aborting.');
    process.exit(1);
  }
}

// Find the closing ]; of the templates array
// After finding the TEMPLATES = [ , count brackets to find the end
const arrayStart = src.indexOf('const TEMPLATES') !== -1 
  ? src.indexOf('const TEMPLATES')
  : src.indexOf('const PORTAL_TEMPLATES');

// Find the opening [ of the array
let bracketStart = src.indexOf('[', arrayStart);
let depth = 0;
let arrayEnd = -1;

for (let i = bracketStart; i < src.length; i++) {
  if (src[i] === '[') depth++;
  if (src[i] === ']') {
    depth--;
    if (depth === 0) {
      arrayEnd = i;
      break;
    }
  }
}

if (arrayEnd === -1) {
  console.error('Could not find end of TEMPLATES array');
  process.exit(1);
}

// Check if campaign templates already exist
if (src.includes('campaign_role') || src.includes('"campaign_role"')) {
  console.log('Campaign templates already added. Nothing to do.');
  process.exit(0);
}

// Insert the campaign templates just before the closing ]
src = src.slice(0, arrayEnd) + CAMPAIGN_TEMPLATES + src.slice(arrayEnd);

fs.writeFileSync(FILE, src);
console.log('✅ Campaign templates added to Portals.jsx');
console.log('   Templates added: campaign_role, campaign_earlycareers, campaign_alumni');
console.log('\nVite will hot-reload. Open the portal builder and click New Portal to see them.');
