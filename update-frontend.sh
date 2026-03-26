#!/bin/bash
set -e
echo "🎨 Updating frontend with Settings page..."

# Copy Settings.jsx into client/src
cp Settings.jsx client/src/Settings.jsx

# Patch App.jsx — add import and wire settings nav
# We'll do a full replace of the relevant sections using node
node << 'NODEOF'
const fs = require('fs');
let app = fs.readFileSync('client/src/App.jsx', 'utf8');

// 1. Add Settings import after first import line
app = app.replace(
  'import { useState, useEffect, useCallback } from "react";',
  'import { useState, useEffect, useCallback } from "react";\nimport SettingsPage from "./Settings.jsx";'
);

// 2. Update nav items to include settings properly
app = app.replace(
  `const navItems=[{id:"schema",icon:"database",label:"Data Model"},{id:"settings",icon:"settings",label:"Settings"}];`,
  `const navItems=[{id:"schema",icon:"database",label:"Data Model"},{id:"settings",icon:"settings",label:"Settings"}];`
);

// 3. Wire settings page into the main content render
app = app.replace(
  `:selObj?<ObjectSchemaView object={selObj} allObjects={allObjs} environmentId={env.id} onBack={()=>setSelObj(null)}/>
        :<ObjectsView environment={env} onSelectObject={(obj,objs)=>{setSelObj(obj);setAllObjs(objs);}}/>}`,
  `:nav==="settings"?<SettingsPage/>
        :selObj?<ObjectSchemaView object={selObj} allObjects={allObjs} environmentId={env.id} onBack={()=>setSelObj(null)}/>
        :<ObjectsView environment={env} onSelectObject={(obj,objs)=>{setSelObj(obj);setAllObjs(objs);}}/>}`
);

fs.writeFileSync('client/src/App.jsx', app);
console.log('✅ App.jsx updated');
NODEOF

echo ""
echo "✅ Frontend updated!"
echo ""
echo "Now restart both servers:"
echo "  Tab 1 (server): Ctrl+C, then: node index.js"
echo "  Tab 2 (client): already running, just refresh the browser"
echo ""
