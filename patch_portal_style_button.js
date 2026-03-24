#!/usr/bin/env node
// patch_portal_style_button.js
// Fixes: 1) Arrow direction  2) Style button opens real CSS controls panel
// Run from ~/projects/talentos:  node patch_portal_style_button.js

const fs = require('fs'), path = require('path');
const PORTALS = path.resolve('client/src/Portals.jsx');

if (!fs.existsSync(PORTALS)) { console.log('❌ Portals.jsx not found'); process.exit(1); }
let src = fs.readFileSync(PORTALS, 'utf8');
let count = 0;

function patch(label, oldStr, newStr) {
  if (!src.includes(oldStr)) { console.log(`SKIP ${label} — anchor not found`); return; }
  src = src.replace(oldStr, newStr);
  count++;
  console.log(`OK   ${label}`);
}

// ── FIX 1: Arrow direction ──────────────────────────────────────────────────
// The Ic component doesn't accept a style prop, so transform:rotate is ignored.
// Fix: wrap the icon in a span with the rotation.
patch('1. Fix up-arrow rotation',
  `<Ic n="chevD" s={12} c={C.text2} style={{transform:"rotate(180deg)"}}/>`,
  `<span style={{display:"flex",transform:"rotate(180deg)"}}><Ic n="chevD" s={12} c={C.text2}/></span>`
);

// ── FIX 2: Replace RowSettings with a proper CSS styling panel ──────────────
// First, find and replace the entire RowSettings component.

const OLD_ROW_SETTINGS_START = `// ─── Row Settings Popover ─────────────────────────────────────────────────────
const RowSettings = ({ row, onChange, onClose }) => {`;

// Find where RowSettings ends (before the next component or section)
const rowSettingsStartIdx = src.indexOf(OLD_ROW_SETTINGS_START);
if (rowSettingsStartIdx === -1) {
  console.log('SKIP 2. RowSettings replacement — component not found');
} else {
  // Find the closing of RowSettings — it ends with `};` before the next component
  // Look for the next component definition after RowSettings
  const searchAfter = rowSettingsStartIdx + OLD_ROW_SETTINGS_START.length;
  const nextComponent = src.indexOf('\n// ─── Canvas Row', searchAfter);
  
  if (nextComponent === -1) {
    console.log('SKIP 2. RowSettings — could not find end boundary');
  } else {
    const oldRowSettings = src.substring(rowSettingsStartIdx, nextComponent);
    
    const newRowSettings = `// ─── Row Style Panel ──────────────────────────────────────────────────────────
const RowSettings = ({ row, onChange, onClose }) => {
  const set = (k,v) => onChange({...row,[k]:v});
  const style = row.style || {};
  const setStyle = (k,v) => onChange({...row, style:{...style,[k]:v}});
  const inp = {padding:"7px 10px",borderRadius:8,border:\`1px solid \${C.border}\`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};
  const lbl = t => <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>{t}</div>;
  const [tab, setTab] = useState("layout");

  const PADDING_OPTIONS = [
    {id:"none",label:"None",val:"0px"},
    {id:"sm",label:"S",val:"24px"},
    {id:"md",label:"M",val:"56px"},
    {id:"lg",label:"L",val:"96px"},
    {id:"xl",label:"XL",val:"140px"},
  ];

  const PRESETS = [
    {id:"1",label:"Full",cols:1},
    {id:"1-1",label:"½ + ½",cols:2},
    {id:"1-2",label:"⅓ + ⅔",cols:2},
    {id:"2-1",label:"⅔ + ⅓",cols:2},
  ];

  return (
    <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(15,23,41,.3)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        width:420,maxWidth:"90vw",maxHeight:"80vh",background:C.surface,borderRadius:14,
        boxShadow:"0 20px 60px rgba(0,0,0,.2)",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:\`1px solid \${C.border}\`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Ic n="settings" s={14} c={C.accent}/>
            <span style={{fontSize:14,fontWeight:800,color:C.text1}}>Row Style</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,padding:4}}><Ic n="x" s={14}/></button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:\`1px solid \${C.border}\`,flexShrink:0}}>
          {[["layout","Layout"],["spacing","Spacing"],["background","Background"],["advanced","Advanced"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"9px 0",border:"none",
              background:tab===id?C.accentLight:"transparent",color:tab===id?C.accent:C.text3,
              fontSize:11,fontWeight:tab===id?700:500,cursor:"pointer",fontFamily:F,
              borderBottom:\`2px solid \${tab===id?C.accent:"transparent"}\`}}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>

          {/* LAYOUT TAB */}
          {tab==="layout"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            {lbl("Column layout")}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
              {PRESETS.map(p=>(
                <button key={p.id} onClick={()=>{
                  const numCols=p.cols;
                  const cells=Array.from({length:numCols},(_,i)=>row.cells[i]||defaultCell());
                  onChange({...row,preset:p.id,cells});
                }}
                  style={{padding:"10px 6px",borderRadius:8,border:\`2px solid \${row.preset===p.id?C.accent:C.border}\`,
                    background:row.preset===p.id?C.accentLight:C.surface,cursor:"pointer",fontFamily:F,
                    fontSize:11,fontWeight:row.preset===p.id?700:500,color:row.preset===p.id?C.accent:C.text2,textAlign:"center"}}>
                  {p.label}
                </button>
              ))}
            </div>

            {lbl("Content max width")}
            <input value={style.maxWidth||""} onChange={e=>setStyle("maxWidth",e.target.value)}
              placeholder="e.g. 1200px, 960px, 100%" style={inp}/>

            {lbl("Horizontal alignment")}
            <div style={{display:"flex",gap:4}}>
              {["left","center","right"].map(a=>(
                <button key={a} onClick={()=>setStyle("textAlign",a)}
                  style={{flex:1,padding:"7px",borderRadius:7,border:\`1.5px solid \${(style.textAlign||"left")===a?C.accent:C.border}\`,
                    background:(style.textAlign||"left")===a?C.accentLight:"transparent",
                    color:(style.textAlign||"left")===a?C.accent:C.text3,fontSize:11,fontWeight:600,
                    cursor:"pointer",fontFamily:F,textTransform:"capitalize"}}>{a}</button>
              ))}
            </div>
          </div>}

          {/* SPACING TAB */}
          {tab==="spacing"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            {lbl("Vertical padding (top & bottom)")}
            <div style={{display:"flex",gap:4}}>
              {PADDING_OPTIONS.map(p=>(
                <button key={p.id} onClick={()=>set("padding",p.id)}
                  style={{flex:1,padding:"8px 4px",borderRadius:7,border:\`1.5px solid \${row.padding===p.id?C.accent:C.border}\`,
                    background:row.padding===p.id?C.accentLight:"transparent",
                    color:row.padding===p.id?C.accent:C.text3,fontSize:11,fontWeight:600,
                    cursor:"pointer",fontFamily:F}}>{p.label}</button>
              ))}
            </div>

            {lbl("Custom padding (CSS)")}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Top</div>
                <input value={style.paddingTop||""} onChange={e=>setStyle("paddingTop",e.target.value)} placeholder="0px" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Bottom</div>
                <input value={style.paddingBottom||""} onChange={e=>setStyle("paddingBottom",e.target.value)} placeholder="0px" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Left</div>
                <input value={style.paddingLeft||""} onChange={e=>setStyle("paddingLeft",e.target.value)} placeholder="0px" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Right</div>
                <input value={style.paddingRight||""} onChange={e=>setStyle("paddingRight",e.target.value)} placeholder="0px" style={inp}/>
              </div>
            </div>

            {lbl("Margin (CSS)")}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Top</div>
                <input value={style.marginTop||""} onChange={e=>setStyle("marginTop",e.target.value)} placeholder="0px" style={inp}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.text3,marginBottom:3}}>Bottom</div>
                <input value={style.marginBottom||""} onChange={e=>setStyle("marginBottom",e.target.value)} placeholder="0px" style={inp}/>
              </div>
            </div>

            {lbl("Gap between columns")}
            <input value={style.gap||""} onChange={e=>setStyle("gap",e.target.value)} placeholder="16px" style={inp}/>
          </div>}

          {/* BACKGROUND TAB */}
          {tab==="background"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            {lbl("Background colour")}
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="color" value={row.bgColor||"#ffffff"} onChange={e=>set("bgColor",e.target.value)}
                style={{width:36,height:36,border:"none",borderRadius:8,cursor:"pointer",padding:0}}/>
              <input value={row.bgColor||""} onChange={e=>set("bgColor",e.target.value)}
                placeholder="#FFFFFF or transparent" style={{...inp,flex:1}}/>
              {row.bgColor&&<button onClick={()=>set("bgColor","")}
                style={{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:10}}>Clear</button>}
            </div>

            {lbl("Background image URL")}
            <input value={row.bgImage||""} onChange={e=>set("bgImage",e.target.value)}
              placeholder="https://images.unsplash.com/..." style={inp}/>

            {row.bgImage&&<>
              {lbl("Overlay darkness")}
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <input type="range" min={0} max={90} value={row.overlayOpacity||0}
                  onChange={e=>set("overlayOpacity",+e.target.value)}
                  style={{flex:1,accentColor:C.accent}}/>
                <span style={{fontSize:12,color:C.text2,minWidth:30,textAlign:"right"}}>{row.overlayOpacity||0}%</span>
              </div>
            </>}

            {lbl("Border radius")}
            <input value={style.borderRadius||""} onChange={e=>setStyle("borderRadius",e.target.value)}
              placeholder="0px, 12px, 20px" style={inp}/>

            {lbl("Box shadow")}
            <input value={style.boxShadow||""} onChange={e=>setStyle("boxShadow",e.target.value)}
              placeholder="0 4px 20px rgba(0,0,0,.1)" style={inp}/>
          </div>}

          {/* ADVANCED TAB */}
          {tab==="advanced"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
            {lbl("CSS class name")}
            <input value={style.className||""} onChange={e=>setStyle("className",e.target.value)}
              placeholder="custom-hero-section" style={inp}/>

            {lbl("HTML ID")}
            <input value={style.htmlId||""} onChange={e=>setStyle("htmlId",e.target.value)}
              placeholder="hero-section" style={inp}/>

            {lbl("Overflow")}
            <div style={{display:"flex",gap:4}}>
              {["visible","hidden","auto"].map(v=>(
                <button key={v} onClick={()=>setStyle("overflow",v)}
                  style={{flex:1,padding:"7px",borderRadius:7,border:\`1.5px solid \${(style.overflow||"visible")===v?C.accent:C.border}\`,
                    background:(style.overflow||"visible")===v?C.accentLight:"transparent",
                    color:(style.overflow||"visible")===v?C.accent:C.text3,fontSize:11,fontWeight:600,
                    cursor:"pointer",fontFamily:F}}>{v}</button>
              ))}
            </div>

            {lbl("Min height")}
            <input value={style.minHeight||""} onChange={e=>setStyle("minHeight",e.target.value)}
              placeholder="400px, 100vh" style={inp}/>

            {lbl("Z-index")}
            <input type="number" value={style.zIndex||""} onChange={e=>setStyle("zIndex",e.target.value)}
              placeholder="auto" style={inp}/>

            {lbl("Conditional visibility")}
            <div style={{display:"flex",gap:8}}>
              <input value={row.condition?.param||""} onChange={e=>set("condition",{...row.condition,param:e.target.value})}
                placeholder="URL param (e.g. dept)" style={{...inp,flex:1}}/>
              <input value={row.condition?.value||""} onChange={e=>set("condition",{...row.condition,value:e.target.value})}
                placeholder="Value (e.g. engineering)" style={{...inp,flex:1}}/>
            </div>
            {(row.condition?.param||row.condition?.value)&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:C.accent}}>Visible when ?{row.condition?.param}={row.condition?.value}</span>
                <button onClick={()=>set("condition",null)}
                  style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:10}}>Clear</button>
              </div>
            )}
          </div>}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 18px",borderTop:\`1px solid \${C.border}\`,display:"flex",justifyContent:"flex-end",flexShrink:0}}>
          <button onClick={onClose}
            style={{padding:"7px 18px",borderRadius:8,background:C.accent,border:"none",color:"white",
              fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>Done</button>
        </div>
      </div>
    </div>
  );
};

`;
    
    src = src.replace(oldRowSettings, newRowSettings);
    count++;
    console.log('OK   2. RowSettings replaced with full CSS styling panel');
  }
}

// ── FIX 3: Apply row.style to the rendered row ─────────────────────────────
// The CanvasRow content div needs to apply the custom style values
patch('3. Apply row.style to content div',
  `<div style={{position:"relative",padding:\`\${padding} \${isEditing?"16px":"0"}\`,maxWidth:theme.maxWidth||"1200px",margin:"0 auto",boxSizing:"border-box"}}>`,
  `<div style={{position:"relative",padding:\`\${padding} \${isEditing?"16px":"0"}\`,maxWidth:(row.style?.maxWidth)||theme.maxWidth||"1200px",margin:"0 auto",boxSizing:"border-box",textAlign:row.style?.textAlign||undefined,...(row.style?.paddingTop?{paddingTop:row.style.paddingTop}:{}),...(row.style?.paddingBottom?{paddingBottom:row.style.paddingBottom}:{}),...(row.style?.paddingLeft?{paddingLeft:row.style.paddingLeft}:{}),...(row.style?.paddingRight?{paddingRight:row.style.paddingRight}:{}),...(row.style?.borderRadius?{borderRadius:row.style.borderRadius}:{}),...(row.style?.boxShadow?{boxShadow:row.style.boxShadow}:{}),...(row.style?.minHeight?{minHeight:row.style.minHeight}:{})}}>`
);

// ── FIX 4: Apply margin from row.style to the row wrapper ────────────────
patch('4. Apply row margin',
  `background:row.bgImage?\`url(\${row.bgImage}) center/cover no-repeat\`:(row.bgColor||"transparent"),
        cursor:isEditing?"grab":"default",transition:"border-color .12s"}}`,
  `background:row.bgImage?\`url(\${row.bgImage}) center/cover no-repeat\`:(row.bgColor||"transparent"),
        cursor:isEditing?"grab":"default",transition:"border-color .12s",
        ...(row.style?.marginTop?{marginTop:row.style.marginTop}:{}),
        ...(row.style?.marginBottom?{marginBottom:row.style.marginBottom}:{}),
        ...(row.style?.overflow?{overflow:row.style.overflow}:{}),
        ...(row.style?.zIndex?{zIndex:row.style.zIndex}:{})}}`
);

// ── FIX 5: Apply gap from row.style to the cells flex container ──────────
patch('5. Apply column gap',
  `<div style={{display:"flex",gap:16,alignItems:"stretch",flexWrap:"wrap"}}>`,
  `<div style={{display:"flex",gap:row.style?.gap||16,alignItems:"stretch",flexWrap:"wrap"}}>`
);

// ── FIX 6: Also apply row.style in the PortalPageRenderer ────────────────
// This ensures the published portal also respects the styles
// (This would need a separate patch for PortalPageRenderer.jsx — noted below)

fs.writeFileSync(PORTALS, src);
console.log(`\n✅ Done — ${count} patches applied`);
console.log('');
console.log('Changes:');
console.log('   1. Up arrow now correctly points upward (wrapped in rotated span)');
console.log('   2. Style button opens a proper modal with 4 tabs:');
console.log('      • Layout — column preset, max-width, text alignment');
console.log('      • Spacing — vertical padding presets + custom 4-way padding, margin, column gap');
console.log('      • Background — colour picker, image URL, overlay slider, border-radius, box-shadow');
console.log('      • Advanced — CSS class, HTML ID, overflow, min-height, z-index, conditional visibility');
console.log('   3. Row styles applied to rendered rows (max-width, padding, margin, shadow, etc.)');
console.log('');
console.log('NOTE: To apply styles in the published portal too, also update PortalPageRenderer.jsx');
console.log('      to read row.style properties the same way.');
console.log('');
console.log('Run:');
console.log('  git add -A && git commit -m "feat: portal builder style panel with CSS controls" && git push origin main');
