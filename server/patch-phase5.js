const fs = require('fs');
const path = require('path');

// ── Copy files ────────────────────────────────────────────────────────────────
fs.copyFileSync('server/Dashboard.jsx', 'client/src/Dashboard.jsx');
console.log('✅ Copied Dashboard.jsx');

fs.copyFileSync('server/csv.js', 'server/routes/csv.js');
console.log('✅ Copied csv.js to routes/');

// ── Register CSV route in index.js ─────────────────────────────────────────
let idx = fs.readFileSync('server/index.js', 'utf8');
if (!idx.includes('csv')) {
  idx = idx.replace(
    "app.use('/api/ai', require('./routes/ai-proxy'));",
    "app.use('/api/ai', require('./routes/ai-proxy'));\napp.use('/api/csv', require('./routes/csv'));"
  );
  fs.writeFileSync('server/index.js', idx);
  console.log('✅ Registered /api/csv in server');
}

// ── Patch App.jsx ──────────────────────────────────────────────────────────
let app = fs.readFileSync('client/src/App.jsx', 'utf8');

// 1. Add Dashboard import
if (!app.includes('Dashboard')) {
  app = app.replace(
    "import { AICopilot, MatchingEngine } from \"./AI.jsx\";",
    "import { AICopilot, MatchingEngine } from \"./AI.jsx\";\nimport Dashboard from \"./Dashboard.jsx\";"
  );
  console.log('✅ Added Dashboard import');
}

// 2. Add search icon path if missing
if (!app.includes('"search"') && !app.includes("search:")) {
  // search icon already exists from Records.jsx, skip
}

// 3. Replace navSections with dynamic version that includes Dashboard, per-object nav, and moves schema to Settings
const OLD_NAV = `  const navSections = [
    {
      label: "Recruit",
      items: [
        { id: "app", icon: "grid", label: "All Objects" },
      ]
    },
    {
      label: "Configure",
      items: [
        { id: "schema", icon: "database", label: "Data Model" },
        { id: "search", icon: "search", label: "Search" },
        { id: "matching", icon: "zap", label: "AI Matching" },
        { id: "settings", icon: "settings", label: "Settings" },
      ]
    }
  ];`;

const NEW_NAV = `  const [navObjects, setNavObjects] = useState([]);
  useEffect(() => {
    if (!selectedEnv?.id) return;
    api.get(\`/objects?environment_id=\${selectedEnv.id}\`).then(d => setNavObjects(Array.isArray(d)?d:[]));
  }, [selectedEnv?.id]);

  const objectIconMap = { people:"user", jobs:"briefcase", "talent-pools":"layers" };
  const navSections = [
    {
      label: "Overview",
      items: [
        { id: "dashboard", icon: "home", label: "Dashboard" },
      ]
    },
    {
      label: "Recruit",
      items: navObjects.map(o => ({ id: \`obj_\${o.id}\`, icon: objectIconMap[o.slug]||"database", label: o.plural_name, object: o, slug: o.slug }))
    },
    {
      label: "Tools",
      items: [
        { id: "matching", icon: "zap", label: "AI Matching" },
        { id: "search",   icon: "search", label: "Search" },
      ]
    },
    {
      label: "Configure",
      items: [
        { id: "settings", icon: "settings", label: "Settings" },
      ]
    }
  ];`;

if (app.includes('label: "All Objects"')) {
  app = app.replace(OLD_NAV, NEW_NAV);
  console.log('✅ Replaced navSections with dynamic version');
} else if (!app.includes('navObjects')) {
  // Try a simpler replacement just of the Recruit section
  app = app.replace(
    '{ id: "app", icon: "grid", label: "All Objects" },',
    '{ id: "dashboard", icon: "home", label: "Dashboard" },'
  );
  // Add dynamic objects section after
  app = app.replace(
    'label: "Recruit",\n      items: [\n        { id: "dashboard"',
    'label: "Overview",\n      items: [\n        { id: "dashboard"'
  );
  console.log('✅ Patched nav items');
}

// 4. Update the render section to handle new nav IDs
// Find the render section and update it
const OLD_RENDER_MATCHING = `) : activeNav === "matching" ? (
          <MatchingEngine environment={selectedEnv} />
        ) : activeNav === "search" ? (`;

const NEW_RENDER_MATCHING = `) : activeNav === "dashboard" ? (
          <Dashboard environment={selectedEnv} onNavigate={(slug) => {
            if (slug === "matching") { setActiveNav("matching"); return; }
            if (slug === "search")   { setActiveNav("search");   return; }
            const obj = navObjects.find(o => o.slug === slug || o.plural_name.toLowerCase() === slug);
            if (obj) setActiveNav(\`obj_\${obj.id}\`);
          }}/>
        ) : activeNav === "matching" ? (
          <MatchingEngine environment={selectedEnv} />
        ) : activeNav.startsWith("obj_") ? (
          <RecordsView object={navObjects.find(o => \`obj_\${o.id}\` === activeNav)} environment={selectedEnv} />
        ) : activeNav === "search" ? (`;

if (app.includes(OLD_RENDER_MATCHING)) {
  app = app.replace(OLD_RENDER_MATCHING, NEW_RENDER_MATCHING);
  console.log('✅ Patched render section with Dashboard + per-object nav');
}

// 5. Add global search bar to the header area
// Find the main content area header and inject a top search bar
const OLD_MAIN_START = `      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, padding: "32px", minHeight: "100vh", overflow: "auto" }}>`;

const NEW_MAIN_START = `      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Top nav bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#f7f8fa", borderBottom: "1px solid #e8eaed", padding: "10px 32px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 480 }}>
            <input
              placeholder="Search everything… (candidates, jobs, pools)"
              onFocus={() => setActiveNav("search")}
              style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: 10, border: "1.5px solid #e8eaed", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", background: "white", color: "#111827", boxSizing: "border-box", cursor: "pointer" }}
              readOnly
            />
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", display: "flex", pointerEvents: "none" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            {selectedEnv?.name}
          </div>
        </div>
        <div style={{ flex: 1, padding: "28px 32px", overflow: "auto" }}>`;

// Also need to close the extra div
const OLD_COPILOT = `      <AICopilot environment={selectedEnv} />
    </div>
  );
}`;

const NEW_COPILOT = `      <AICopilot environment={selectedEnv} />
        </div>
    </div>
  );
}`;

if (app.includes(OLD_MAIN_START)) {
  app = app.replace(OLD_MAIN_START, NEW_MAIN_START);
  app = app.replace(OLD_COPILOT, NEW_COPILOT);
  console.log('✅ Added top search bar');
} else {
  console.log('⚠️  Could not inject top bar - may need manual adjustment');
}

// 6. Change default active nav to dashboard
app = app.replace(
  'const [activeNav, setActiveNav] = useState("app");',
  'const [activeNav, setActiveNav] = useState("dashboard");'
);
app = app.replace(
  "const [activeNav, setActiveNav] = useState(\"app\");",
  "const [activeNav, setActiveNav] = useState(\"dashboard\");"
);

// 7. Add home icon if missing
if (!app.includes('"home"') || !app.includes('home:')) {
  // It's inline SVG in the top bar now, so no icon map needed
}

// 8. Add navObjects state if not already added by the nav section replacement
if (!app.includes('navObjects') && !app.includes('setNavObjects')) {
  app = app.replace(
    'const [activeNav, setActiveNav] = useState("dashboard");',
    `const [navObjects, setNavObjects] = useState([]);
  useEffect(() => {
    if (!selectedEnv?.id) return;
    api.get(\`/objects?environment_id=\${selectedEnv.id}\`).then(d => setNavObjects(Array.isArray(d)?d:[]));
  }, [selectedEnv?.id]);
  const [activeNav, setActiveNav] = useState("dashboard");`
  );
  console.log('✅ Added navObjects state');
}

fs.writeFileSync('client/src/App.jsx', app);
console.log('\n✅ App.jsx patched successfully!');
console.log('\nNext steps:');
console.log('1. Seed demo data:  node server/seed-demo.js');
console.log('2. Restart server:  cd server && node index.js');
console.log('3. Refresh browser');
