const fs = require('fs');
let f = fs.readFileSync('src/Settings.jsx','utf8');
let changed = false;

// 1. Add imports if missing
if (!f.includes('BrandKitSettings')) {
  f = f.replace(
    /^(import )/m,
    'import BrandKitSettings from "./settings/BrandKitSettings.jsx";\nimport EmailTemplateBuilder from "./settings/EmailTemplateBuilder.jsx";\n$1'
  );
  changed = true;
}

// 2. Add render cases after the last activeSection line
if (!f.includes('"brand_kits"')) {
  f = f.replace(
    '{activeSection==="config"',
    '{activeSection==="brand_kits"  && <BrandKitSettings environment={environment}/>}\n        {activeSection==="email_templates" && <EmailTemplateBuilder environment={environment}/>}\n        {activeSection==="config"'
  );
  changed = true;
}

fs.writeFileSync('src/Settings.jsx', f);
console.log(changed ? 'Render cases added' : 'Already there');
