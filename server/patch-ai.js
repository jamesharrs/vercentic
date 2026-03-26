const fs = require('fs');

// 1. Copy AI.jsx to client
fs.copyFileSync('server/AI.jsx', 'client/src/AI.jsx');
console.log('✅ Copied AI.jsx to client/src/');

// 2. Patch App.jsx
let app = fs.readFileSync('client/src/App.jsx', 'utf8');

// Add imports
if (!app.includes('AICopilot')) {
  app = app.replace(
    'import SearchPage from "./Search.jsx";',
    'import SearchPage from "./Search.jsx";\nimport { AICopilot, MatchingEngine } from "./AI.jsx";'
  );
  console.log('✅ Added AI imports');
}

// Add matching to nav
if (!app.includes('"matching"')) {
  app = app.replace(
    '{ id: "search", icon: "search", label: "Search" },',
    '{ id: "search", icon: "search", label: "Search" },\n        { id: "matching", icon: "zap", label: "AI Matching" },'
  );
  console.log('✅ Added AI Matching to nav');
}

// Add matching render
if (!app.includes('activeNav === "matching"')) {
  app = app.replace(
    ') : activeNav === "search" ? (',
    ') : activeNav === "matching" ? (\n          <MatchingEngine environment={selectedEnv} />\n        ) : activeNav === "search" ? ('
  );
  console.log('✅ Wired MatchingEngine');
}

// Add copilot floating button before closing div
if (!app.includes('AICopilot')) {
  app = app.replace(
    '    </div>\n  );\n}',
    '      <AICopilot environment={selectedEnv} />\n    </div>\n  );\n}'
  );
  console.log('✅ Added AICopilot floating button');
}

// Add zap icon if missing
if (!app.includes('"zap"') || !app.includes('zap:')) {
  app = app.replace(
    'search:"M21 21l-4.35-4.35',
    'zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",\n    search:"M21 21l-4.35-4.35'
  );
  console.log('✅ Added zap icon');
}

fs.writeFileSync('client/src/App.jsx', app);
console.log('\n✅ Done! Refresh the browser to see AI Matching + Copilot.');
