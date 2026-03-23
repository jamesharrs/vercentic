#!/usr/bin/env node
// patch-ui-fixes.js — applies all 3 UI fixes in one shot
// Run from ~/projects/talentos: node patch-ui-fixes.js

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// 1. RECORDS.JSX — ActionBtn + destructive buttons + SuggestedActions
// ─────────────────────────────────────────────────────────────────────────────
const RECORDS = path.join(__dirname, 'client/src/Records.jsx');
let rec = fs.readFileSync(RECORDS, 'utf8');

// ── 1a. ActionBtn redesign ──────────────────────────────────────────────────
rec = rec.replace(
  `  const ActionBtn = ({ icon, label, onClick, accent }) => (
    <button onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 13px", borderRadius:9,
        border:\`1.5px solid \${accent ? C.accent : C.border}\`,
        background: accent ? C.accentLight : C.bg,
        color: accent ? C.accent : C.text2,
        fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:F, whiteSpace:"nowrap",
        transition:"all .12s" }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=accent?C.accent:C.border; e.currentTarget.style.color=accent?C.accent:C.text2; }}>
      <Ic n={icon} s={13} c="currentColor"/> {label}
    </button>
  );`,
  `  const ActionBtn = ({ icon, label, onClick, accent, danger }) => (
    <button onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:20,
        border:"none",
        background: danger ? "#FEF2F2" : accent ? C.accentLight : "#F1F5F9",
        color: danger ? "#DC2626" : accent ? C.accent : "#475569",
        fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:F, whiteSpace:"nowrap",
        transition:"all .15s", letterSpacing:"0.01em",
        boxShadow:"0 1px 2px rgba(0,0,0,0.06)" }}
      onMouseEnter={e=>{ e.currentTarget.style.background=danger?"#FEE2E2":accent?\`\${C.accent}25\`:"#E2E8F0"; e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.10)"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.background=danger?"#FEF2F2":accent?C.accentLight:"#F1F5F9"; e.currentTarget.style.boxShadow="0 1px 2px rgba(0,0,0,0.06)"; e.currentTarget.style.transform="translateY(0)"; }}>
      <Ic n={icon} s={12} c="currentColor"/> {label}
    </button>
  );`
);

// ── 1b. Destructive + close buttons ────────────────────────────────────────
const OLD_DESTRUCT = `        {/* Destructive + close — far right, always visible */}
        <div style={{ display:"flex", gap:4, marginLeft:8 }}>
          <Btn v="danger" sz="sm" icon="trash" onClick={()=>onDelete(record.id)}/>
          <Btn v="ghost"  sz="sm" icon="x"     onClick={onClose}/>
        </div>`;

const NEW_DESTRUCT = `        {/* Destructive + close — far right, always visible */}
        <div style={{ display:"flex", gap:2, marginLeft:8, alignItems:"center" }}>
          <div style={{ width:1, height:20, background:C.border, marginRight:6, flexShrink:0 }}/>
          <button onClick={()=>onDelete(record.id)} title="Delete record"
            style={{ width:32, height:32, borderRadius:8, border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", color:"#9CA3AF" }}
            onMouseEnter={e=>{ e.currentTarget.style.background="#FEE2E2"; e.currentTarget.style.color="#DC2626"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#9CA3AF"; }}>
            <Ic n="trash" s={14} c="currentColor"/>
          </button>
          <button onClick={onClose} title="Close"
            style={{ width:32, height:32, borderRadius:8, border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", color:"#9CA3AF" }}
            onMouseEnter={e=>{ e.currentTarget.style.background="#F1F5F9"; e.currentTarget.style.color="#475569"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#9CA3AF"; }}>
            <Ic n="x" s={14} c="currentColor"/>
          </button>
        </div>`;

if (rec.includes(OLD_DESTRUCT)) { rec = rec.replace(OLD_DESTRUCT, NEW_DESTRUCT); console.log('OK   destructive buttons'); }
else console.log('SKIP destructive buttons (not found)');

// ── 1c. SuggestedActions component ─────────────────────────────────────────
const START = 'const SuggestedActions =';
const startIdx = rec.indexOf(START);
if (startIdx !== -1) {
  let depth=0, inC=false, endIdx=-1, i=startIdx;
  while (i<rec.length) {
    if (rec[i]==='{'){depth++;inC=true;}
    if (rec[i]==='}'){depth--;if(inC&&depth===0){let j=i+1;while(j<rec.length&&(rec[j]===';'||rec[j]===' '||rec[j]==='\n'||rec[j]==='\r'))j++;endIdx=j;break;}}
    i++;
  }
  if (endIdx!==-1) {
    const newSA = `const SuggestedActions = ({ record, environment, onAction }) => {
  const [actions, setActions]   = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered]   = useState(null);
  useEffect(() => {
    if (!record?.id || !environment?.id) return;
    fetch(\`/api/records/\${record.id}/suggested-actions?environment_id=\${environment.id}\`)
      .then(r => r.json()).then(d => { if (Array.isArray(d) && d.length) setActions(d); }).catch(()=>{});
  }, [record?.id, environment?.id]);
  if (!actions.length || dismissed) return null;
  const actionIcon = (type) => {
    const map = {
      email:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
      call:"M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .73h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
      note:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
      task:"M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
    };
    const t=(type||"").toLowerCase();
    for(const [k,v] of Object.entries(map)){if(t.includes(k))return v;}
    return "M12 5v14M5 12h14";
  };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 16px 7px 14px",
      background:"linear-gradient(90deg,#FFFBEB 0%,#FEFCE8 100%)",
      borderBottom:"1px solid #FDE68A", flexShrink:0, overflowX:"auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, marginRight:4 }}>
        <div style={{ width:22, height:22, borderRadius:6, flexShrink:0,
          background:"linear-gradient(135deg,#F59E0B,#EF4444)",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M12 2L9.1 9.1 2 12l7.1 2.9L12 22l2.9-7.1L22 12l-7.1-2.9L12 2z"/>
          </svg>
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:"#92400E", letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>AI Suggested</span>
        <div style={{ width:1, height:14, background:"#FCD34D", marginLeft:2, flexShrink:0 }}/>
      </div>
      <div style={{ display:"flex", gap:5, alignItems:"center", flex:1 }}>
        {actions.map((action, idx) => (
          <button key={idx} onClick={()=>onAction?.(action)}
            onMouseEnter={()=>setHovered(idx)} onMouseLeave={()=>setHovered(null)}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px 5px 9px",
              borderRadius:20, border:\`1.5px solid \${hovered===idx?"#D97706":"#FCD34D"}\`,
              background:hovered===idx?"#FEF3C7":"white",
              color:hovered===idx?"#92400E":"#B45309",
              fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
              whiteSpace:"nowrap", transition:"all .12s",
              boxShadow:hovered===idx?"0 2px 8px rgba(217,119,6,.15)":"0 1px 2px rgba(0,0,0,.06)",
              transform:hovered===idx?"translateY(-1px)":"translateY(0)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={actionIcon(action.type)}/>
            </svg>
            {action.label||action.title||"Take action"}
          </button>
        ))}
      </div>
      <button onClick={()=>setDismissed(true)} title="Dismiss"
        style={{ flexShrink:0, marginLeft:4, width:22, height:22, borderRadius:6,
          border:"none", background:"transparent", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", color:"#D97706", transition:"all .12s" }}
        onMouseEnter={e=>{e.currentTarget.style.background="#FDE68A";}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
};
`;
    rec = rec.slice(0,startIdx) + newSA + rec.slice(endIdx);
    console.log('OK   SuggestedActions redesigned');
  }
} else console.log('SKIP SuggestedActions (not found)');

fs.writeFileSync(RECORDS, rec);
console.log('OK   Records.jsx saved');

// ─────────────────────────────────────────────────────────────────────────────
// 2. RECENTHISTORY.JSX — history button icon style
// ─────────────────────────────────────────────────────────────────────────────
const HIST = path.join(__dirname, 'client/src/RecentHistory.jsx');
let hist = fs.readFileSync(HIST, 'utf8');

const OLD_HIST_BTN = `      <button
        onClick={onToggle}
        title={isOpen ? "Close history" : "View history"}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 10px", borderRadius: 8, border: "none",
          background: isOpen ? "var(--t-accent-light, #eef1ff)" : "transparent",
          color: isOpen ? "var(--t-accent, #4361EE)" : "var(--t-text3)",
          cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500,
          transition: "all 0.12s", flexShrink: 0,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {history.length > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700 }}>{history.length}</span>
        )}
      </button>`;

const NEW_HIST_BTN = `      <button
        onClick={onToggle}
        title={isOpen ? "Close history" : "View history"}
        style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 34, height: 34, borderRadius: 8, border: "none",
          background: isOpen ? "var(--t-accent-light, #eef1ff)" : "transparent",
          color: isOpen ? "var(--t-accent, #4361EE)" : "var(--t-text3)",
          cursor: "pointer", transition: "all 0.12s", flexShrink: 0,
        }}
        onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.background = "var(--t-surface2, #f1f5f9)"; e.currentTarget.style.color = "var(--t-text1)"; } }}
        onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text3)"; } }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {history.length > 0 && (
          <span style={{
            position: "absolute", top: 4, right: 4,
            minWidth: 14, height: 14, borderRadius: 99,
            background: "var(--t-accent, #4361EE)", color: "#fff",
            fontSize: 8, fontWeight: 800, lineHeight: "14px",
            textAlign: "center", padding: "0 3px", pointerEvents: "none",
          }}>{history.length > 9 ? "9+" : history.length}</span>
        )}
      </button>`;

if (hist.includes(OLD_HIST_BTN)) { hist = hist.replace(OLD_HIST_BTN, NEW_HIST_BTN); console.log('OK   history button'); }
else console.log('SKIP history button (not found)');

fs.writeFileSync(HIST, hist);
console.log('OK   RecentHistory.jsx saved');
console.log('\n✅ All patches applied! Now run: git add -A && git commit -m "fix: pill buttons, history icon badge, AI suggested actions bar" && git push origin main');
