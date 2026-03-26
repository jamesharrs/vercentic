const fs = require('fs');
let f = fs.readFileSync('src/Settings.jsx','utf8');
if (!f.includes('BrandKitSettings')) {
  // Add imports after existing settings imports
  f = f.replace(
    'import DataImportSettings',
    'import BrandKitSettings from "./settings/BrandKitSettings.jsx";\nimport EmailTemplateBuilder from "./settings/EmailTemplateBuilder.jsx";\nimport DataImportSettings'
  );
  fs.writeFileSync('src/Settings.jsx', f);
  console.log('Imports added');
} else {
  console.log('Already imported');
}
