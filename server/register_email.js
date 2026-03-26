const fs = require('fs');
let f = fs.readFileSync('index.js','utf8');
if (!f.includes('email-builder')) {
  f = f.replace(
    "app.use('/api/brand-kits',",
    "app.use('/api/email-builder',     require('./routes/email_builder'));\napp.use('/api/brand-kits',"
  );
  fs.writeFileSync('index.js', f);
  console.log('Route registered');
} else {
  console.log('Already registered');
}
