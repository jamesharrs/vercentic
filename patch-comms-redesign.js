#!/usr/bin/env node
/**
 * Communications Panel Visual Redesign
 * Patches client/src/Communications.jsx
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'client', 'src', 'Communications.jsx');
if (!fs.existsSync(FILE)) {
  console.error('Cannot find', FILE);
  process.exit(1);
}

let src = fs.readFileSync(FILE, 'utf8');
fs.writeFileSync(FILE + '.bak', src);
console.log('Backed up to Communications.jsx.bak');

// ─── 1. Replace FilterBar ──────────────────────────────────────────
const NEW_FILTERBAR = `// ─── Unified Filter Strip ──────────────────────────────────────────
function FilterBar({ activeType, setActiveType, search, setSearch, total, counts }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const types = ["all", "email", "sms", "whatsapp", "call"];

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
      <div style={{ display:"flex", gap:2, flex:1 }}>
        {types.map(t => {
          const count = t === "all" ? total : (counts[t] || 0);
          const meta = TYPE_META[t] || {};
          const active = activeType === t;
          return (
            <button key={t} onClick={() => setActiveType(t)}
              title={\`\${t === "all" ? "All" : meta.label}\${count ? \` (\${count})\` : ""}\`}
              style={{
                display:"flex", alignItems:"center", gap:4,
                padding: active ? "4px 10px" : "4px 8px",
                borderRadius: 8, border:"none",
                background: active ? (meta.bg || "#eef1ff") : "transparent",
                color: active ? (meta.color || C.accent) : C.text3,
                fontSize: 11, fontWeight: active ? 700 : 500,
                cursor: "pointer", transition: "all .12s", whiteSpace: "nowrap",
              }}>
              <TypeIcon type={t === "all" ? "email" : t} size={13}
                color={active ? (meta.color || C.accent) : C.text3}/>
              {t === "all" ? "All" : ""}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 16, textAlign: "center",
                  borderRadius: 99, padding: "0 4px", lineHeight: "16px",
                  background: active ? (meta.color || C.accent) : "transparent",
                  color: active ? "#fff" : C.text3,
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display:"flex", alignItems:"center", position:"relative" }}>
        {searchOpen ? (
          <div style={{ display:"flex", alignItems:"center", gap:4, background:"#f8f9fc",
            border:\`1.5px solid \${C.border}\`, borderRadius:8, padding:"3px 8px", minWidth:180 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round">
              <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            <input ref={searchRef} value={search}
              onChange={e => setSearch(e.target.value)}
              onBlur={() => { if (!search) setSearchOpen(false); }}
              onKeyDown={e => { if (e.key === "Escape") { setSearch(""); setSearchOpen(false); } }}
              placeholder="Search…"
              style={{ border:"none", outline:"none", fontSize:12, background:"transparent",
                color:C.text1, width:140, fontFamily:"inherit" }}/>
            {search && (
              <button onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:0, display:"flex" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} title="Search communications"
            style={{ display:"flex", alignItems:"center", justifyContent:"center",
              width:28, height:28, borderRadius:7, border:\`1px solid \${C.border}\`,
              background:"transparent", cursor:"pointer", color:C.text3 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
`;

// Find FilterBar function boundaries
const fbComment = src.indexOf('// ─── Search + Filter Bar');
const fbFunc = src.indexOf('function FilterBar(');
const fbStart = fbComment !== -1 && fbComment > fbFunc - 200 ? fbComment : fbFunc;
if (fbFunc === -1) { console.error('❌ Could not find FilterBar'); }
else {
  let depth = 0, i = src.indexOf('{', fbFunc);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  src = src.slice(0, fbStart) + NEW_FILTERBAR + src.slice(i + 2);
  console.log('✅ FilterBar replaced');
}

// ─── 2. Replace CommItem ──────────────────────────────────────────
const NEW_COMMITEM = `// ─── Timeline Item ────────────────────────────────────────────────
function CommItem({ item, onClick }) {
  const meta = TYPE_META[item.type] || {};
  const dir  = DIR_META[item.direction] || {};
  const borderColor = meta.color || C.accent;

  const resolveVars = (text) => {
    if (!text) return text;
    return text
      .replace(/\\{\\{candidate_name\\}\\}/g, item._personName || "")
      .replace(/\\{\\{job_title\\}\\}/g, item._jobTitle || "")
      .replace(/\\{\\{company\\}\\}/g, item._company || "")
      .replace(/\\{\\{\\w+\\}\\}/g, "");
  };

  const subject = resolveVars(
    item.subject || (item.type === "call"
      ? \\\`Call\\\${item.outcome ? \\\` — \\\${item.outcome.replace("_", " ")}\\\` : ""}\\\`
      : \\\`\\\${meta.label}\\\`)
  );
  const preview = resolveVars(item.body);

  return (
    <div onClick={() => onClick(item)}
      style={{
        display: "flex", padding: "10px 0", cursor: "pointer",
        borderBottom: \\\`1px solid \\\${C.border}\\\`, transition: "background .1s",
        borderLeft: \\\`3px solid \\\${borderColor}\\\`, paddingLeft: 12, marginLeft: -1,
      }}
      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
            <TypeIcon type={item.type} size={13} color={meta.color}/>
            <span style={{ fontWeight: 600, fontSize: 13, color: C.text1,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subject}
            </span>
          </div>
          <span style={{ fontSize: 11, color: C.text3, whiteSpace: "nowrap", flexShrink: 0 }}>
            {fmtDate(item.created_at)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: dir.color, fontWeight: 600, flexShrink: 0 }}>
            {dir.badge} {dir.label}
          </span>
          {isAiGenerated(item) && <AiBadge label="AI" tooltip="Generated or sent by an AI agent"/>}
          {item.related_record_id && (
            <span style={{ fontSize: 9, background: "#EFF6FF", color: "#1D4ED8",
              border: "1px solid #BFDBFE", borderRadius: 6,
              padding: "0px 5px", fontWeight: 700, lineHeight: "16px" }}>
              Application
            </span>
          )}
          {item.type === "call" && item.duration_seconds && (
            <span style={{ fontSize: 11, color: C.text3 }}>· {fmtDuration(item.duration_seconds)}</span>
          )}
          {preview && (
            <span style={{ fontSize: 12, color: C.text3, whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
              · {preview.slice(0, 60)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
`;

const ciComment = src.indexOf('// ─── Timeline Item');
const ciFunc = src.indexOf('function CommItem(');
if (ciFunc === -1) { console.error('❌ Could not find CommItem'); }
else {
  const ciStart = ciComment !== -1 && ciComment > ciFunc - 200 ? ciComment : ciFunc;
  let depth = 0, i = src.indexOf('{', ciFunc);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  src = src.slice(0, ciStart) + NEW_COMMITEM + src.slice(i + 2);
  console.log('✅ CommItem replaced');
}

// ─── 3. Slim context tabs ─────────────────────────────────────────
src = src.replace(/fontSize: 11, fontWeight: activeContext === tab\.id \?/g,
  'fontSize: 10, fontWeight: activeContext === tab.id ?');
console.log('✅ Context tabs slimmed');

// Remove briefcase emoji from context tabs
src = src.replace(
  /\{tab\.id !== 'all' && tab\.id !== 'general' && <span style=\{[^}]+\}>💼<\/span>\}/g, '');
console.log('✅ Briefcase emoji removed');

// ─── 4. Remove "simulated" badge ──────────────────────────────────
src = src.replace(
  /\{item\.simulated && <span style=\{[^}]+\}>simulated<\/span>\}/g, '');
console.log('✅ "simulated" badge removed');

// ─── 5. Slim empty state icons ────────────────────────────────────
src = src.replace(
  /width:44, height:44/g, 'width:36, height:36');
console.log('✅ Empty state icons slimmed');

// ─── Done ─────────────────────────────────────────────────────────
fs.writeFileSync(FILE, src);
console.log('\n🎨 Communications panel redesigned!');
