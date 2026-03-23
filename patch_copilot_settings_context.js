#!/usr/bin/env node
// patch_copilot_settings_context.js
// Run from ~/projects/talentos:  node patch_copilot_settings_context.js
const fs = require('fs'), path = require('path');

function patch(filepath, label, oldStr, newStr) {
  const full = path.resolve(filepath);
  if (!fs.existsSync(full)) { console.log(`SKIP ${label} — file not found`); return false; }
  let src = fs.readFileSync(full, 'utf8');
  if (!src.includes(oldStr)) { console.log(`SKIP ${label} — anchor not found`); return false; }
  fs.writeFileSync(full, src.replace(oldStr, newStr));
  console.log(`OK   ${label}`); return true;
}

const AI = 'client/src/AI.jsx';
const APP = 'client/src/App.jsx';
const SETTINGS = 'client/src/Settings.jsx';

console.log('\n── 1: Remove "recruitment" from copilot subtitle ──');

// Fix the fallback subtitle in the header
patch(AI, '1a Header subtitle fallback',
  `return "Your AI recruitment assistant";`,
  `return "Your AI assistant";`
);

// Fix the default welcome message — remove "recruitment" focus
patch(AI, '1b Default welcome message',
  `return \`Hi! I'm your Vercentic Copilot. I can:\\n• **Search** candidates, jobs, and pools\\n• **Create records** — people, jobs, talent pools\\n• **Build workflows** with stages and automations\\n• **Invite users** and **create roles** (admin)\\n\\nWhat would you like to do?\`;`,
  `return \`Hi! I'm your Vercentic Copilot. I can:\\n• **Search** across all your data\\n• **Create** and manage records\\n• **Build** workflows and reports\\n• **Configure** settings and integrations\\n• **Draft** emails and documents\\n\\nWhat would you like to do?\`;`
);

console.log('\n── 2: Add settings section context ──');

// Add subtitle awareness for settings pages
patch(AI, '2a Header subtitle for settings',
  `if(activeNav==="reports") return "In Reports";`,
  `if(activeNav==="reports") return "In Reports";
                  if(activeNav==="settings") return settingsSection ? \`Settings · \${settingsSection}\` : "In Settings";`
);

// Add settingsSection state
patch(AI, '2b Add settingsSection state',
  `const [dragOver, setDragOver] = useState(false);`,
  `const [dragOver, setDragOver] = useState(false);
  const [settingsSection, setSettingsSection] = useState(null);`
);

// Listen for settings section changes via custom event
patch(AI, '2c Listen for settings section events',
  `if(environment?.id) api.get(\`/interview-types?environment_id=\${environment.id}\`).then(t=>{ if(Array.isArray(t)) setInterviewTypes(t); }).catch(()=>{});`,
  `if(environment?.id) api.get(\`/interview-types?environment_id=\${environment.id}\`).then(t=>{ if(Array.isArray(t)) setInterviewTypes(t); }).catch(()=>{});
    // Listen for settings section navigation
    const handleSettingsNav = (e) => setSettingsSection(e.detail?.section || null);
    window.addEventListener('talentos:settings-section', handleSettingsNav);
    return () => window.removeEventListener('talentos:settings-section', handleSettingsNav);`
);

// Add settings welcome message
patch(AI, '2d Settings welcome message',
  `if(activeNav==='offers') return \`Hi! I can see you're in **Offers**.`,
  `if(activeNav==='settings') {
          const sec = settingsSection;
          if(sec === 'Data Model') return \`Hi! You're in **Data Model** settings.\\n\\nI can help you:\\n• Create new objects or fields\\n• Explain field types and best practices\\n• Suggest field configurations for common use cases\\n\\nWhat would you like to configure?\`;
          if(sec === 'Users') return \`Hi! You're in **User Management**.\\n\\nI can help you:\\n• Invite a new user\\n• Explain roles and permissions\\n• Troubleshoot login issues\\n\\nWhat would you like to do?\`;
          if(sec === 'Roles & Permissions') return \`Hi! You're in **Roles & Permissions**.\\n\\nI can help you:\\n• Create a new role\\n• Explain how permissions work\\n• Suggest role configurations\\n\\nWhat would you like to configure?\`;
          if(sec === 'Workflows') return \`Hi! You're in **Workflows**.\\n\\nI can help you:\\n• Create a new workflow\\n• Add stages and automation steps\\n• Explain workflow types (record pipeline vs linked person)\\n\\nWhat would you like to build?\`;
          if(sec === 'Portals') return \`Hi! You're in **Portals**.\\n\\nI can help you:\\n• Set up a new career site or portal\\n• Configure branding and themes\\n• Add pages and widgets\\n\\nWhat would you like to do?\`;
          if(sec === 'Forms') return \`Hi! You're in **Forms**.\\n\\nI can help you:\\n• Create a new form (scorecards, surveys, screening)\\n• Explain form field types\\n• Suggest form templates for common use cases\\n\\nWhat would you like to build?\`;
          if(sec === 'Org Structure') return \`Hi! You're in **Org Structure**.\\n\\nI can help you:\\n• Explain how org units work\\n• Set up the company hierarchy\\n• Assign users to departments\\n\\nWhat would you like to do?\`;
          if(sec === 'Integrations') return \`Hi! You're in **Integrations**.\\n\\nI can help you:\\n• Configure Twilio for SMS/WhatsApp\\n• Set up SendGrid for email\\n• Explain available integrations\\n\\nWhat do you need help with?\`;
          return \`Hi! You're in **Settings**.\\n\\nI can help you configure any part of the platform — data model, users, workflows, portals, integrations, and more.\\n\\nWhat would you like to do?\`;
        }
        if(activeNav==='offers') return \`Hi! I can see you're in **Offers**.`
);

// Add settings context to the page context builder
patch(AI, '2e Settings context in page context builder',
  `:activeNav==='settings'?'Settings (platform configuration)'`,
  `:activeNav==='settings'?'Settings'+(settingsSection?' — '+settingsSection+' section':' (platform configuration)')`
);

// Add settings-specific suggested actions
patch(AI, '2f Settings suggested actions',
  `  reports: [
    { label: "Filter by status",   prompt: "Add a filter to show only active records" },
    { label: "Group differently",  prompt: "Change the grouping of this report" },
    { label: "Change chart type",  prompt: "Change this to a pie chart" },
    { label: "Save this report",   prompt: "Save this report with a name" },
  ],`,
  `  reports: [
    { label: "Filter by status",   prompt: "Add a filter to show only active records" },
    { label: "Group differently",  prompt: "Change the grouping of this report" },
    { label: "Change chart type",  prompt: "Change this to a pie chart" },
    { label: "Save this report",   prompt: "Save this report with a name" },
  ],
  settings: [
    { label: "Create a field",     prompt: "I want to create a new field" },
    { label: "Invite a user",      prompt: "I want to invite a new user" },
    { label: "Create a workflow",  prompt: "I want to create a new workflow" },
    { label: "Set up integration", prompt: "Help me configure an integration" },
  ],`
);

// Make SuggestedActions detect settings pages
patch(AI, '2g SuggestedActions settings detection',
  `const isReports = activeNav === 'reports';
  const actions = isReports ?`,
  `const isReports = activeNav === 'reports';
  const isSettings = activeNav === 'settings';
  const actions = isSettings ? SUGGESTED_ACTIONS.settings : isReports ?`
);

console.log('\n── 3: Fire settings section event from Settings.jsx ──');

// In Settings.jsx, fire a custom event whenever the active section changes
// Find the section click handler and add the event dispatch
let settingsSrc = '';
const settingsPath = path.resolve(SETTINGS);
if (fs.existsSync(settingsPath)) {
  settingsSrc = fs.readFileSync(settingsPath, 'utf8');

  // Find where activeSection state is used and add an effect to fire the event
  if (settingsSrc.includes('setActiveSection') && !settingsSrc.includes('talentos:settings-section')) {
    // Add useEffect to fire the event when section changes
    // Find the first useEffect in SettingsPage to add near it
    const anchor = 'const [activeSection, setActiveSection]';
    if (settingsSrc.includes(anchor)) {
      settingsSrc = settingsSrc.replace(
        anchor,
        `const [activeSection, setActiveSection]`
      );

      // Add effect after the state declaration — find the next useEffect or return
      // Simplest: add a standalone effect right after all useState calls
      const effectAnchor = settingsSrc.includes('useEffect(()=>{')
        ? null  // already has effects
        : null;

      // Just add the dispatch inside setActiveSection wrapper
      // Replace all setActiveSection(xxx) calls with a wrapper that also fires the event
      // Actually simpler: just add a useEffect that watches activeSection
      if (!settingsSrc.includes('talentos:settings-section')) {
        // Find where the component body starts (after all useState lines)
        // Add an effect that fires whenever activeSection changes
        const insertPoint = settingsSrc.indexOf('return (', settingsSrc.indexOf('function SettingsPage'));
        if (insertPoint > -1) {
          const effectCode = `
  // Notify copilot of settings section changes
  React.useEffect(() => {
    const label = SYSTEM_ADMIN_SECTIONS.find(s => s.id === activeSection)?.label
      || USER_ADMIN_SECTIONS?.find?.(s => s.id === activeSection)?.label
      || activeSection;
    window.dispatchEvent(new CustomEvent('talentos:settings-section', { detail: { section: label } }));
    return () => window.dispatchEvent(new CustomEvent('talentos:settings-section', { detail: { section: null } }));
  }, [activeSection]);

  `;
          settingsSrc = settingsSrc.slice(0, insertPoint) + effectCode + settingsSrc.slice(insertPoint);
          fs.writeFileSync(settingsPath, settingsSrc);
          console.log('OK   3a Settings.jsx — added section change event');
        } else {
          console.log('SKIP 3a Settings.jsx — could not find return statement');
        }
      }
    } else {
      console.log('SKIP 3a Settings.jsx — activeSection state not found');
    }
  } else if (settingsSrc.includes('talentos:settings-section')) {
    console.log('SKIP 3a Settings.jsx — already patched');
  } else {
    console.log('SKIP 3a Settings.jsx — setActiveSection not found');
  }
} else {
  console.log('SKIP 3  Settings.jsx — file not found');
}

console.log('\n── 4: Also clear settings context when leaving settings ──');

// When activeNav changes away from settings, clear the section
patch(AI, '4a Clear settings section on nav change',
  `if (!id.startsWith("record_")) { setActiveRecord(null); setActiveRecordObj(null); }`,
  `if (!id.startsWith("record_")) { setActiveRecord(null); setActiveRecordObj(null); }
    // Clear settings section context when leaving settings
    if (id !== "settings") window.dispatchEvent(new CustomEvent('talentos:settings-section', { detail: { section: null } }));`
);

console.log('\n✅ Done! Changes:');
console.log('   • "Your AI recruitment assistant" → "Your AI assistant"');
console.log('   • Default welcome message: removed recruitment focus');
console.log('   • Settings pages: context-aware subtitle showing active section');
console.log('   • Settings pages: section-specific welcome messages (Data Model, Users, Workflows, etc.)');
console.log('   • Settings pages: suggested actions (Create field, Invite user, etc.)');
console.log('   • Settings.jsx fires talentos:settings-section event on section change');
console.log('');
console.log('Run:');
console.log('  git add -A && git commit -m "feat: copilot settings context + remove recruitment branding" && git push origin main');
