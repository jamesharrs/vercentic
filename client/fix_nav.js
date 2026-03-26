const fs = require('fs');
let f = fs.readFileSync('src/Settings.jsx','utf8');

if (!f.includes("'brand_kits'")) {
  f = f.replace(
    '{ id:"workflows", icon:"workflow", label:"Workflows" },',
    '{ id:"brand_kits",      icon:"palette",  label:"Brand Kits" },\n      { id:"email_templates", icon:"mail",     label:"Email Templates" },\n      { id:"workflows", icon:"workflow", label:"Workflows" },'
  );
  fs.writeFileSync('src/Settings.jsx', f);
  console.log('Nav items added');
} else {
  console.log('Already there');
}
