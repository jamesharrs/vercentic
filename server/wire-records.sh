#!/bin/bash
set -e
echo "🔌 Wiring Records into App.jsx..."

cp Records.jsx client/src/Records.jsx

node << 'NODEOF'
const fs = require('fs');
let app = fs.readFileSync('client/src/App.jsx', 'utf8');

// 1. Add Records import (only if not already there)
if (!app.includes('import RecordsView')) {
  app = app.replace(
    'import SettingsPage from "./Settings.jsx";',
    'import SettingsPage from "./Settings.jsx";\nimport RecordsView from "./Records.jsx";'
  );
}

// 2. Add a nav item for each object — actually we'll add a dynamic nav
// First find the navItems definition and replace it with dynamic nav
app = app.replace(
  `const navItems=[{id:"schema",icon:"database",label:"Data Model"},{id:"settings",icon:"settings",label:"Settings"}];`,
  `const [objects, setObjects] = useState([]);
  useEffect(()=>{
    if(env) api.get(\`/objects?environment_id=\${env.id}\`).then(d=>setObjects(Array.isArray(d)?d:[]));
  },[env?.id]);
  const navItems=[
    ...objects.map(o=>({id:\`object_\${o.id}\`,icon:o.icon||"briefcase",label:o.plural_name,object:o})),
    {id:"schema",icon:"database",label:"Data Model"},
    {id:"settings",icon:"settings",label:"Settings"},
  ];`
);

// 3. Wire records view in the main render
app = app.replace(
  ':nav==="settings"?<SettingsPage/>',
  ':nav==="settings"?<SettingsPage/>\n        :nav?.startsWith("object_")?<RecordsView environment={env} object={navItems.find(n=>n.id===nav)?.object}/>'
);

fs.writeFileSync('client/src/App.jsx', app);
console.log('✅ App.jsx wired');
NODEOF

echo "✅ Done! Refresh your browser."
