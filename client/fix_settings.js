const fs = require('fs');
let f = fs.readFileSync('src/Settings.jsx','utf8');

// Add imports if missing
if (!f.includes('BrandKitSettings')) {
  const importLine = 'import BrandKitSettings from "./settings/BrandKitSettings.jsx";\nimport EmailTemplateBuilder from "./settings/EmailTemplateBuilder.jsx";';
  // Insert after the first import line
  f = f.replace(/^(import .+?\n)/m, '$1' + importLine + '\n');
}

// Add nav items — find the SYSTEM_ADMIN sections array
if (!f.includes("'brand-kits'")) {
  f = f.replace(
    /(\{ id: 'audit-log')/,
    "{ id: 'brand-kits', label: 'Brand Kits', icon: 'palette' },\n  { id: 'email-templates', label: 'Email Templates', icon: 'mail' },\n  $1"
  );
}

// Add render cases
if (!f.includes('BrandKitSettings')) {
  f = f.replace(
    /(\{active === 'audit-log')/,
    "{active === 'brand-kits' && <BrandKitSettings environment={environment} />}\n        {active === 'email-templates' && <EmailTemplateBuilder environment={environment} />}\n        $1"
  );
}

fs.writeFileSync('src/Settings.jsx', f);
console.log('Done - check Settings.jsx');
