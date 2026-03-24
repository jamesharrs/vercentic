const fs = require('fs');
let f = fs.readFileSync('index.js','utf8');
if (!f.includes('data_import')) {
  f = f.replace(
    "app.use('/api/duplicates',",
    "app.use('/api/data-import',    require('./routes/data_import'));\napp.use('/api/records',          require('./routes/bulk_actions'));\napp.use('/api/screening',        require('./routes/screening'));\napp.use('/api/duplicates',"
  );
  fs.writeFileSync('index.js', f);
  console.log('Routes registered');
} else {
  console.log('Routes already registered');
}
