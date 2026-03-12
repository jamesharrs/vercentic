import { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";

const API = "/api";
const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#F4F6FB", surface:"#FFFFFF", border:"#E8ECF8",
  text1:"#0F1729", text2:"#4B5675", text3:"#9DA8C7",
  accent:"#4361EE", accentLight:"#EEF2FF",
  green:"#0CAF77", red:"#EF4444", amber:"#F79009",
};

const UNIT_TYPES = ["company","region","division","team"];
const TYPE_ICONS = { company:"🏢", region:"🌍", division:"🏗️", team:"👥" };
const TYPE_COLORS = { company:"#4361EE", region:"#7C3AED", division:"#0CAF77", team:"#F79009" };

const api = {
  get:  p     => fetch(`${API}${p}`).then(r=>r.json()),
  post: (p,b) => fetch(`${API}${p}`,{method:"POST",  headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:(p,b) => fetch(`${API}${p}`,{method:"PATCH", headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  del:  p     => fetch(`${API}${p}`,{method:"DELETE"}).then(r=>r.json()),
};

const Btn = ({ children, onClick, variant="primary", size="md", disabled, style={} }) => {
  const base = { fontFamily:F, border:"none", cursor:disabled?"not-allowed":"pointer", borderRadius:8,
    fontWeight:600, display:"inline-flex", alignItems:"center", gap:6, opacity:disabled?0.5:1,
    padding: size==="sm" ? "5px 10px" : "8px 16px", fontSize: size==="sm" ? 12 : 13,
    background: variant==="primary" ? C.accent : variant==="danger" ? "#FEE2E2" : C.accentLight,
    color:      variant==="primary" ? "#fff"   : variant==="danger" ? C.red      : C.accent,
    ...style };
  return <button style={base} onClick={onClick} disabled={disabled}>{children}</button>;
};

function OrgNode({ unit, allUnits, allUsers, depth=0, onUpdate, onDelete, onAddChild, onAssignUser, onUnassignUser }) {
  const children = allUnits.filter(u => u.parent_id === unit.id);
  const assignedUsers = allUsers.filter(u => u.org_unit_id === unit.id);
  const [expanded, setExpanded]   = useState(true);
  const [editing, setEditing]     = useState(false);
  const [editName, setEditName]   = useState(unit.name);
  const [editType, setEditType]   = useState(unit.type);
  const [editColor, setEditColor] = useState(unit.color || TYPE_COLORS[unit.type] || C.accent);
  const [showUsers, setShowUsers] = useState(false);

  const save = async () => {
    await onUpdate(unit.id, { name: editName, type: editType, color: editColor });
    setEditing(false);
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      {/* Connector line */}
      {depth > 0 && <div style={{ position:"relative" }}>
        <div style={{ position:"absolute", left:-16, top:0, bottom:"50%", width:1, background:C.border }}/>
        <div style={{ position:"absolute", left:-16, top:"50%", width:12, height:1, background:C.border }}/>
      </div>}

      <div style={{ background:C.surface, border:`1.5px solid ${expanded && children.length ? unit.color||C.accent : C.border}`,
        borderRadius:12, marginBottom:8, overflow:"hidden",
        boxShadow: expanded && children.length ? `0 2px 8px ${unit.color||C.accent}15` : "none" }}>

        {/* Unit header */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px" }}>
          <button onClick={()=>setExpanded(p=>!p)}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:C.text3, padding:0, width:16 }}>
            {children.length > 0 ? (expanded ? "▾" : "▸") : " "}
          </button>

          {/* Color dot + type icon */}
          <div style={{ width:32, height:32, borderRadius:10, background:`${unit.color||TYPE_COLORS[unit.type]||C.accent}20`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
            {TYPE_ICONS[unit.type] || "📁"}
          </div>

          {editing ? (
            <div style={{ display:"flex", gap:8, flex:1, alignItems:"center", flexWrap:"wrap" }}>
              <input value={editName} onChange={e=>setEditName(e.target.value)} autoFocus
                style={{ padding:"5px 8px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, flex:1, minWidth:120 }}/>
              <select value={editType} onChange={e=>setEditType(e.target.value)}
                style={{ padding:"5px 8px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F }}>
                {UNIT_TYPES.map(t=><option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
              </select>
              <input type="color" value={editColor} onChange={e=>setEditColor(e.target.value)}
                style={{ width:30, height:30, borderRadius:6, border:"none", cursor:"pointer", padding:2 }}/>
              <Btn size="sm" onClick={save}>Save</Btn>
              <Btn size="sm" variant="secondary" onClick={()=>setEditing(false)}>Cancel</Btn>
            </div>
          ) : (
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontWeight:700, fontSize:14, color:C.text1 }}>{unit.name}</span>
                <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:99,
                  background:`${unit.color||TYPE_COLORS[unit.type]||C.accent}15`,
                  color: unit.color||TYPE_COLORS[unit.type]||C.accent }}>
                  {unit.type}
                </span>
                {unit.user_count > 0 && <span style={{ fontSize:11, color:C.text3 }}>👤 {unit.user_count}</span>}
              </div>
            </div>
          )}

          {!editing && (
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <Btn size="sm" variant="secondary" onClick={()=>setShowUsers(p=>!p)}>
                {showUsers ? "▲" : "👤"} Users
              </Btn>
              <Btn size="sm" variant="secondary" onClick={()=>onAddChild(unit.id)}>+ Child</Btn>
              <Btn size="sm" variant="secondary" onClick={()=>setEditing(true)}>Edit</Btn>
              <Btn size="sm" variant="danger" onClick={()=>onDelete(unit.id)}>✕</Btn>
            </div>
          )}
        </div>

        {/* Users panel */}
        {showUsers && (
          <div style={{ padding:"10px 14px 12px", borderTop:`1px solid ${C.border}`, background:"#FAFBFF" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Assigned Users
            </div>
            {assignedUsers.length === 0
              ? <div style={{ fontSize:12, color:C.text3, fontStyle:"italic" }}>No users assigned</div>
              : assignedUsers.map(u => (
                <div key={u.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:C.accent }}>
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{u.first_name} {u.last_name}</div>
                    <div style={{ fontSize:11, color:C.text3 }}>{u.email}</div>
                  </div>
                  <Btn size="sm" variant="danger" onClick={()=>onUnassignUser(u.id)}>Remove</Btn>
                </div>
              ))
            }
            <AssignUserDropdown unitId={unit.id} allUsers={allUsers} onAssign={onAssignUser}/>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && children.map(child => (
        <OrgNode key={child.id} unit={child} allUnits={allUnits} allUsers={allUsers} depth={depth+1}
          onUpdate={onUpdate} onDelete={onDelete} onAddChild={onAddChild}
          onAssignUser={onAssignUser} onUnassignUser={onUnassignUser}/>
      ))}
    </div>
  );
}

function AssignUserDropdown({ unitId, allUsers, onAssign }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos]       = useState({ top:0, left:0 });
  const btnRef              = useRef(null);

  const unassigned = allUsers.filter(u => !u.org_unit_id && u.status !== 'deactivated');

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left });
    setSearch("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!btnRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = unassigned.filter(u =>
    !search || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  if (unassigned.length === 0) return (
    <div style={{ fontSize:11, color:C.text3, marginTop:8, fontStyle:"italic" }}>All active users assigned</div>
  );

  return (
    <>
      <div style={{ marginTop:8 }}>
        <button ref={btnRef} onClick={handleOpen}
          style={{ fontFamily:F, border:`1px solid ${C.border}`, cursor:"pointer", borderRadius:8,
            fontWeight:600, display:"inline-flex", alignItems:"center", gap:6,
            padding:"5px 10px", fontSize:12, background:C.accentLight, color:C.accent }}>
          + Assign User
        </button>
      </div>
      {open && ReactDOM.createPortal(
        <div style={{ position:"fixed", top:pos.top, left:pos.left, zIndex:9999,
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
          boxShadow:"0 12px 40px rgba(0,0,0,0.15)", width:260, overflow:"hidden" }}>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${C.border}` }}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search users…"
              style={{ width:"100%", boxSizing:"border-box", padding:"5px 8px",
                borderRadius:7, border:`1px solid ${C.border}`, fontSize:12,
                fontFamily:F, outline:"none", color:C.text1 }}/>
          </div>
          <div style={{ maxHeight:220, overflowY:"auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding:"12px", fontSize:12, color:C.text3, textAlign:"center", fontStyle:"italic" }}>No matches</div>
            )}
            {filtered.map(u => (
              <div key={u.id} onClick={()=>{ onAssign(unitId, u.id); setOpen(false); }}
                style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", gap:8 }}
                onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:28, height:28, borderRadius:8, background:C.accentLight,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:800, color:C.accent, flexShrink:0 }}>
                  {u.first_name?.[0]}{u.last_name?.[0]}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{u.first_name} {u.last_name}</div>
                  <div style={{ fontSize:11, color:C.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function OrgChart({ environment }) {
  const [units, setUnits]   = useState([]);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("company");
  const [newParent, setNewParent] = useState("");
  const [newColor, setNewColor]   = useState(TYPE_COLORS.company);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!environment?.id) return;
    const [u, usr] = await Promise.all([
      api.get(`/org-units?environment_id=${environment.id}`),
      api.get("/users"),
    ]);
    setUnits(Array.isArray(u) ? u : []);
    setUsers(Array.isArray(usr) ? usr : []);
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await api.post("/org-units", {
      name: newName.trim(), type: newType,
      parent_id: newParent || null,
      environment_id: environment.id, color: newColor
    });
    setNewName(""); setNewType("company"); setNewParent(""); setNewColor(TYPE_COLORS.company);
    setShowAdd(false); setSaving(false);
    load();
  };

  const handleUpdate = async (id, data) => {
    await api.patch(`/org-units/${id}`, data);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this org unit? Its children will be reparented and users unassigned.")) return;
    await api.del(`/org-units/${id}`);
    load();
  };

  const handleAddChild = (parentId) => {
    setNewParent(parentId);
    setShowAdd(true);
  };

  const handleAssignUser = async (unitId, userId) => {
    await api.patch(`/org-units/${unitId}/assign-user`, { user_id: userId });
    load();
  };

  const handleUnassignUser = async (userId) => {
    await api.patch(`/org-units/unassign-user/${userId}`, {});
    load();
  };

  // Root units = those with no parent
  const roots = units.filter(u => !u.parent_id);
  const unassignedUsers = users.filter(u => !u.org_unit_id && u.status !== 'deactivated');

  if (loading) return <div style={{ padding:40, color:C.text3, fontFamily:F }}>Loading org structure…</div>;

  return (
    <div style={{ fontFamily:F, color:C.text1 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:C.text1 }}>Org Structure</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.text3 }}>
            Define your hierarchy — records created by users are scoped to their org unit and below.
          </p>
        </div>
        <Btn onClick={()=>{ setNewParent(""); setShowAdd(p=>!p); }}>+ Add Unit</Btn>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background:C.surface, border:`1.5px solid ${C.accent}`, borderRadius:12, padding:16, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text1, marginBottom:12 }}>New Org Unit</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>NAME</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. EMEA Region" autoFocus
                style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, width:200 }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>TYPE</label>
              <select value={newType} onChange={e=>{ setNewType(e.target.value); setNewColor(TYPE_COLORS[e.target.value]||C.accent); }}
                style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F }}>
                {UNIT_TYPES.map(t=><option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>PARENT</label>
              <select value={newParent} onChange={e=>setNewParent(e.target.value)}
                style={{ padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F }}>
                <option value="">— root —</option>
                {units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text3, display:"block", marginBottom:4 }}>COLOR</label>
              <input type="color" value={newColor} onChange={e=>setNewColor(e.target.value)}
                style={{ width:36, height:34, borderRadius:8, border:`1px solid ${C.border}`, cursor:"pointer", padding:2 }}/>
            </div>
            <Btn onClick={handleAdd} disabled={!newName.trim()||saving}>{saving?"Saving…":"Create"}</Btn>
            <Btn variant="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Empty state */}
      {roots.length === 0 && !showAdd && (
        <div style={{ textAlign:"center", padding:"60px 40px", background:C.surface, borderRadius:16,
          border:`2px dashed ${C.border}`, color:C.text3 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏢</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.text2, marginBottom:6 }}>No org structure yet</div>
          <div style={{ fontSize:13, marginBottom:20 }}>Start by creating a top-level company or region unit.</div>
          <Btn onClick={()=>setShowAdd(true)}>+ Create first unit</Btn>
        </div>
      )}

      {/* Org tree */}
      <div style={{ position:"relative" }}>
        {roots.map(unit => (
          <OrgNode key={unit.id} unit={unit} allUnits={units} allUsers={users} depth={0}
            onUpdate={handleUpdate} onDelete={handleDelete} onAddChild={handleAddChild}
            onAssignUser={handleAssignUser} onUnassignUser={handleUnassignUser}/>
        ))}
      </div>

      {/* Unassigned users */}
      {unassignedUsers.length > 0 && (
        <div style={{ marginTop:24, background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.amber, marginBottom:10 }}>
            ⚠️ {unassignedUsers.length} user{unassignedUsers.length>1?"s":""} not assigned to any org unit
          </div>
          <div style={{ fontSize:12, color:C.text3, marginBottom:12 }}>
            Unassigned users see all records. Assign them to a unit to enable data scoping.
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {unassignedUsers.map(u => (
              <div key={u.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px",
                background:C.bg, borderRadius:20, border:`1px solid ${C.border}`, fontSize:12 }}>
                <div style={{ width:22, height:22, borderRadius:6, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:C.accent }}>
                  {u.first_name?.[0]}{u.last_name?.[0]}
                </div>
                <span style={{ fontWeight:600, color:C.text1 }}>{u.first_name} {u.last_name}</span>
                <span style={{ color:C.text3 }}>{u.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
