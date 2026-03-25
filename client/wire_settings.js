const fs = require('fs');
let f = fs.readFileSync('src/Settings.jsx','utf8');

// Add nav items if not already there
if (!f.includes('brand-kits')) {
  f = f.replace(
    "{ id: 'workflows',",
    "{ id: 'brand-kits', label: 'Brand Kits', icon: 'palette' },\n  { id: 'email-templates', label: 'Email Templates', icon: 'mail' },\n  { id: 'workflows',"
  );
}

// Add render cases if not already there
if (!f.includes('BrandKitSettings')) {
  f = f.replace(
    "{active === 'workflows'",
    "{active === 'brand-kits' && <BrandKitSettings environment={environment} />}\n        {active === 'email-templates' && <EmailTemplateBuilder environment={environment} />}\n        {active === 'workflows'"
  );
}

fs.writeFileSync('src/Settings.jsx', f);
console.log('Done');
