import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";
import ReactDOM from "react-dom";

const API = "/api";
const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#F4F6FB", surface:"#FFFFFF", border:"#E8ECF8",
  text1:"#0F1729", text2:"#4B5675", text3:"#9DA8C7",
  accent:"#4361EE", accentLight:"#EEF2FF",
  green:"#0CAF77", red:"#EF4444", amber:"#F79009",
};
const TYPE_ICONS  = { company:"🏢", region:"🌍", division:"🏗️", team:"👥" };
const TYPE_COLORS = { company:"#4361EE", region:"#7C3AED", division:"#0CAF77", team:"#F79009" };
const UNIT_TYPES  = ["company","region","division","team"];
const NODE_W = 180, NODE_H = 72, H_GAP = 40, V_GAP = 80;

const REL_META = {
  reports_to:         { label:"Reports to",        color:"#4361EE" },
  manages:            { label:"Manages",            color:"#0CAF77" },
  dotted_line_to:     { label:"Dotted-line to",     color:"#7C3AED" },
  interim_manager_of: { label:"Interim manager of", color:"#F79009" },
};
// Flat list for pickers (exclude "manages" — it's the inverse of reports_to, set automatically)
const REL_META_LIST = Object.entries(REL_META)
  .filter(([k]) => k !== "manages")
  .map(([value, v]) => ({ value, ...v }));

const api = {
  get:  p     => fetch(`${API}${p}`).then(r=>r.json()),
  post: (p,b) => fetch(`${API}${p}`,{method:"POST",  headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:(p,b) => fetch(`${API}${p}`,{method:"PATCH", headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  del:  p     => fetch(`${API}${p}`,{method:"DELETE"}).then(r=>r.json()),
};

// ── Tree layout ───────────────────────────────────────────────────────────────
function computeLayout(nodes, getParentId) {
  const positions = {};
  let cursor = 0;
  const roots = nodes.filter(n => !getParentId(n));

  function walk(id, depth) {
    const children = nodes.filter(n => getParentId(n) === id);
    if (children.length === 0) {
      positions[id] = { x: cursor * (NODE_W + H_GAP), y: depth * (NODE_H + V_GAP) };
      cursor++;
      return;
    }
    const startCursor = cursor;
    children.forEach(c => walk(c.id, depth + 1));
    const endCursor = cursor - 1;
    positions[id] = { x: ((startCursor + endCursor) / 2) * (NODE_W + H_GAP), y: depth * (NODE_H + V_GAP) };
  }

  roots.forEach(r => walk(r.id, 0));
  return positions;
}

// ── Zoom/pan shared hook ──────────────────────────────────────────────────────
function useZoomPan() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x: 0, y: 0 });
  const panRef          = useRef(null);
  const canvasRef       = useRef(null);
  const ZOOM_MIN = 0.3, ZOOM_MAX = 2;

  const adjustZoom = (delta) =>
    setZoom(z => parseFloat(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)).toFixed(2)));

  const handlePanStart = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    panRef.current = { startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y };
    const onMove = (me) => {
      if (!panRef.current) return;
      setPan({ x: panRef.current.originX + me.clientX - panRef.current.startX,
               y: panRef.current.originY + me.clientY - panRef.current.startY });
    };
    const onUp = () => {
      panRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const wheelTimer = useRef(null);
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (wheelTimer.current) return; // throttle to one event per 80ms
    wheelTimer.current = setTimeout(() => { wheelTimer.current = null; }, 80);
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(z => parseFloat(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)).toFixed(2)));
  }, []);  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Center a specific canvas x position (e.g. root node centre) in the viewport
  const centerOnX = useCallback((canvasX) => {
    const container = canvasRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    setPan({ x: Math.round(cw / 2 - canvasX), y: 40 });
  }, []);

  // Fallback: center the whole content block
  const centerContent = useCallback(() => {
    const container = canvasRef.current;
    if (!container) return;
    const content = container.firstElementChild;
    if (!content) return;
    const cw = container.clientWidth;
    const contentW = content.scrollWidth;
    setPan({ x: Math.max(0, Math.round((cw - contentW) / 2)), y: 40 });
  }, []);

  return { zoom, pan, setZoom, canvasRef, panRef, adjustZoom, handlePanStart, handleWheel, reset, centerContent, centerOnX, ZOOM_MIN, ZOOM_MAX };
}

// ── Shared zoom controls UI ───────────────────────────────────────────────────
function ZoomControls({ zoom, setZoom, adjustZoom, reset, ZOOM_MIN, ZOOM_MAX }) {
  return (
    <div style={{ position:"absolute", bottom:16, left:16, zIndex:20,
      display:"flex", alignItems:"center", gap:6,
      background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:10, padding:"6px 10px", boxShadow:"0 2px 12px rgba(0,0,0,0.1)" }}>
      <button onClick={() => adjustZoom(-0.1)}
        style={{ width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,
          background:"white",cursor:"pointer",fontSize:16,fontWeight:700,
          display:"flex",alignItems:"center",justifyContent:"center",color:C.text2,fontFamily:F }}>−</button>
      <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.1} value={zoom}
        onChange={e => setZoom(parseFloat(e.target.value))}
        style={{ width:80, accentColor:C.accent, cursor:"pointer" }}/>
      <button onClick={() => adjustZoom(0.1)}
        style={{ width:26,height:26,borderRadius:6,border:`1px solid ${C.border}`,
          background:"white",cursor:"pointer",fontSize:16,fontWeight:700,
          display:"flex",alignItems:"center",justifyContent:"center",color:C.text2,fontFamily:F }}>+</button>
      <span style={{ fontSize:11,color:C.text3,fontWeight:600,minWidth:32,textAlign:"center",fontFamily:F }}>
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={reset}
        style={{ marginLeft:2,padding:"3px 8px",borderRadius:6,border:`1px solid ${C.border}`,
          background:"white",cursor:"pointer",fontSize:11,fontWeight:600,color:C.text2,fontFamily:F }}>Reset</button>
    </div>
  );
}

// ── Shared canvas wrapper ─────────────────────────────────────────────────────
function CanvasWrapper({ zoom, pan, panRef, canvasRef, handlePanStart, handleWheel, selectedPanel, children }) {
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !handleWheel) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div ref={canvasRef}
      style={{ position:"absolute", inset:0, overflow:"hidden",
        paddingRight: selectedPanel ? 300 : 0, transition:"padding-right 0.2s" }}>
      <div style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: "top left",
        padding: 40, width: "max-content",
        transition: panRef.current ? "none" : "transform 0.1s ease",
      }}>
        {children}
      </div>
    </div>
  );
}

// ── SVG connector builder ─────────────────────────────────────────────────────
function buildConnectors(nodes, positions, minX, PAD, getParentId, getColor) {
  return nodes
    .filter(n => getParentId(n) && positions[n.id] && positions[getParentId(n)])
    .map(n => {
      const p = positions[getParentId(n)];
      const c = positions[n.id];
      const x1 = p.x - minX + PAD + NODE_W / 2;
      const y1 = p.y + PAD + NODE_H;
      const x2 = c.x - minX + PAD + NODE_W / 2;
      const y2 = c.y + PAD;
      const my = (y1 + y2) / 2;
      return { id: n.id, d: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`, color: getColor(n) };
    });
}

// ── AssignUserDropdown ────────────────────────────────────────────────────────
function AssignUserDropdown({ unitId, allUsers, onAssign }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top:0, left:0 });
  const btnRef = useRef(null);
  const unassigned = allUsers.filter(u => !u.org_unit_id && u.status !== "deactivated");

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left });
    setSearch(""); setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!btnRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = unassigned.filter(u =>
    !search || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        style={{ fontFamily:F, border:`1px solid ${C.border}`, cursor:"pointer", borderRadius:6,
          fontWeight:600, display:"inline-flex", alignItems:"center", gap:5,
          padding:"4px 9px", fontSize:11, background:C.accentLight, color:C.accent, marginTop:6 }}>
        + Assign user
      </button>
      {open && ReactDOM.createPortal(
        <div style={{ position:"fixed", top:pos.top, left:pos.left, zIndex:9999,
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
          boxShadow:"0 12px 40px rgba(0,0,0,0.15)", width:250, overflow:"hidden" }}>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${C.border}` }}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users…"
              style={{ width:"100%", boxSizing:"border-box", padding:"5px 8px",
                borderRadius:7, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:"none" }}/>
          </div>
          <div style={{ maxHeight:200, overflowY:"auto" }}>
            {filtered.length === 0
              ? <div style={{ padding:12, fontSize:12, color:C.text3, textAlign:"center", fontStyle:"italic" }}>No matches</div>
              : filtered.map(u => (
                <div key={u.id} onClick={()=>{ onAssign(unitId, u.id); setOpen(false); }}
                  style={{ padding:"7px 12px", cursor:"pointer", borderBottom:`1px solid ${C.border}`,
                    display:"flex", alignItems:"center", gap:8 }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ width:26,height:26,borderRadius:7,background:C.accentLight,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:10,fontWeight:800,color:C.accent,flexShrink:0 }}>
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:C.text1 }}>{u.first_name} {u.last_name}</div>
                    <div style={{ fontSize:10,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.email}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>, document.body
      )}
    </>
  );
}

// ── Company view: OrgUnit node panel ─────────────────────────────────────────
function UnitPanel({ unit, allUnits, allUsers, onClose, onUpdate, onDelete, onAddChild, onAssignUser, onUnassignUser }) {
  const assignedUsers = allUsers.filter(u => u.org_unit_id === unit.id);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(unit.name);
  const [editType, setEditType] = useState(unit.type);
  const [editColor, setEditColor] = useState(unit.color || TYPE_COLORS[unit.type] || C.accent);
  const color = unit.color || TYPE_COLORS[unit.type] || C.accent;

  const save = async () => { await onUpdate(unit.id, { name:editName, type:editType, color:editColor }); setEditing(false); };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ padding:"16px 16px 12px", borderBottom:`1px solid ${C.border}`, background:`${color}08` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:`${color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>
              {TYPE_ICONS[unit.type]||"📁"}
            </div>
            <div>
              <div style={{ fontSize:15,fontWeight:800,color:C.text1 }}>{unit.name}</div>
              <span style={{ fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:`${color}18`,color }}>{unit.type}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20,lineHeight:1,padding:4 }}>×</button>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[["✏️ Edit",()=>setEditing(p=>!p),"#fff",`1px solid ${C.border}`,C.text2],
            ["+ Child",()=>onAddChild(unit.id),C.accentLight,`1px solid ${C.accent}40`,C.accent],
            ["🗑 Delete",()=>onDelete(unit.id),"#fff5f5","1px solid #fee2e2",C.red]
          ].map(([lbl,fn,bg,bdr,clr])=>(
            <button key={lbl} onClick={fn} style={{ padding:"5px 10px",borderRadius:7,border:bdr,
              background:bg,color:clr,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F }}>{lbl}</button>
          ))}
        </div>
      </div>
      {editing && (
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, background:"#fafbff" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <input value={editName} onChange={e=>setEditName(e.target.value)} autoFocus
              style={{ padding:"6px 9px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F }}/>
            <div style={{ display:"flex", gap:8 }}>
              <select value={editType} onChange={e=>setEditType(e.target.value)} style={{ flex:1,padding:"6px 8px",borderRadius:7,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F }}>
                {UNIT_TYPES.map(t=><option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
              </select>
              <input type="color" value={editColor} onChange={e=>setEditColor(e.target.value)}
                style={{ width:36,height:32,borderRadius:7,border:`1px solid ${C.border}`,cursor:"pointer",padding:2 }}/>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={save} style={{ flex:1,padding:"6px",borderRadius:7,border:"none",background:C.accent,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F }}>Save</button>
              <button onClick={()=>setEditing(false)} style={{ padding:"6px 12px",borderRadius:7,border:`1px solid ${C.border}`,background:"white",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
        <div style={{ fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10 }}>Members ({assignedUsers.length})</div>
        {assignedUsers.length === 0
          ? <div style={{ fontSize:12,color:C.text3,fontStyle:"italic",marginBottom:8 }}>No members yet</div>
          : assignedUsers.map(u => (
            <div key={u.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:28,height:28,borderRadius:8,background:`${color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color,flexShrink:0 }}>
                {u.first_name?.[0]}{u.last_name?.[0]}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:600,color:C.text1 }}>{u.first_name} {u.last_name}</div>
                <div style={{ fontSize:10,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.email}</div>
              </div>
              <button onClick={()=>onUnassignUser(u.id)} style={{ background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:16,padding:2 }}>×</button>
            </div>
          ))
        }
        <AssignUserDropdown unitId={unit.id} allUsers={allUsers} onAssign={onAssignUser}/>
      </div>
    </div>
  );
}

// ── Company canvas ────────────────────────────────────────────────────────────
function CompanyCanvas({ units, users, people, selectedId, onSelect, onDrillInto, onPanStart, getPeopleCount }) {
  const positions = computeLayout(units, u => u.parent_id);
  const allX = Object.values(positions).map(p => p.x);
  const PAD = 60;
  const minX = Math.min(...allX, 0);
  const maxX = Math.max(...allX, 0) + NODE_W;
  const maxY = Math.max(...Object.values(positions).map(p=>p.y), 0) + NODE_H + 30; // +30 for drill button
  const svgW = maxX - minX + PAD * 2, svgH = maxY + PAD * 2;

  const connectors = buildConnectors(units, positions, minX, PAD,
    u => u.parent_id,
    u => { const parent = units.find(p=>p.id===u.parent_id); return (parent?.color || TYPE_COLORS[parent?.type] || C.border) + "60"; }
  );

  return (
    <div onMouseDown={onPanStart} style={{ position:"relative", width:svgW, minHeight:svgH, cursor:"grab" }}>
      <svg style={{ position:"absolute",top:0,left:0,width:svgW,height:svgH,pointerEvents:"none" }}>
        {connectors.map(c=><path key={c.id} d={c.d} fill="none" stroke={c.color} strokeWidth={2.5}/>)}
      </svg>
      {units.map(unit => {
        if (!positions[unit.id]) return null;
        const { x, y } = positions[unit.id];
        const color = unit.color || TYPE_COLORS[unit.type] || C.accent;
        const assignedCount = users.filter(u => u.org_unit_id === unit.id).length;
        const children = units.filter(u => u.parent_id === unit.id);
        const isSelected = selectedId === unit.id;
        const pCount = getPeopleCount ? getPeopleCount(unit.id) : 0;
        return (
          <div key={unit.id} style={{ position:"absolute", left:x-minX+PAD, top:y+PAD, width:NODE_W }}>
            <div
              onClick={e => { e.stopPropagation(); onSelect(isSelected ? null : unit.id); }}
              style={{ width:NODE_W, height:NODE_H,
                background:C.surface, border:`2px solid ${isSelected?color:C.border}`,
                borderTop:`3px solid ${color}`, borderRadius:14,
                boxShadow:isSelected?`0 0 0 3px ${color}30,0 6px 20px ${color}25`:"0 2px 10px rgba(0,0,0,0.07)",
                cursor:"pointer", display:"flex", alignItems:"center", padding:"0 12px", gap:8, userSelect:"none" }}
              onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.borderColor=color; }}
              onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.borderColor=C.border; }}>
              <div style={{ width:32,height:32,borderRadius:9,background:`${color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>
                {TYPE_ICONS[unit.type]||"📁"}
              </div>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontWeight:700,fontSize:13,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{unit.name}</div>
                <div style={{ fontSize:10,color:C.text3,marginTop:2 }}>
                  {unit.type}
                  {children.length>0 && ` · ${children.length} unit${children.length!==1?"s":""}`}
                </div>
              </div>
              {pCount > 0 && (
                <div
                  onClick={e => { e.stopPropagation(); onDrillInto(unit.id); }}
                  title="View people"
                  style={{ background:`${color}18`, color, fontSize:10, fontWeight:800,
                    borderRadius:20, padding:"2px 7px", whiteSpace:"nowrap", flexShrink:0,
                    cursor:"pointer", transition:"background 0.15s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background=`${color}35`; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=`${color}18`; }}>
                  {pCount} 👤
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── People view: person detail panel ─────────────────────────────────────────
function PersonPanel({ person, relationships, allPeople, onClose, onOpenRecord }) {
  const d = person.data || {};
  const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || "Unnamed";
  const initials = [d.first_name?.[0], d.last_name?.[0]].filter(Boolean).join("").toUpperCase();
  const color = C.accent;

  const myRels = relationships.filter(r => r.from_record_id === person.id || r.to_record_id === person.id);

  const personName = (id) => {
    const p = allPeople.find(p => p.id === id);
    if (!p) return "Unknown";
    const d = p.data || {};
    return [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || "Unnamed";
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Header */}
      <div style={{ padding:"16px 16px 12px", borderBottom:`1px solid ${C.border}`, background:`${color}06` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:`${color}20`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:15,fontWeight:800,color, flexShrink:0 }}>{initials||"?"}</div>
            <div>
              <div style={{ fontSize:15,fontWeight:800,color:C.text1 }}>{name}</div>
              {(d.job_title||d.current_title) && <div style={{ fontSize:12,color:C.text3 }}>{d.job_title||d.current_title}</div>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <button onClick={()=>onOpenRecord(person.id)}
              style={{ background:C.accentLight, border:`1px solid ${C.accent}30`, borderRadius:7,
                cursor:"pointer", color:C.accent, fontSize:11, fontWeight:700,
                padding:"4px 9px", fontFamily:F, whiteSpace:"nowrap" }}>
              Open ↗
            </button>
            <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20,lineHeight:1,padding:4 }}>×</button>
          </div>
        </div>
        {/* Key fields */}
        {[["Department", d.department],["Entity", d.entity],["Person Type", d.person_type],["Email", d.email]]
          .filter(([,v])=>v)
          .map(([label, val]) => (
          <div key={label} style={{ display:"flex", gap:8, fontSize:12, marginBottom:4 }}>
            <span style={{ color:C.text3, fontWeight:600, minWidth:90 }}>{label}</span>
            <span style={{ color:C.text1 }}>{val}</span>
          </div>
        ))}
      </div>
      {/* Relationships */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
        <div style={{ fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10 }}>
          Relationships ({myRels.length})
        </div>
        {myRels.length === 0
          ? <div style={{ fontSize:12,color:C.text3,fontStyle:"italic" }}>No relationships</div>
          : myRels.map(r => {
            const isFrom = r.from_record_id === person.id;
            const otherId = isFrom ? r.to_record_id : r.from_record_id;
            const meta = REL_META[r.type] || { label:r.type, color:C.accent };
            const displayLabel = isFrom ? meta.label
              : (r.inverse_type ? REL_META[r.inverse_type]?.label || r.inverse_type : `← ${meta.label}`);
            return (
              <div key={r.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:28,height:28,borderRadius:8,background:`${meta.color}18`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,fontWeight:800,color:meta.color,flexShrink:0 }}>
                  {personName(otherId).split(" ").map(w=>w[0]).join("").slice(0,2)}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:12,fontWeight:600,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{personName(otherId)}</div>
                  <div style={{ fontSize:10,color:meta.color,fontWeight:600 }}>{displayLabel}</div>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// ── Open Role creation modal ──────────────────────────────────────────────────
function OpenRoleModal({ defaultDept, onSave, onClose }) {
  const [title, setTitle]   = useState("");
  const [dept,  setDept]    = useState(defaultDept || "");
  const [loc,   setLoc]     = useState("");
  const [empType, setEmpType] = useState("Full-time");
  const [saving, setSaving] = useState(false);
  const DEPTS = ["Engineering","Product","Design","Sales","Marketing","HR","Finance","Operations","Legal","Other"];
  const EMPS  = ["Full-time","Part-time","Contract","Internship","Freelance"];

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ job_title: title.trim(), department: dept, location: loc, employment_type: empType });
    } catch(e) {
      console.error("Failed to create role:", e);
      setSaving(false);
      return;
    }
    onClose(); // close after save resolves, before parent reloads
  };

  return ReactDOM.createPortal(
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:9998, background:"rgba(15,23,41,0.35)",
        display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"#fff", border:`1.5px solid ${C.amber}`, borderRadius:16,
          boxShadow:"0 20px 60px rgba(0,0,0,0.22)", width:320, overflow:"hidden", fontFamily:F }}>
        <div style={{ padding:"12px 16px 10px", borderBottom:`1px solid ${C.border}`,
          background:"#FFF7ED", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>💼</span>
            <span style={{ fontSize:13, fontWeight:800, color:C.amber }}>Create Open Role</span>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20,lineHeight:1,padding:2 }}>×</button>
        </div>
        <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:C.text3, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Job Title *</label>
            <input autoFocus value={title} onChange={e=>setTitle(e.target.value)}
              placeholder="e.g. Senior Account Executive"
              onKeyDown={e=>{ if(e.key==="Enter") handleSave(); if(e.key==="Escape") onClose(); }}
              style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", borderRadius:8,
                border:`1.5px solid ${title ? C.amber+"60" : C.border}`, fontSize:13, fontFamily:F, outline:"none",
                transition:"border-color 0.15s" }}/>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:10, fontWeight:700, color:C.text3, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Department</label>
              <select value={dept} onChange={e=>setDept(e.target.value)}
                style={{ width:"100%", padding:"7px 8px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F }}>
                <option value="">— none —</option>
                {DEPTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:10, fontWeight:700, color:C.text3, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Type</label>
              <select value={empType} onChange={e=>setEmpType(e.target.value)}
                style={{ width:"100%", padding:"7px 8px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F }}>
                {EMPS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:C.text3, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Location</label>
            <input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="e.g. Dubai / Remote"
              onKeyDown={e=>{ if(e.key==="Escape") onClose(); }}
              style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", borderRadius:8,
                border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none" }}/>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:2 }}>
            <button onClick={onClose}
              style={{ flex:1, padding:"9px", borderRadius:8, border:`1px solid ${C.border}`,
                background:"white", color:C.text2, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!title.trim()||saving}
              style={{ flex:2, padding:"9px", borderRadius:8, border:"none",
                background: title.trim() ? C.amber : C.border,
                color: title.trim() ? "#fff" : C.text3,
                fontSize:13, fontWeight:700, cursor: title.trim()?"pointer":"default", fontFamily:F,
                transition:"background 0.15s" }}>
              {saving ? "Creating…" : "Create Open Role"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Plus action menu (Add Report | Open Role) ─────────────────────────────────
function PlusMenu({ anchorEl, dir, onAddReport, onOpenRole, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top:0, left:0 });

  useEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: Math.max(4, r.left - 40) });
  }, [anchorEl]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target) && e.target !== anchorEl) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [anchorEl, onClose]);

  if (!anchorEl) return null;
  const label = dir === "above" ? "Add manager" : "Add direct report";
  return ReactDOM.createPortal(
    <div ref={ref} style={{ position:"fixed", top:pos.top, left:pos.left, zIndex:9999,
      background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
      boxShadow:"0 8px 30px rgba(0,0,0,0.14)", overflow:"hidden", fontFamily:F, minWidth:180 }}>
      <div style={{ padding:"7px 12px 5px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
      </div>
      {[
        { icon:"👤", label:"Add existing person", color:C.accent, onClick: onAddReport },
        { icon:"💼", label:"Create open role",    color:C.amber,  onClick: onOpenRole  },
      ].map(item => (
        <div key={item.label} onClick={item.onClick}
          style={{ padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
            borderBottom:`1px solid ${C.border}` }}
          onMouseEnter={e=>e.currentTarget.style.background="#F8FAFF"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <span style={{ fontSize:16 }}>{item.icon}</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:item.color }}>{item.label}</div>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}

// ── People canvas ─────────────────────────────────────────────────────────────
// ── Person picker portal — appears on + button click ─────────────────────────
function PersonPickerPortal({ anchorEl, allPeople, excludeIds=[], onPick, onClose, label, defaultType="reports_to" }) {
  const [search, setSearch]   = useState("");
  const [relType, setRelType] = useState(defaultType);
  const ref = useRef(null);
  const [pos, setPos] = useState({ top:0, left:0 });

  useEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: Math.max(4, r.left - 60) });
  }, [anchorEl]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target) && e.target !== anchorEl) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorEl, onClose]);

  const employees = allPeople.filter(p =>
    !excludeIds.includes(p.id) &&
    (p.data?.person_type || "").toLowerCase() === "employee"
  );
  const filtered = employees.filter(p => {
    const name = [p.data?.first_name, p.data?.last_name].filter(Boolean).join(" ");
    return !search || name.toLowerCase().includes(search.toLowerCase()) || (p.data?.email||"").toLowerCase().includes(search.toLowerCase());
  });

  if (!anchorEl) return null;
  return ReactDOM.createPortal(
    <div ref={ref} style={{ position:"fixed", top:pos.top, left:pos.left, zIndex:9999,
      background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
      boxShadow:"0 12px 40px rgba(0,0,0,0.15)", width:240, overflow:"hidden" }}>
      <div style={{ padding:"8px 10px 6px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase",
          letterSpacing:"0.06em", marginBottom:6 }}>{label}</div>
        {/* Relationship type selector */}
        <div style={{ display:"flex", gap:4, marginBottom:6, flexWrap:"wrap" }}>
          {REL_META_LIST.map(t => (
            <button key={t.value} onClick={()=>setRelType(t.value)}
              style={{ padding:"3px 8px", borderRadius:20, border:`1.5px solid ${relType===t.value ? t.color : C.border}`,
                background: relType===t.value ? t.color+"18" : "transparent",
                color: relType===t.value ? t.color : C.text3,
                fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:F, whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
        <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search employees…"
          style={{ width:"100%", boxSizing:"border-box", padding:"5px 8px", borderRadius:7,
            border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:"none" }}/>
      </div>
      <div style={{ maxHeight:220, overflowY:"auto" }}>
        {filtered.length === 0
          ? <div style={{ padding:14, fontSize:12, color:C.text3, textAlign:"center", fontStyle:"italic" }}>No employees found</div>
          : filtered.slice(0, 15).map(p => {
            const d = p.data || {};
            const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || "Unnamed";
            const initials = [d.first_name?.[0], d.last_name?.[0]].filter(Boolean).join("").toUpperCase();
            return (
              <div key={p.id} onClick={() => { onPick(p.id, relType); onClose(); }}
                style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", gap:8 }}
                onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:26, height:26, borderRadius:7, background:C.accentLight,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:800, color:C.accent, flexShrink:0 }}>{initials||"?"}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text1 }}>{name}</div>
                  {d.job_title && <div style={{ fontSize:10, color:C.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.job_title}</div>}
                </div>
              </div>
            );
          })
        }
      </div>
    </div>,
    document.body
  );
}

function PeopleCanvas({ people, openJobs, relationships, activeFilters, selectedId, onSelect, onPanStart, onAddRelationship, onOpenRecord, onCreateOpenRole }) {
  const [picker, setPicker]       = useState(null); // { anchorEl, personId, dir }
  const [plusMenu, setPlusMenu]   = useState(null); // { anchorEl, personId, dir }
  const [roleModal, setRoleModal] = useState(null); // { anchorEl, personId, dir, defaultDept }

  // Show only people who have at least one relationship + all open job roles
  const linkedPersonIds = new Set();
  relationships.forEach(r => { linkedPersonIds.add(r.from_record_id); linkedPersonIds.add(r.to_record_id); });

  const allNodes = [
    ...people.filter(p => linkedPersonIds.has(p.id)).map(p => ({ ...p, _nodeType: "person" })),
    ...(openJobs||[]).map(j => ({ ...j, _nodeType: "job" })),
  ];
  const visiblePeople = allNodes;

  // Build a set of IDs that appear in active-filter relationships (for layout anchoring)
  const relIds = new Set();
  relationships.forEach(r => {
    if (activeFilters.includes(r.type)) { relIds.add(r.from_record_id); relIds.add(r.to_record_id); }
  });

  const positions = computeLayout(visiblePeople, p => {
    if (!activeFilters.includes("reports_to")) return null;
    const rel = relationships.find(r => r.type === "reports_to" && r.from_record_id === p.id);
    // Only use as parent if the manager is also in the visible set
    return rel && visiblePeople.some(vp => vp.id === rel.to_record_id) ? rel.to_record_id : null;
  });

  if (people.length === 0 && (!openJobs || openJobs.length === 0)) return (
    <div style={{ padding:60, textAlign:"center", color:C.text3, fontFamily:F }}>
      <div style={{ fontSize:32, marginBottom:12 }}>👥</div>
      <div style={{ fontSize:14, fontWeight:600, color:C.text2, marginBottom:6 }}>No people in this unit</div>
      <div style={{ fontSize:12 }}>People are matched by their Department field.</div>
    </div>
  );

  const allX = Object.values(positions).map(p => p.x);
  const PAD = 60;
  const minX = Math.min(...allX, 0);
  const maxX = Math.max(...allX, 0) + NODE_W;
  const maxY = Math.max(...Object.values(positions).map(p=>p.y), 0) + NODE_H;
  const svgW = maxX - minX + PAD * 2, svgH = maxY + PAD * 2;

  // Draw connectors for all active-filter relationships where both people are visible
  const allConnectors = [];
  relationships.forEach(r => {
    if (!activeFilters.includes(r.type)) return;
    if (!positions[r.from_record_id] || !positions[r.to_record_id]) return;
    // For reports_to, draw from subordinate up to manager
    const fromPos = positions[r.from_record_id];
    const toPos   = positions[r.to_record_id];
    const x1 = fromPos.x - minX + PAD + NODE_W / 2;
    const y1 = fromPos.y + PAD + (r.type === "reports_to" ? 0 : NODE_H);
    const x2 = toPos.x - minX + PAD + NODE_W / 2;
    const y2 = toPos.y + PAD + (r.type === "reports_to" ? NODE_H : 0);
    const my = (y1 + y2) / 2;
    const color = REL_META[r.type]?.color || C.accent;
    const isDotted = r.type === "dotted_line_to" || r.type === "interim_manager_of";
    allConnectors.push({ id:r.id, d:`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`, color, isDotted });
  });

  return (
    <div onMouseDown={onPanStart} style={{ position:"relative", width:svgW, minHeight:svgH, cursor:"grab" }}>
      <svg style={{ position:"absolute",top:0,left:0,width:svgW,height:svgH,pointerEvents:"none" }}>
        {allConnectors.map(c=>(
          <path key={c.id} d={c.d} fill="none" stroke={c.color+"80"} strokeWidth={2}
            strokeDasharray={c.isDotted?"6 4":"none"}/>
        ))}
      </svg>
      {visiblePeople.map(node => {
        if (!positions[node.id]) return null;
        const { x, y } = positions[node.id];
        const isJob = node._nodeType === "job";
        const d = node.data || {};

        // Job (open role) node
        if (isJob) {
          const nodeLeft = x - minX + PAD;
          const nodeTop  = y + PAD;
          const isSelected = selectedId === node.id;
          const title = d.job_title || "Open Role";
          const dept  = d.department || "";
          return (
            <div key={node.id}
              onClick={e=>{ e.stopPropagation(); onSelect(isSelected ? null : node.id); }}
              onDoubleClick={e=>{ e.stopPropagation(); onOpenRecord && onOpenRecord(node.id, "job"); }}
              title="Open role · Click to select · Double-click to open"
              style={{ position:"absolute", left:nodeLeft, top:nodeTop, width:NODE_W, height:NODE_H,
                background:"#FFFBF2",
                border:`2px dashed ${isSelected ? C.amber : C.amber+"80"}`,
                borderTop:`3px solid ${C.amber}`, borderRadius:14,
                boxShadow: isSelected ? `0 0 0 3px ${C.amber}30,0 6px 20px ${C.amber}25` : "0 2px 10px rgba(0,0,0,0.05)",
                cursor:"pointer", display:"flex", alignItems:"center", padding:"0 10px", gap:8, userSelect:"none", zIndex:2 }}
              onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.borderColor=C.amber; }}
              onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.borderColor=C.amber+"80"; }}>
              <div style={{ width:30,height:30,borderRadius:9,background:`${C.amber}18`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:14,flexShrink:0 }}>💼</div>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontWeight:700,fontSize:12,color:C.amber,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{title}</div>
                <div style={{ fontSize:10,color:C.text3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                  {dept ? `${dept} · ` : ""}Open Role
                </div>
              </div>
            </div>
          );
        }

        // Person node
        const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || "Unnamed";
        const initials = [d.first_name?.[0], d.last_name?.[0]].filter(Boolean).join("").toUpperCase();
        const isSelected = selectedId === node.id;
        const primaryRel = relationships.find(r => r.from_record_id === node.id && activeFilters.includes(r.type));
        const nodeColor = primaryRel ? (REL_META[primaryRel.type]?.color || C.accent) : C.accent;
        const nodeLeft = x - minX + PAD;
        const nodeTop  = y + PAD;
        const BTN_SIZE = 22;
        const BTN_OFF  = (NODE_W - BTN_SIZE) / 2;

        const plusBtnStyle = (isAbove) => ({
          position: "absolute",
          left: nodeLeft + BTN_OFF,
          top:  isAbove ? nodeTop - BTN_SIZE - 6 : nodeTop + NODE_H + 6,
          width: BTN_SIZE, height: BTN_SIZE,
          borderRadius: "50%",
          background: C.surface,
          border: `1.5px dashed ${C.accent}`,
          color: C.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700,
          cursor: "pointer",
          zIndex: 5,
          opacity: 0.75,
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          userSelect: "none",
          transition: "opacity 0.15s, transform 0.15s",
          fontFamily: F,
          lineHeight: 1,
        });

        return (
          <React.Fragment key={node.id}>
            {/* + above = add manager */}
            <div
              title="Add above"
              onClick={e => {
                e.stopPropagation();
                setPlusMenu(p => p?.personId===node.id&&p?.dir==="above" ? null
                  : { anchorEl: e.currentTarget, personId: node.id, dir: "above", defaultDept: d.department });
              }}
              style={plusBtnStyle(true)}
              onMouseEnter={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="scale(1.2)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.opacity="0.75"; e.currentTarget.style.transform="scale(1)"; }}
            >+</div>
            {/* + below = add direct report */}
            <div
              title="Add below"
              onClick={e => {
                e.stopPropagation();
                setPlusMenu(p => p?.personId===node.id&&p?.dir==="below" ? null
                  : { anchorEl: e.currentTarget, personId: node.id, dir: "below", defaultDept: d.department });
              }}
              style={plusBtnStyle(false)}
              onMouseEnter={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="scale(1.2)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.opacity="0.75"; e.currentTarget.style.transform="scale(1)"; }}
            >+</div>
            <div
              onClick={e=>{ e.stopPropagation(); onSelect(isSelected ? null : node.id); }}
              onDoubleClick={e=>{ e.stopPropagation(); onOpenRecord(node.id); }}
              title="Click to select · Double-click to open record"
              style={{ position:"absolute", left:nodeLeft, top:nodeTop, width:NODE_W, height:NODE_H,
                background:C.surface, border:`2px solid ${isSelected?nodeColor:C.border}`,
                borderTop:`3px solid ${nodeColor}`, borderRadius:14,
                boxShadow:isSelected?`0 0 0 3px ${nodeColor}30,0 6px 20px ${nodeColor}25`:"0 2px 10px rgba(0,0,0,0.07)",
                cursor:"pointer", display:"flex", alignItems:"center", padding:"0 10px", gap:8, userSelect:"none", zIndex:2 }}
              onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.borderColor=nodeColor; }}
              onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.borderColor=C.border; }}>
              <div style={{ width:30,height:30,borderRadius:9,background:`${nodeColor}18`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:12,fontWeight:800,color:nodeColor,flexShrink:0 }}>{initials||"?"}</div>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontWeight:700,fontSize:12,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</div>
                <div style={{ fontSize:10,color:C.text3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                  {d.job_title||d.current_title||d.department||d.person_type||""}
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* Plus action menu */}
      {plusMenu && !picker && !roleModal && (
        <PlusMenu
          anchorEl={plusMenu.anchorEl}
          dir={plusMenu.dir}
          onAddReport={() => { setPicker(plusMenu); setPlusMenu(null); }}
          onOpenRole={() => { setRoleModal(plusMenu); setPlusMenu(null); }}
          onClose={() => setPlusMenu(null)}
        />
      )}

      {/* Person picker portal */}
      {picker && (
        <PersonPickerPortal
          anchorEl={picker.anchorEl}
          allPeople={people}
          excludeIds={[picker.personId,
            ...relationships
              .filter(r => r.from_record_id === picker.personId || r.to_record_id === picker.personId)
              .flatMap(r => [r.from_record_id, r.to_record_id])
          ]}
          label={picker.dir === "above" ? "Add manager" : "Add direct report"}
          defaultType="reports_to"
          onPick={async (targetId, relType) => {
            const fromId = picker.dir === "above" ? picker.personId : targetId;
            const toId   = picker.dir === "above" ? targetId        : picker.personId;
            await onAddRelationship(fromId, toId, relType);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Open role modal */}
      {roleModal && (
        <OpenRoleModal
          defaultDept={roleModal.defaultDept}
          onSave={async (fields) => { await onCreateOpenRole(fields); }}
          onClose={() => setRoleModal(null)}
        />
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function OrgChart({ environment }) {
  const [activeFilters, setActiveFilters] = useState(["reports_to","dotted_line_to","interim_manager_of"]);
  const [viewMode, setViewMode]           = useState("structure"); // "structure" | "people"
  const [peopleSearch, setPeopleSearch]   = useState("");

  // All data loaded together
  const [units, setUnits]             = useState([]);
  const [users, setUsers]             = useState([]);
  const [people, setPeople]           = useState([]);
  const [openJobs, setOpenJobs]       = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [peopleObjId, setPeopleObjId] = useState(null);
  const [jobsObjId,   setJobsObjId]   = useState(null);
  const jobsObjIdRef = useRef(null);

  // drillPath: [] = company overview; [unitId] = drilled into that unit's people
  const [drillPath, setDrillPath] = useState([]);

  const [loading, setLoading]       = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [newName, setNewName]       = useState("");
  const [newType, setNewType]       = useState("company");
  const [newParent, setNewParent]   = useState("");
  const [newColor, setNewColor]     = useState(TYPE_COLORS.company);
  const [saving, setSaving]         = useState(false);

  const zp = useZoomPan();

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    try {
      const [u, usr, objs] = await Promise.all([
        api.get(`/org-units?environment_id=${environment.id}`),
        api.get("/users"),
        api.get(`/objects?environment_id=${environment.id}`),
      ]);
      setUnits(Array.isArray(u) ? u : []);
      setUsers(Array.isArray(usr) ? usr : []);
      const peopleObj = (Array.isArray(objs) ? objs : []).find(o => o.slug === "people");
      const jobsObj   = (Array.isArray(objs) ? objs : []).find(o => o.slug === "jobs");
      if (jobsObj) { setJobsObjId(jobsObj.id); jobsObjIdRef.current = jobsObj.id; }
      if (peopleObj) {
        setPeopleObjId(peopleObj.id);
        const fetches = [
          api.get(`/records?object_id=${peopleObj.id}&environment_id=${environment.id}&limit=500`),
          api.get(`/relationships?environment_id=${environment.id}`),
        ];
        if (jobsObj) fetches.push(api.get(`/records?object_id=${jobsObj.id}&environment_id=${environment.id}&limit=500`));
        const [recs, rels, jobRecs] = await Promise.all(fetches);
        setPeople(Array.isArray(recs?.records) ? recs.records : []);
        setRelationships(Array.isArray(rels) ? rels : []);
        if (jobRecs) {
          // Show only open/active jobs (status != closed/filled, or no status)
          const jobs = Array.isArray(jobRecs?.records) ? jobRecs.records : [];
          setOpenJobs(jobs.filter(j => {
            const s = (j.data?.status || "").toLowerCase();
            return s !== "closed" && s !== "filled";
          }));
        }
      }
    } finally { setLoading(false); }
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  // Center on root node after data loads or view changes
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (viewMode === "structure" && units.length > 0) {
        const positions = computeLayout(units, u => u.parent_id);
        const allX = Object.values(positions).map(p => p.x);
        const minX = Math.min(...allX, 0);
        const PAD = 60;
        const roots = units.filter(u => !u.parent_id);
        if (roots.length > 0) {
          const rootPos = positions[roots[0].id];
          if (rootPos) {
            zp.centerOnX(rootPos.x - minX + PAD + NODE_W / 2);
            return;
          }
        }
      } else if (viewMode === "people" && people.length > 0) {
        // Derive visible nodes the same way scopedPeople + PeopleCanvas does
        const linkedIds = new Set(relationships.flatMap(r => [r.from_record_id, r.to_record_id]));
        const drillUnitId = drillPath[drillPath.length - 1];
        let base = people;
        if (drillUnitId) {
          const descIds = new Set();
          const collect = (id) => { descIds.add(id); units.filter(u => u.parent_id === id).forEach(c => collect(c.id)); };
          collect(drillUnitId);
          const descNames = new Set(units.filter(u => descIds.has(u.id)).map(u => u.name.toLowerCase()));
          const allNames  = new Set(units.map(u => u.name.toLowerCase()));
          const drillUnit = units.find(u => u.id === drillUnitId);
          const isRoot = !drillUnit?.parent_id;
          base = people.filter(p => {
            const dept = (p.data?.department || "").toLowerCase();
            return descNames.has(dept) || (isRoot && !allNames.has(dept));
          });
        }
        const visibleNodes = base.filter(p => linkedIds.has(p.id));
        if (visibleNodes.length > 0) {
          const positions = computeLayout(visibleNodes, p => {
            if (!activeFilters.includes("reports_to")) return null;
            const rel = relationships.find(r => r.type === "reports_to" && r.from_record_id === p.id);
            return rel && visibleNodes.some(vp => vp.id === rel.to_record_id) ? rel.to_record_id : null;
          });
          const allX = Object.values(positions).map(p => p.x);
          if (allX.length > 0) {
            const minX = Math.min(...allX);
            const maxX = Math.max(...allX) + NODE_W;
            zp.centerOnX((minX + maxX) / 2 - minX + 60);
            return;
          }
        }
      }
      zp.centerContent();
    }, 100);
    return () => clearTimeout(t);
  }, [loading, viewMode, drillPath.length, units.length, people.length]);

  // ── Drill helpers ──────────────────────────────────────────────────────────
  const isDrilled = viewMode === "people";
  const currentUnit = isDrilled ? units.find(u => u.id === drillPath[drillPath.length - 1]) : null;

  // Get all descendant unit IDs of a given unit (inclusive)
  const getDescendantIds = useCallback((unitId) => {
    const result = new Set([unitId]);
    const queue = [unitId];
    while (queue.length) {
      const id = queue.shift();
      units.filter(u => u.parent_id === id).forEach(child => {
        result.add(child.id);
        queue.push(child.id);
      });
    }
    return result;
  }, [units]);

  // Map unit names to unit IDs (for matching people.data.department → unit)
  const unitNameToIds = units.reduce((acc, u) => {
    const key = u.name.toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(u.id);
    return acc;
  }, {});

  // Get which unit a person belongs to (by department field matching unit name)
  const getPersonUnitId = useCallback((person) => {
    const dept = (person.data?.department || "").toLowerCase();
    return unitNameToIds[dept]?.[0] || null;
  }, [unitNameToIds]);

  // People scoped to current drilled unit (including descendants, matched by department)
  const scopedPeople = (() => {
    const drillUnitId = drillPath[drillPath.length - 1];
    if (!drillUnitId) {
      // People view, no dept selected — show all
      const base = people;
      if (!peopleSearch.trim()) return base;
      const q = peopleSearch.toLowerCase();
      return base.filter(p => `${p.data?.first_name||""} ${p.data?.last_name||""}`.toLowerCase().includes(q));
    }
    const descIds = getDescendantIds(drillUnitId);
    const descUnitNames = new Set(units.filter(u => descIds.has(u.id)).map(u => u.name.toLowerCase()));
    const drillUnit = units.find(u => u.id === drillUnitId);
    const isRoot = !drillUnit?.parent_id;
    const allUnitNames = new Set(units.map(u => u.name.toLowerCase()));
    const base = people.filter(p => {
      const dept = (p.data?.department || "").toLowerCase();
      if (descUnitNames.has(dept)) return true;
      if (isRoot && !allUnitNames.has(dept)) return true;
      return false;
    });
    if (!peopleSearch.trim()) return base;
    const q = peopleSearch.toLowerCase();
    return base.filter(p => `${p.data?.first_name||""} ${p.data?.last_name||""}`.toLowerCase().includes(q));
  })();

  const scopedJobs = isDrilled
    ? (() => {
        const drillUnitId = drillPath[drillPath.length - 1];
        const descIds = getDescendantIds(drillUnitId);
        const descUnitNames = new Set(
          units.filter(u => descIds.has(u.id)).map(u => u.name.toLowerCase())
        );
        const drillUnit = units.find(u => u.id === drillUnitId);
        const isRoot = !drillUnit?.parent_id;
        const allUnitNames = new Set(units.map(u => u.name.toLowerCase()));
        return openJobs.filter(j => {
          const dept = (j.data?.department || "").toLowerCase();
          if (descUnitNames.has(dept)) return true;
          if (isRoot && !allUnitNames.has(dept)) return true;
          return false;
        });
      })()
    : openJobs;

  const drillInto = (unitId) => {
    setDrillPath(prev => [...prev, unitId]);
    setSelectedId(null);
    setViewMode("people");
    setPeopleSearch("");
    zp.reset();
  };

  const drillBack = () => {
    setDrillPath([]);
    setSelectedId(null);
    setViewMode("structure");
    setPeopleSearch("");
    zp.reset();
  };

  const drillTo = (index) => {
    setDrillPath(prev => prev.slice(0, index + 1));
    setSelectedId(null);
    setViewMode("people");
    setPeopleSearch("");
    zp.reset();
  };

  // Count people in a unit (including descendants, matched by department name)
  const getPeopleCount = useCallback((unitId) => {
    const descIds = getDescendantIds(unitId);
    const descUnitNames = new Set(
      units.filter(u => descIds.has(u.id)).map(u => u.name.toLowerCase())
    );
    // Also count people whose dept doesn't match any unit — assign them to company root
    const unit = units.find(u => u.id === unitId);
    const isRoot = !unit?.parent_id;
    const allUnitNames = new Set(units.map(u => u.name.toLowerCase()));
    return people.filter(p => {
      const dept = (p.data?.department || "").toLowerCase();
      if (descUnitNames.has(dept)) return true;
      // Unmatched departments count under root
      if (isRoot && !allUnitNames.has(dept)) return true;
      return false;
    }).length;
  }, [people, units, getDescendantIds]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleUpdate   = async (id, data) => { await api.patch(`/org-units/${id}`, data); load(); };
  const handleDelete   = async (id) => {
    if (!confirm("Delete this org unit?")) return;
    setSelectedId(null); await api.del(`/org-units/${id}`); load();
  };
  const handleAddChild = (parentId) => { setNewParent(parentId); setSelectedId(null); setShowAdd(true); };
  const handleAssign   = async (unitId, userId) => { await api.patch(`/org-units/${unitId}/assign-user`, { user_id:userId }); load(); };
  const handleUnassign = async (userId) => { await api.patch(`/org-units/unassign-user/${userId}`, {}); load(); };
  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await api.post("/org-units", { name:newName.trim(), type:newType, parent_id:newParent||null, environment_id:environment.id, color:newColor });
    setNewName(""); setNewType("company"); setNewParent(""); setNewColor(TYPE_COLORS.company);
    setShowAdd(false); setSaving(false); load();
  };
  const handleAddRelationship = async (fromId, toId, type) => {
    await api.post("/relationships", { from_record_id:fromId, to_record_id:toId, type, environment_id:environment.id });
    await load();
  };

  const handleCreateOpenRole = async (fields) => {
    const objId = jobsObjIdRef.current || jobsObjId;
    if (!objId) { console.error("Jobs object ID not loaded"); return; }
    await api.post("/records", { object_id: objId, environment_id: environment.id, data: { ...fields, status: "Open" } });
    load();
  };

  const openPersonRecord = (personId) => {
    if (!peopleObjId) return;
    window.dispatchEvent(new CustomEvent("talentos:openRecord", {
      detail: { recordId: personId, objectId: peopleObjId }
    }));
  };

  const selectedUnit   = !isDrilled ? units.find(u => u.id === selectedId) : null;
  const selectedPerson = isDrilled  ? scopedPeople.find(p => p.id === selectedId) : null;
  const hasPanel = !!(selectedUnit || selectedPerson);
  const unassignedUsers = users.filter(u => !u.org_unit_id && u.status !== "deactivated");

  const toggleFilter = (type) => {
    setActiveFilters(prev => prev.includes(type) ? prev.filter(f=>f!==type) : [...prev, type]);
    setSelectedId(null);
  };

  // ── Breadcrumb path labels ─────────────────────────────────────────────────
  const breadcrumbs = drillPath.map(id => units.find(u => u.id === id)).filter(Boolean);

  return (
    <div style={{ fontFamily:F, color:C.text1, height:"100%", display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexShrink:0, gap:12, flexWrap:"wrap" }}>

        {/* Left — breadcrumb + subtitle */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:3, minHeight:20 }}>
            <button onClick={drillBack}
              style={{ background:"none", border:"none", cursor:"pointer", padding:0,
                fontSize:13, fontWeight:700, color: isDrilled ? C.accent : C.text1,
                fontFamily:F, textDecoration: isDrilled ? "underline" : "none" }}>
              🏢 {environment?.name || "Company"}
            </button>
            {breadcrumbs.map((u, i) => (
              <React.Fragment key={u.id}>
                <span style={{ color:C.text3, fontSize:13 }}>›</span>
                <button onClick={() => drillTo(i)}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:0,
                    fontSize:13, fontWeight:700,
                    color: i < breadcrumbs.length - 1 ? C.accent : C.text1,
                    fontFamily:F, textDecoration: i < breadcrumbs.length - 1 ? "underline" : "none" }}>
                  {u.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          <p style={{ margin:0, fontSize:12, color:C.text3 }}>
            {isDrilled
              ? (() => {
                  const linkedIds = new Set(relationships.flatMap(r => [r.from_record_id, r.to_record_id]));
                  const linked = scopedPeople.filter(p => linkedIds.has(p.id)).length;
                  const hidden = scopedPeople.length - linked;
                  return `${linked} on canvas${hidden > 0 ? ` · ${hidden} unlinked hidden` : ""}${peopleSearch ? ` · matching "${peopleSearch}"` : ""}`;
                })()
              : `${units.length} units · ${people.length} people`}
          </p>
        </div>

        {/* Right — view switcher + search/actions */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>

          {/* View mode toggle */}
          <div style={{ display:"flex", borderRadius:9, border:`1px solid ${C.border}`, overflow:"hidden", background:C.surface }}>
            {[["structure","🏢 Structure"],["people","👤 People"]].map(([mode, label]) => (
              <button key={mode} onClick={() => {
                setViewMode(mode);
                setSelectedId(null);
                setPeopleSearch("");
                if (mode === "structure") setDrillPath([]);
                zp.reset();
              }}
                style={{ padding:"6px 14px", border:"none", background: viewMode===mode ? C.accent : "transparent",
                  color: viewMode===mode ? "#fff" : C.text2, fontSize:12, fontWeight:700,
                  cursor:"pointer", fontFamily:F, transition:"all .12s" }}>
                {label}
              </button>
            ))}
          </div>

          {/* People search (people view only) */}
          {isDrilled && (
            <div style={{ position:"relative" }}>
              <input value={peopleSearch} onChange={e => setPeopleSearch(e.target.value)}
                placeholder="Search people…"
                style={{ padding:"6px 10px 6px 30px", borderRadius:8, border:`1px solid ${C.border}`,
                  fontSize:12, fontFamily:F, width:160, background:C.surface, color:C.text1, outline:"none" }}/>
              <svg style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2">
                <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              {peopleSearch && (
                <button onClick={() => setPeopleSearch("")}
                  style={{ position:"absolute", right:7, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.text3, fontSize:14, padding:0 }}>×</button>
              )}
            </div>
          )}

          {/* Relationship filters (people view only) */}
          {isDrilled && (
            <div style={{ display:"flex", gap:5 }}>
              {Object.entries(REL_META).filter(([k])=>k!=="manages").map(([type, meta])=>(
                <button key={type} onClick={()=>toggleFilter(type)}
                  style={{ padding:"5px 9px", borderRadius:7, border:`1px solid ${activeFilters.includes(type)?meta.color:C.border}`,
                    background: activeFilters.includes(type) ? `${meta.color}12` : "transparent",
                    color: activeFilters.includes(type) ? meta.color : C.text3,
                    fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:F, transition:"all 0.15s" }}>
                  {meta.label}
                </button>
              ))}
            </div>
          )}

          {/* Structure view actions */}
          {!isDrilled && (
            <>
              {unassignedUsers.length > 0 && (
                <div style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,
                  background:"#FFF7ED",border:"1px solid #FED7AA",fontSize:12,color:"#92400E",fontWeight:600 }}>
                  ⚠️ {unassignedUsers.length} unassigned
                </div>
              )}
              <button onClick={()=>{ setNewParent(""); setShowAdd(p=>!p); }}
                style={{ padding:"7px 14px",borderRadius:8,border:"none",background:C.accent,
                  color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F }}>
                + Add Unit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add unit form */}
      {!isDrilled && showAdd && (
        <div style={{ background:C.surface,border:`1.5px solid ${C.accent}`,borderRadius:12,padding:16,marginBottom:16,flexShrink:0 }}>
          <div style={{ fontSize:13,fontWeight:700,color:C.text1,marginBottom:12 }}>New Org Unit</div>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end" }}>
            {[["NAME",<input key="n" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. EMEA" autoFocus
              style={{ padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,width:180 }}/>],
              ["TYPE",<select key="t" value={newType} onChange={e=>{setNewType(e.target.value);setNewColor(TYPE_COLORS[e.target.value]||C.accent);}}
                style={{ padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F }}>
                {UNIT_TYPES.map(t=><option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}</select>],
              ["PARENT",<select key="p" value={newParent} onChange={e=>setNewParent(e.target.value)}
                style={{ padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F }}>
                <option value="">— root —</option>
                {units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>],
              ["COLOR",<input key="c" type="color" value={newColor} onChange={e=>setNewColor(e.target.value)}
                style={{ width:36,height:34,borderRadius:8,border:`1px solid ${C.border}`,cursor:"pointer",padding:2 }}/>],
            ].map(([label, el]) => (
              <div key={label}>
                <label style={{ fontSize:10,fontWeight:700,color:C.text3,display:"block",marginBottom:4 }}>{label}</label>
                {el}
              </div>
            ))}
            <button onClick={handleAdd} disabled={!newName.trim()||saving}
              style={{ padding:"8px 16px",borderRadius:8,border:"none",background:C.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F,opacity:(!newName.trim()||saving)?0.5:1 }}>
              {saving?"Creating…":"Create"}
            </button>
            <button onClick={()=>setShowAdd(false)}
              style={{ padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"white",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chart canvas */}
      {!loading && (units.length > 0 || isDrilled) && (
        <div style={{ flex:1,position:"relative",overflow:"hidden",borderRadius:16,background:C.bg,border:`1px solid ${C.border}` }}>
          <CanvasWrapper zoom={zp.zoom} pan={zp.pan} panRef={zp.panRef} canvasRef={zp.canvasRef}
            handlePanStart={zp.handlePanStart} handleWheel={zp.handleWheel} selectedPanel={hasPanel}>
            {isDrilled
              ? <PeopleCanvas people={scopedPeople} openJobs={scopedJobs} relationships={relationships} activeFilters={activeFilters}
                  selectedId={selectedId} onSelect={setSelectedId} onPanStart={zp.handlePanStart}
                  onAddRelationship={handleAddRelationship} onOpenRecord={openPersonRecord}/>
              : <CompanyCanvas units={units} users={users} people={people} selectedId={selectedId}
                  onSelect={setSelectedId} onDrillInto={drillInto} onPanStart={zp.handlePanStart}
                  getPeopleCount={getPeopleCount}/>
            }
          </CanvasWrapper>

          <ZoomControls zoom={zp.zoom} setZoom={zp.setZoom} adjustZoom={zp.adjustZoom} reset={zp.reset} ZOOM_MIN={zp.ZOOM_MIN} ZOOM_MAX={zp.ZOOM_MAX}/>

          {/* Detail panel */}
          {hasPanel && (
            <div style={{ position:"absolute",top:0,right:0,bottom:0,width:300,background:C.surface,
              borderLeft:`1px solid ${C.border}`,boxShadow:"-8px 0 32px rgba(0,0,0,0.08)",
              display:"flex",flexDirection:"column",zIndex:10 }}>
              {selectedUnit && <UnitPanel unit={selectedUnit} allUnits={units} allUsers={users}
                onClose={()=>setSelectedId(null)} onUpdate={handleUpdate} onDelete={handleDelete}
                onAddChild={handleAddChild} onAssignUser={handleAssign} onUnassignUser={handleUnassign}/>}
              {selectedPerson && <PersonPanel person={selectedPerson} relationships={relationships}
                allPeople={people} onClose={()=>setSelectedId(null)} onOpenRecord={openPersonRecord}/>}
            </div>
          )}
        </div>
      )}

      {!loading && units.length === 0 && !isDrilled && (
        <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ textAlign:"center",padding:"60px 40px",background:C.surface,borderRadius:16,
            border:`2px dashed ${C.border}`,color:C.text3,maxWidth:420 }}>
            <div style={{ fontSize:48,marginBottom:12 }}>🏢</div>
            <div style={{ fontSize:16,fontWeight:700,color:C.text2,marginBottom:6 }}>No org structure yet</div>
            <div style={{ fontSize:13,marginBottom:20 }}>Start by creating a top-level company or region unit.</div>
            <button onClick={()=>setShowAdd(true)}
              style={{ padding:"9px 20px",borderRadius:9,border:"none",background:C.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F }}>
              + Create first unit
            </button>
          </div>
        </div>
      )}

      {loading && <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontFamily:F }}>Loading…</div>}
    </div>
  );
}
