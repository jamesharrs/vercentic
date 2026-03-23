#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const AI = 'client/src/AI.jsx', RECORDS = 'client/src/Records.jsx';

function patch(filepath, label, oldStr, newStr) {
  const full = path.resolve(filepath);
  if (!fs.existsSync(full)) { console.log(`SKIP ${label} — file not found`); return false; }
  let src = fs.readFileSync(full, 'utf8');
  if (!src.includes(oldStr)) { console.log(`SKIP ${label} — anchor not found`); return false; }
  fs.writeFileSync(full, src.replace(oldStr, newStr));
  console.log(`OK   ${label}`); return true;
}

console.log('\n-- 1: Copilot suggested actions --');
patch(AI, '1a SUGGESTED_ACTIONS map',
`/* ─── AI Copilot ─`,
`const SUGGESTED_ACTIONS = {
  people: [
    { label: "Schedule interview",   prompt: "Schedule an interview for this candidate" },
    { label: "Draft outreach email", prompt: "Draft a warm outreach email to this candidate" },
    { label: "Find matching jobs",   prompt: "Find the best matching jobs for this candidate" },
    { label: "Add a note",           prompt: "Add a note to this candidate's record" },
  ],
  jobs: [
    { label: "Find candidates",       prompt: "Find the best matching candidates for this job" },
    { label: "Write job description", prompt: "Write a compelling job description for this role" },
    { label: "Schedule interview",    prompt: "Schedule an interview for this role" },
  ],
  reports: [
    { label: "Filter by status",   prompt: "Add a filter to show only active records" },
    { label: "Group differently",  prompt: "Change the grouping of this report" },
    { label: "Change chart type",  prompt: "Change this to a pie chart" },
    { label: "Save this report",   prompt: "Save this report with a name" },
  ],
  default: [
    { label: "Search records",  prompt: "Search for " },
    { label: "Create a report", prompt: "I want to build a report" },
    { label: "New person",      prompt: "I want to add a new person" },
    { label: "New job",         prompt: "I want to create a new job" },
  ],
};

/* ─── AI Copilot ─`
);

patch(AI, '1b SuggestedActions component',
`export const AICopilot = ({`,
`const SuggestedActions = ({ activeNav, currentObject, onSend, isLastMsg }) => {
  if (!isLastMsg) return null;
  const slug = currentObject?.slug;
  const isReports = activeNav === 'reports';
  const actions = isReports ? SUGGESTED_ACTIONS.reports
    : slug && SUGGESTED_ACTIONS[slug] ? SUGGESTED_ACTIONS[slug]
    : SUGGESTED_ACTIONS.default;
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8, marginLeft:34 }}>
      {actions.map((a, i) => (
        <button key={i} onClick={() => onSend(a.prompt)}
          style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px",
            borderRadius:99, border:"1.5px solid #ddd6fe", background:"white",
            color:"#6d28d9", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
            transition:"all .12s", whiteSpace:"nowrap" }}
          onMouseEnter={e=>{ e.currentTarget.style.background="#f5f3ff"; e.currentTarget.style.borderColor="#a78bfa"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="white"; e.currentTarget.style.borderColor="#ddd6fe"; }}>
          {a.label} →
        </button>
      ))}
    </div>
  );
};

export const AICopilot = ({`
);

// 1c: Add SuggestedActions after the copy button block
patch(AI, '1c Render SuggestedActions',
`                    {msg.role==="assistant"&&!msg.error&&msg.content&&(
                      <div style={{display:"flex",justifyContent:"flex-end",marginTop:3}}>
                        <button onClick={()=>copyMessage(msg.content,i)}
                          style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:copied===i?"#0ca678":C.text3,display:"flex",alignItems:"center",gap:3,padding:"2px 4px",fontFamily:F}}>
                          <Ic n={copied===i?"check":"copy"} s={10}/>{copied===i?"Copied":"Copy"}
                        </button>
                      </div>
                    )}`,
`                    {msg.role==="assistant"&&!msg.error&&msg.content&&(
                      <div style={{display:"flex",justifyContent:"flex-end",marginTop:3}}>
                        <button onClick={()=>copyMessage(msg.content,i)}
                          style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:copied===i?"#0ca678":C.text3,display:"flex",alignItems:"center",gap:3,padding:"2px 4px",fontFamily:F}}>
                          <Ic n={copied===i?"check":"copy"} s={10}/>{copied===i?"Copied":"Copy"}
                        </button>
                      </div>
                    )}
                    {msg.role==="assistant"&&!msg.error&&(
                      <SuggestedActions
                        activeNav={activeNav}
                        currentObject={currentObject}
                        onSend={sendMessage}
                        isLastMsg={i===messages.length-1}
                      />
                    )}`
);

console.log('\n-- 2: Inline status change --');

// ── 2: InlineStatusPicker + row hover ──
console.log('\n-- 2: InlineStatusPicker + row hover actions --');

// 2a: Add InlineStatusPicker before TableView
patch(RECORDS, '2a Add InlineStatusPicker',
`// ── Enhanced TableView ─────────────────────────────────────────────────────────
const TableView = ({`,
`// ── InlineStatusPicker ─────────────────────────────────────────────────────────
const InlineStatusPicker = ({ record, statusOptions, onUpdate }) => {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const ref = React.useRef(null);
  const status = record.data?.status || "";
  const colorMap = {
    Active:"#0ca678", Open:"#0ca678", Passive:"#f59f00", Draft:"#6b7280",
    "Not Looking":"#e03131", Filled:"#3b5bdb", "On Hold":"#f59f00",
    Cancelled:"#e03131", Placed:"#7c3aed", Archived:"#9ca3af",
  };
  const color = colorMap[status] || "#6b7280";
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const handleChange = async (newStatus) => {
    setSaving(true); setOpen(false);
    try {
      const updated = await fetch(\`/api/records/\${record.id}\`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ data: { ...record.data, status: newStatus } })
      }).then(r => r.json());
      onUpdate?.(updated);
    } catch(e) { console.error(e); }
    setSaving(false);
  };
  if (!status || !statusOptions?.length) return null;
  return (
    <div ref={ref} style={{ position:"relative", display:"inline-flex" }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99,
          fontSize:11, fontWeight:600, border:"none", cursor:"pointer",
          background:\`\${color}18\`, color, opacity: saving ? 0.6 : 1 }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }}/>
        {saving ? "…" : status}<span style={{ fontSize:9, opacity:0.7 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:9999,
          background:"white", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,.12)",
          border:"1px solid #e5e7eb", overflow:"hidden", minWidth:130 }}>
          {statusOptions.map(opt => (
            <button key={opt} onClick={() => handleChange(opt)}
              style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 12px",
                background: opt===status ? "#f5f3ff" : "transparent",
                border:"none", cursor:"pointer", fontSize:12, fontWeight:500,
                color: opt===status ? "#7c3aed" : "#374151", textAlign:"left" }}
              onMouseEnter={e => { if(opt!==status) e.currentTarget.style.background="#f8f9fc"; }}
              onMouseLeave={e => { if(opt!==status) e.currentTarget.style.background="transparent"; }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:colorMap[opt]||"#6b7280", flexShrink:0 }}/>
              {opt}
              {opt===status && <span style={{ marginLeft:"auto", fontSize:10, color:"#7c3aed" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Enhanced TableView ─────────────────────────────────────────────────────────
const TableView = ({`
);

// 2b: Add hoveredRow state inside TableView
patch(RECORDS, '2b Add hoveredRow state',
`const TableView = ({ records, fields, visibleFieldIds, objectColor, onSelect, onEdit, onDelete, onProfile, selectedIds, onToggleSelect, onToggleAll, sortBy, sortDir, onSort, onColumnFilter, colWidths, onResizeCol, visibleColOrder, onReorderCols, linkedJobs, onStageChange }) => {
  const listFields = visibleFieldIds`,
`const TableView = ({ records, fields, visibleFieldIds, objectColor, onSelect, onEdit, onDelete, onProfile, selectedIds, onToggleSelect, onToggleAll, sortBy, sortDir, onSort, onColumnFilter, colWidths, onResizeCol, visibleColOrder, onReorderCols, linkedJobs, onStageChange }) => {
  const [hoveredRow, setHoveredRow] = React.useState(null);
  const statusField = fields.find(f => f.api_key === "status");
  const statusOptions = statusField?.options || [];
  const listFields = visibleFieldIds`
);

// 2c: Add onMouseEnter/Leave to the row <tr>
patch(RECORDS, '2c Wire hover state to <tr>',
`              <tr key={record.id}
                style={{ borderBottom:\`1px solid \${C.border}\`, transition:"background .1s",
                  background: selectedIds?.has(record.id) ? \`\${C.accent}08\` : "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = selectedIds?.has(record.id) ? \`\${C.accent}08\` : "#fafbff"}
                onMouseLeave={e => e.currentTarget.style.background = selectedIds?.has(record.id) ? \`\${C.accent}08\` : "transparent"}>`,
`              <tr key={record.id}
                style={{ borderBottom:\`1px solid \${C.border}\`, transition:"background .1s",
                  background: selectedIds?.has(record.id) ? \`\${C.accent}08\` : "transparent" }}
                onMouseEnter={e => { e.currentTarget.style.background = selectedIds?.has(record.id) ? \`\${C.accent}08\` : "#fafbff"; setHoveredRow(record.id); }}
                onMouseLeave={e => { e.currentTarget.style.background = selectedIds?.has(record.id) ? \`\${C.accent}08\` : "transparent"; setHoveredRow(null); }}>`
);

// 2d: Replace actions cell to include inline status picker + open on hover
patch(RECORDS, '2d Add hover actions to row actions cell',
`                <td style={{ padding:"12px 14px", textAlign:"right" }}>
                  <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }}>
                    {onEdit   && <Btn v="ghost" sz="sm" icon="edit"   onClick={()=>onEdit(record)}/>}
                    <Btn v="ghost" sz="sm" icon="expand" onClick={()=>onSelect(record)}/>
                    {onDelete && <Btn v="ghost" sz="sm" icon="trash"  onClick={()=>onDelete(record.id)} style={{color:"#ef4444"}}/>}
                  </div>
                </td>`,
`                <td style={{ padding:"12px 14px", textAlign:"right" }}>
                  <div style={{ display:"flex", gap:4, justifyContent:"flex-end", alignItems:"center" }}>
                    {hoveredRow===record.id && statusOptions.length > 0 && (
                      <InlineStatusPicker
                        record={record}
                        statusOptions={statusOptions}
                        onUpdate={r => { setRecords?.(prev => prev.map(x => x.id===r.id ? r : x)); }}
                      />
                    )}
                    {onEdit   && <Btn v="ghost" sz="sm" icon="edit"   onClick={()=>onEdit(record)}/>}
                    <Btn v="ghost" sz="sm" icon="expand" onClick={()=>onSelect(record)}/>
                    {onDelete && <Btn v="ghost" sz="sm" icon="trash"  onClick={()=>onDelete(record.id)} style={{color:"#ef4444"}}/>}
                  </div>
                </td>`
);

console.log('\n✅ Done. Now run:');
console.log('  cd ~/projects/talentos');
console.log('  git add client/src/AI.jsx client/src/Records.jsx');
console.log('  git commit -m "feat: copilot suggested actions, inline status picker, row hover"');
console.log('  git push origin main && vercel --prod --yes 2>&1 | tail -5');
