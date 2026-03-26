#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Deploy script for Agent Library
// Run from ~/projects/talentos:
//   node deploy-agent-library.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');

// ── 1. Copy AgentLibrary.jsx to client/src ────────────────────────────────────
console.log('Copying AgentLibrary.jsx…');
// (You need to copy AgentLibrary.jsx from downloads into this script's dir first,
//  or just cp it manually: cp ~/Downloads/AgentLibrary.jsx client/src/AgentLibrary.jsx)
if (fs.existsSync(path.join(__dirname, 'AgentLibrary.jsx'))) {
  fs.copyFileSync('AgentLibrary.jsx', 'client/src/AgentLibrary.jsx');
  console.log('✓ client/src/AgentLibrary.jsx copied');
} else {
  console.log('⚠ AgentLibrary.jsx not found next to this script — copy it manually:');
  console.log('  cp ~/Downloads/AgentLibrary.jsx client/src/AgentLibrary.jsx');
}

// ── 2. Copy agent_templates.js to server/data ─────────────────────────────────
if (!fs.existsSync('server/data')) fs.mkdirSync('server/data');
if (fs.existsSync(path.join(__dirname, 'agent_templates.js'))) {
  fs.copyFileSync('agent_templates.js', 'server/data/agent_templates.js');
  console.log('✓ server/data/agent_templates.js copied');
} else {
  console.log('⚠ agent_templates.js not found — copy it manually:');
  console.log('  cp ~/Downloads/agent_templates.js server/data/agent_templates.js');
}

// ── 3. Add /api/agents/templates route to agents.js ───────────────────────────
console.log('\nPatching server/routes/agents.js…');
let ag = fs.readFileSync('server/routes/agents.js', 'utf8');

const templatesRoute = `
// GET /api/agents/templates — return the standard template library
router.get('/templates', (req, res) => {
  try {
    const templates = require('../data/agent_templates');
    res.json(templates);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
`;

if (!ag.includes('/templates')) {
  // Insert before module.exports
  ag = ag.replace('module.exports = router;', templatesRoute + '\nmodule.exports = router;');
  fs.writeFileSync('server/routes/agents.js', ag);
  console.log('✓ /api/agents/templates route added');
} else {
  console.log('⚠ /templates route already exists — skipping');
}

// ── 4. Wire AgentLibrary into Agents.jsx ──────────────────────────────────────
console.log('\nPatching client/src/Agents.jsx…');
let cl = fs.readFileSync('client/src/Agents.jsx', 'utf8');

// Add import for AgentLibrary if not present
if (!cl.includes('AgentLibrary')) {
  cl = cl.replace(
    /^import /m,
    `import AgentLibrary from "./AgentLibrary.jsx";\nimport `
  );
  console.log('✓ AgentLibrary import added');
}

// Add showLibrary state if not present
if (!cl.includes('showLibrary')) {
  cl = cl.replace(
    /const \[agents, setAgents\]/,
    `const [showLibrary, setShowLibrary] = useState(false);\n  const [agents, setAgents]`
  );
  console.log('✓ showLibrary state added');
}

// Add handleUseTemplate function if not present
const templateHandler = `
  const handleUseTemplate = (tpl) => {
    setShowLibrary(false);
    // Pre-fill the new agent form with template data
    setForm({
      name: tpl.name,
      description: tpl.description,
      trigger_type: tpl.recommended_trigger || 'manual',
      trigger_config: {},
      conditions: [],
      actions: tpl.actions.map(a => ({ ...a, id: Date.now() + Math.random() })),
      is_active: true,
      schedule_time: '09:00',
    });
    setEditingAgent(null);
    setActiveTab('actions');
    setShowForm(true);
  };
`;

if (!cl.includes('handleUseTemplate')) {
  // Insert before the return statement
  cl = cl.replace(
    /\n  return \(/,
    templateHandler + '\n  return ('
  );
  console.log('✓ handleUseTemplate function added');
}

// Add "Browse Library" button next to "New Agent" button
// Look for the New Agent / Create Agent button in the header
if (!cl.includes('Browse Library') && !cl.includes('showLibrary')) {
  cl = cl.replace(
    /(onClick=\{\(\)=>\{setEditingAgent\(null\);setShowForm\(true\);\}\})/,
    `onClick={()=>setShowLibrary(true)} style={{...}}>Browse Library</button>
          <button $1`
  );
}

// Add library view render — before the main agents list render
const libraryRender = `
      {/* Agent Library view */}
      {showLibrary && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1000,
          display:'flex', alignItems:'stretch', justifyContent:'flex-end' }}>
          <div style={{ width:'min(860px,100vw)', background:C.bg, display:'flex',
            flexDirection:'column', padding:'32px 32px 24px', overflowY:'auto' }}>
            <AgentLibrary
              onUseTemplate={handleUseTemplate}
              onClose={()=>setShowLibrary(false)}
            />
          </div>
        </div>
      )}
`;

if (!cl.includes('Agent Library view')) {
  // Find the return statement's opening div
  const firstReturnDiv = cl.indexOf('<div style={{ display:"flex"');
  if (firstReturnDiv !== -1) {
    // Find the line just before to insert library render
    const insertAt = cl.lastIndexOf('\n', firstReturnDiv);
    cl = cl.slice(0, insertAt) + '\n' + libraryRender + cl.slice(insertAt);
    console.log('✓ Library slide-over panel wired into render');
  }
}

fs.writeFileSync('client/src/Agents.jsx', cl);
console.log('✓ client/src/Agents.jsx patched');

// ── 5. Add "Browse Library" button to Agents header ───────────────────────────
// If the above replacement was too fragile, here's the manual instruction:
console.log(`
──────────────────────────────────────────────
MANUAL STEP (if Browse Library button missing):
──────────────────────────────────────────────
In client/src/Agents.jsx, find the "+ New Agent" button in the header area and add
a "Browse Library" button BEFORE it:

  <button onClick={() => setShowLibrary(true)}
    style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
      borderRadius:9, border:\`1.5px solid \${C.accent}\`, background:C.accentLight,
      color:C.accent, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F }}>
    📚 Browse Library
  </button>

──────────────────────────────────────────────
`);

// ── 6. Done ───────────────────────────────────────────────────────────────────
console.log('\n✅ Done! Now run:');
console.log('  git add -A && git commit -m "feat: agent library with 15 categorised templates" && git push origin main');
console.log('  cd client && npx vercel --prod --yes');
