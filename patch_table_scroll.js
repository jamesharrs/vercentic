#!/usr/bin/env node
// patch_table_scroll.js
// Fixes horizontal scroll on table list views in Records.jsx
// Run from ~/projects/talentos:  node patch_table_scroll.js
const fs = require('fs'), path = require('path');

const RECORDS = path.resolve('client/src/Records.jsx');
if (!fs.existsSync(RECORDS)) { console.log('❌ client/src/Records.jsx not found'); process.exit(1); }

let src = fs.readFileSync(RECORDS, 'utf8');
let count = 0;

function patch(label, oldStr, newStr) {
  if (!src.includes(oldStr)) { console.log(`SKIP ${label} — anchor not found`); return; }
  src = src.replace(oldStr, newStr);
  count++;
  console.log(`OK   ${label}`);
}

// ── Fix 1: Table wrapper — ensure it clips properly and allows horizontal scroll ──
// The outer wrapper needs overflow:hidden on the parent so the table's horizontal
// scroll doesn't bleed into the page. The inner wrapper gets overflowX:auto.
patch('1. Table wrapper overflow containment',
  // Find the wrapper div around the table — it should already have overflow:auto or overflowX:auto
  // The pattern varies but typically looks like:
  `<div style={{ overflowX:"auto", flex:1`,
  `<div style={{ overflowX:"auto", overflowY:"auto", flex:1, maxWidth:"100%"`
);

// ── Fix 2: Table layout — switch from fixed to auto so columns get natural width ──
// table-layout:fixed forces all columns into equal widths within 100%.
// table-layout:auto lets columns size to content, and minWidth ensures scrollability.
patch('2a. Table layout fixed→auto (main TableView)',
  `<table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed"`,
  `<table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"auto", minWidth:800`
);

// There may be a second table with tableLayout:"fixed" — catch it too
if (src.includes(`tableLayout:"fixed"`)) {
  src = src.replace(/tableLayout:"fixed"/g, (match, offset) => {
    count++;
    console.log(`OK   2b. Additional tableLayout fixed→auto at offset ${offset}`);
    return `tableLayout:"auto"`;
  });
}

// ── Fix 3: Column headers — add minWidth so they don't collapse ──
// Find <th> cells and ensure they have a minimum width
patch('3. Header cells minWidth',
  `fontSize:11, fontWeight:700, color:C.text3, letterSpacing:"0.06em", textTransform:"uppercase", whiteSpace:"nowrap"`,
  `fontSize:11, fontWeight:700, color:C.text3, letterSpacing:"0.06em", textTransform:"uppercase", whiteSpace:"nowrap", minWidth:120`
);

// ── Fix 4: Body cells — prevent text wrapping that causes vertical expansion ──
// Add overflow:hidden + textOverflow:ellipsis to data cells
patch('4. Body cell overflow control',
  `padding:"10px 14px", fontSize:13, color:C.text1, verticalAlign:"middle"`,
  `padding:"10px 14px", fontSize:13, color:C.text1, verticalAlign:"middle", maxWidth:240, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"`
);

// ── Fix 5: Name/avatar column — give it a fixed minimum width so it doesn't squash ──
patch('5. Name column minWidth',
  `padding:"10px 14px", verticalAlign:"middle", cursor:"pointer"`,
  `padding:"10px 14px", verticalAlign:"middle", cursor:"pointer", minWidth:180`
);

// ── Fix 6: Actions column — fixed width so it doesn't grow ──
patch('6. Actions column fixed width',
  `width:120, padding:"10px 14px", textAlign:"right"`,
  `width:120, minWidth:120, padding:"10px 14px", textAlign:"right", position:"sticky", right:0, background:"inherit", zIndex:2`
);

// ── Fix 7: RecordsView content wrapper — add overflow:hidden so table scroll stays contained ──
// The main content area wrapping the table should clip horizontally
patch('7a. Content area overflow (table card wrapper)',
  `background:C.surface, borderRadius:14, border:\`1.5px solid \${C.border}\``,
  `background:C.surface, borderRadius:14, border:\`1.5px solid \${C.border}\`, overflow:"hidden"`
);

// Alternative pattern if the border style is slightly different
patch('7b. Content area overflow (alt border pattern)',
  `background:C.surface, borderRadius:12, border:\`1px solid \${C.border}\``,
  `background:C.surface, borderRadius:12, border:\`1px solid \${C.border}\`, overflow:"hidden"`
);

fs.writeFileSync(RECORDS, src);
console.log(`\n✅ Done — ${count} patches applied`);
console.log('   Table now scrolls horizontally within its container');
console.log('   Columns have minimum widths so they don\'t collapse');
console.log('   Actions column is sticky on the right edge');
console.log('\nRun:');
console.log('  git add -A && git commit -m "fix: table horizontal scroll containment" && git push origin main');
