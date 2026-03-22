// fix_statcard.js — run from ~/projects/talentos
// node fix_statcard.js

const fs = require('fs');
const filePath = 'client/src/AdminDashboard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace just the inner layout of StatCard
// Old: label top-right, number below, icon top-right corner
// New: icon left, number+label right side-by-side

const oldInner = `    onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)")}
    onMouseLeave={e=>onClick&&(e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)")}>
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
      <div style={{ width:34, height:34, borderRadius:10, background:\`\${color}18\`, display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n={icon} s={16} c={color}/></div>
    </div>
    <div style={{ fontSize:28, fontWeight:800, color:C.text1, lineHeight:1 }}>{value??'—'}</div>
    <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
      {trend!=null&&<span style={{ fontSize:11, fontWeight:700, color:trend>=0?C.green:C.red, background:trend>=0?"#f0fdf4":"#fef2f2", padding:"2px 7px", borderRadius:99 }}>{trend>=0?"↑":"↓"} {Math.abs(trend)}%</span>}
      {sub&&<span style={{ fontSize:12, color:C.text3 }}>{sub}</span>}
    </div>
  </div>
);`;

const newInner = `    onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)")}
    onMouseLeave={e=>onClick&&(e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)")}>
    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
      <div style={{ width:46, height:46, borderRadius:12, background:\`\${color}15\`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={icon} s={22} c={color}/></div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:28, fontWeight:800, color:C.text1, lineHeight:1 }}>{value??'—'}</div>
        <div style={{ fontSize:12, fontWeight:600, color:C.text2, marginTop:4 }}>{label}</div>
      </div>
    </div>
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      {trend!=null&&<span style={{ fontSize:11, fontWeight:700, color:trend>=0?C.green:C.red, background:trend>=0?"#f0fdf4":"#fef2f2", padding:"2px 7px", borderRadius:99 }}>{trend>=0?"↑":"↓"} {Math.abs(trend)}%</span>}
      {sub&&<span style={{ fontSize:12, color:C.text3 }}>{sub}</span>}
    </div>
  </div>
);`;

if (content.includes(oldInner)) {
  fs.writeFileSync(filePath, content.replace(oldInner, newInner));
  console.log('✅ StatCard layout updated — icon and number now side by side');
} else {
  console.log('❌ Pattern not found. The file may have different whitespace.');
  console.log('   Open client/src/AdminDashboard.jsx and manually update the StatCard component.');
  console.log('   Change the inner div structure to have the icon and value in a flex row.');
}
