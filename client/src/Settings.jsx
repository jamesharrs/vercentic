import { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";

import SuperAdminSection from "./SuperAdmin.jsx";
import OrgChart from "./OrgChart.jsx";

const api = {
  get:   p     => fetch(`/api${p}`).then(r=>r.json()),
  post:  (p,b) => fetch(`/api${p}`,{method:"POST",  headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  put:   (p,b) => fetch(`/api${p}`,{method:"PUT",   headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  patch: (p,b) => fetch(`/api${p}`,{method:"PATCH", headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  del:   p     => fetch(`/api${p}`,{method:"DELETE"}).then(r=>r.json()),
};

const F = "'DM Sans', -apple-system, sans-serif";
const C = { bg:"#f8f9fc", surface:"#ffffff", border:"#e8eaed", border2:"#d1d5db", text1:"#111827", text2:"#4b5563", text3:"#9ca3af", accent:"#3b5bdb" };

// ── Primitives ───────────────────────────────────────────────────────────────
const Btn = ({children,onClick,v="primary",sz="md",icon,disabled,style={}}) => {
  const base={display:"inline-flex",alignItems:"center",gap:6,fontFamily:F,fontWeight:600,cursor:disabled?"not-allowed":"pointer",border:"1px solid transparent",borderRadius:8,transition:"all 0.15s",opacity:disabled?0.5:1,...(sz==="sm"?{fontSize:12,padding:"5px 10px"}:{fontSize:13,padding:"8px 14px"})};
  const vs={primary:{background:C.accent,color:"#fff",borderColor:C.accent},secondary:{background:C.surface,color:C.text1,borderColor:C.border},ghost:{background:"transparent",color:C.text3},danger:{background:"#fef2f2",color:"#dc2626",borderColor:"#fecaca"}};
  return <button style={{...base,...vs[v],...style}} onClick={onClick} disabled={disabled}>{icon&&<Ic n={icon} s={14}/>}{children}</button>;
};

const Inp = ({label,value,onChange,placeholder,type="text",required,help,disabled,style={}}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:C.text2}}>{label}{required&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}</label>}
    <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:disabled?"#f9fafb":C.surface,width:"100%",boxSizing:"border-box",...style}}/>
    {help&&<span style={{fontSize:11,color:C.text3}}>{help}</span>}
  </div>
);

const Sel = ({label,value,onChange,options}) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:C.text2}}>{label}</label>}
    <select value={value||""} onChange={e=>onChange(e.target.value)} style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",background:C.surface,color:C.text1}}>
      {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>
);

const Tog = ({checked,onChange,label,help}) => (
  <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
    <div style={{flex:1}}>
      <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{label}</div>
      {help&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>{help}</div>}
    </div>
    <div onClick={()=>onChange(!checked)} style={{width:40,height:22,borderRadius:99,position:"relative",background:checked?C.accent:"#d1d5db",transition:"background 0.2s",flexShrink:0,cursor:"pointer",marginTop:2}}>
      <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:2,left:checked?20:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
    </div>
  </div>
);

const Modal = ({title,children,onClose,width=500}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:width,boxShadow:"0 20px 40px rgba(0,0,0,.14)",maxHeight:"90vh",overflow:"auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:`1px solid ${C.border}`}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.text1}}>{title}</h2>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.text3,display:"flex"}}><Ic n="x" s={18}/></button>
      </div>
      <div style={{padding:24}}>{children}</div>
    </div>
  </div>
);

const Badge = ({children,color="#6b7280",light}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,background:light?`${color}18`:color,color:light?color:"white",border:`1px solid ${color}28`}}>{children}</span>
);

const Card = ({title,subtitle,children,action}) => (
  <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:20}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`}}>
      <div>
        <div style={{fontSize:15,fontWeight:700,color:C.text1}}>{title}</div>
        {subtitle&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>{subtitle}</div>}
      </div>
      {action}
    </div>
    <div style={{padding:"0 24px 20px"}}>{children}</div>
  </div>
);

// SVG icons
const PATHS = {
  x:"M18 6L6 18M6 6l12 12", plus:"M12 5v14M5 12h14",
  edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  key:"M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  lock:"M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",
  check:"M20 6L9 17l-5-5",
  alertCircle:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01",
  users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  globe:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  chevD:"M6 9l6 6 6-6",
  chevR:"M9 18l6-6-6-6",
  database:"M12 2C8.13 2 5 3.34 5 5v14c0 1.66 3.13 3 7 3s7-1.34 7-3V5c0-1.66-3.13-3-7-3zM5 12c0 1.66 3.13 3 7 3s7-1.34 7-3M5 8c0 1.66 3.13 3 7 3s7-1.34 7-3",
  sliders:"M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
};
const Ic = ({n,s=16,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {PATHS[n]&&<path d={PATHS[n]}/>}
  </svg>
);

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({status}) => {
  const map = { active:{color:"#0ca678",label:"Active"}, invited:{color:"#f59f00",label:"Invited"}, deactivated:{color:"#868e96",label:"Inactive"} };
  const s = map[status] || {color:"#868e96",label:status};
  return <Badge color={s.color} light>{s.label}</Badge>;
};

// ── Users Section ─────────────────────────────────────────────────────────────
const UsersSection = () => {
  const [users, setUsers]     = useState([]);
  const [roles, setRoles]     = useState([]);
  const [orgUnits, setOrgUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const [u, r, envs] = await Promise.all([
      api.get("/users"),
      api.get("/roles"),
      api.get("/environments"),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setRoles(Array.isArray(r) ? r : []);
    // Fetch org units for the first environment
    const envId = Array.isArray(envs) && envs[0]?.id;
    if (envId) {
      const ou = await api.get(`/org-units?environment_id=${envId}`);
      setOrgUnits(Array.isArray(ou) ? ou : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (form) => {
    await api.post("/users", form);
    await load();
    setShowInvite(false);
  };

  const handleUpdate = async (id, updates) => {
    await api.patch(`/users/${id}`, updates);
    await load();
    setEditUser(null);
  };

  const handleDeactivate = async (id) => {
    if (!confirm("Deactivate this user?")) return;
    await api.del(`/users/${id}`);
    load();
  };

  const handleResetPassword = async (id, password) => {
    await api.post(`/users/${id}/reset-password`, { password });
    setResetUser(null);
  };

  const filtered = users.filter(u => !search || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <Card
        title="Users"
        subtitle={`${users.filter(u=>u.status!=='deactivated').length} active users`}
        action={
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{position:"relative"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users…"
                style={{padding:"6px 10px 6px 30px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",width:180,color:C.text1}}/>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:C.text3,display:"flex"}}><Ic n="user" s={13}/></span>
            </div>
            <Btn icon="plus" onClick={()=>setShowInvite(true)}>Invite User</Btn>
          </div>
        }
      >
        {loading ? <div style={{padding:24,textAlign:"center",color:C.text3}}>Loading…</div> : (
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:16}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.border}`}}>
                {["User","Role","Org Unit","Status","Last Login",""].map(h=>(
                  <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.text3,letterSpacing:"0.05em",textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u=>(
                <tr key={u.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"12px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:u.role?.color||C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{color:"white",fontSize:12,fontWeight:700}}>{u.first_name?.[0]}{u.last_name?.[0]}</span>
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{u.first_name} {u.last_name}</div>
                        <div style={{fontSize:11,color:C.text3}}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"12px 12px"}}>
                    {u.role ? <Badge color={u.role.color||C.accent} light>{u.role.name}</Badge> : <span style={{color:C.text3,fontSize:12}}>—</span>}
                  </td>
                  <td style={{padding:"12px 12px"}}>
                    <OrgUnitCell userId={u.id} orgUnitId={u.org_unit_id} orgUnits={orgUnits} onChanged={load}/>
                  </td>
                  <td style={{padding:"12px 12px"}}><StatusBadge status={u.status}/></td>
                  <td style={{padding:"12px 12px",fontSize:12,color:C.text3}}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}</td>
                  <td style={{padding:"12px 12px"}}>
                    <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                      <Btn v="ghost" sz="sm" icon="edit" onClick={()=>setEditUser(u)}/>
                      <Btn v="ghost" sz="sm" icon="key" onClick={()=>setResetUser(u)}/>
                      {u.status !== 'deactivated' && <Btn v="danger" sz="sm" icon="trash" onClick={()=>handleDeactivate(u.id)}/>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showInvite && <InviteUserModal roles={roles} orgUnits={orgUnits} onSave={handleInvite} onClose={()=>setShowInvite(false)}/>}
      {editUser && <EditUserModal user={editUser} roles={roles} orgUnits={orgUnits} onSave={(updates)=>handleUpdate(editUser.id,updates)} onClose={()=>setEditUser(null)}/>}
      {resetUser && <ResetPasswordModal user={resetUser} onSave={(pw)=>handleResetPassword(resetUser.id,pw)} onClose={()=>setResetUser(null)}/>}
    </div>
  );
};

const OrgUnitCell = ({ userId, orgUnitId, orgUnits, onChanged }) => {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [pos, setPos]         = useState({ top:0, left:0 });
  const btnRef                = useRef(null);
  const unit = orgUnits.find(u => u.id === orgUnitId);

  // Position the popup relative to the button on open
  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left });
    setSearch("");
    setOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!btnRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const assign = async (unitId) => {
    setSaving(true);
    if (unitId) await api.patch(`/org-units/${unitId}/assign-user`, { user_id: userId });
    else        await api.patch(`/org-units/unassign-user/${userId}`, {});
    setSaving(false);
    setOpen(false);
    onChanged();
  };

  const filtered = orgUnits.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <button ref={btnRef} onClick={handleOpen} disabled={saving}
        style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 8px", borderRadius:6,
          border:`1px solid ${unit ? unit.color+"40" : C.border}`,
          background: unit ? unit.color+"12" : "transparent",
          color: unit ? unit.color : C.text3, fontSize:11, fontWeight:600,
          cursor:"pointer", fontFamily:F, whiteSpace:"nowrap" }}>
        {saving ? "…" : unit ? unit.name : "Unassigned"}
        <Ic n="chevronDown" s={10}/>
      </button>

      {open && typeof document !== "undefined" && ReactDOM.createPortal(
        <div style={{ position:"fixed", top: pos.top, left: pos.left, zIndex:9999,
          background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
          boxShadow:"0 12px 40px rgba(0,0,0,0.15)", width:240, overflow:"hidden" }}>
          {/* Search */}
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ position:"relative" }}>
              <Ic n="search" s={12} c={C.text3} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)" }}/>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search org units…"
                style={{ width:"100%", boxSizing:"border-box", padding:"5px 8px 5px 26px",
                  borderRadius:7, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F,
                  outline:"none", color:C.text1 }}/>
            </div>
          </div>
          {/* Options */}
          <div style={{ maxHeight:220, overflowY:"auto" }}>
            <div onClick={() => assign(null)}
              style={{ padding:"8px 12px", fontSize:12, color:C.text3, cursor:"pointer",
                borderBottom:`1px solid ${C.border}`, fontStyle:"italic",
                background: !orgUnitId ? C.accentLight : "transparent" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
              onMouseLeave={e=>e.currentTarget.style.background=!orgUnitId?C.accentLight:"transparent"}>
              — Unassigned
            </div>
            {filtered.length === 0 && (
              <div style={{ padding:"12px", fontSize:12, color:C.text3, textAlign:"center", fontStyle:"italic" }}>
                No matches
              </div>
            )}
            {filtered.map(ou => (
              <div key={ou.id} onClick={() => assign(ou.id)}
                style={{ padding:"8px 12px", fontSize:12, cursor:"pointer",
                  background: ou.id === orgUnitId ? C.accentLight : "transparent",
                  borderBottom:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", gap:8 }}
                onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                onMouseLeave={e=>e.currentTarget.style.background=ou.id===orgUnitId?C.accentLight:"transparent"}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:ou.color, flexShrink:0 }}/>
                <div>
                  <div style={{ fontWeight:600, color:C.text1 }}>{ou.name}</div>
                  <div style={{ fontSize:10, color:C.text3 }}>{ou.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const InviteUserModal = ({roles, orgUnits, onSave, onClose}) => {
  const [form,setForm] = useState({email:"",first_name:"",last_name:"",role_id:roles[0]?.id||""});
  const [saving,setSaving] = useState(false);
  const [result,setResult] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.email||!form.first_name||!form.last_name||!form.role_id) return;
    setSaving(true);
    const res = await onSave(form);
    if (res?.temp_password) setResult(res);
    setSaving(false);
  };

  if (result) return (
    <Modal title="User Invited" onClose={onClose}>
      <div style={{textAlign:"center",padding:"8px 0 16px"}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Ic n="check" s={24} c="#16a34a"/></div>
        <p style={{fontSize:14,color:C.text1,fontWeight:600,margin:"0 0 8px"}}>{result.first_name} {result.last_name} has been invited</p>
        <p style={{fontSize:12,color:C.text3,margin:"0 0 20px"}}>Share these credentials securely. They must change their password on first login.</p>
        <div style={{background:"#f8f9fc",borderRadius:10,padding:16,textAlign:"left"}}>
          <div style={{fontSize:12,color:C.text3,marginBottom:4}}>Temporary credentials</div>
          <div style={{fontSize:13,fontFamily:"ui-monospace,monospace",color:C.text1}}>Email: <strong>{result.email}</strong></div>
          <div style={{fontSize:13,fontFamily:"ui-monospace,monospace",color:C.text1,marginTop:4}}>Password: <strong>{result.temp_password}</strong></div>
        </div>
        <Btn style={{marginTop:16}} onClick={onClose}>Done</Btn>
      </div>
    </Modal>
  );

  return (
    <Modal title="Invite New User" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="First Name" value={form.first_name} onChange={v=>set("first_name",v)} required/>
          <Inp label="Last Name" value={form.last_name} onChange={v=>set("last_name",v)} required/>
        </div>
        <Inp label="Email Address" type="email" value={form.email} onChange={v=>set("email",v)} required/>
        <Sel label="Role" value={form.role_id} onChange={v=>set("role_id",v)} options={roles.map(r=>({value:r.id,label:r.name}))}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving||!form.email||!form.first_name}>{saving?"Inviting…":"Send Invite"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

const EditUserModal = ({user, roles, orgUnits, onSave, onClose}) => {
  const [form,setForm] = useState({first_name:user.first_name, last_name:user.last_name, role_id:user.role_id, status:user.status, org_unit_id:user.org_unit_id||""});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal title={`Edit: ${user.first_name} ${user.last_name}`} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="First Name" value={form.first_name} onChange={v=>set("first_name",v)}/>
          <Inp label="Last Name" value={form.last_name} onChange={v=>set("last_name",v)}/>
        </div>
        <Sel label="Role" value={form.role_id} onChange={v=>set("role_id",v)} options={roles.map(r=>({value:r.id,label:r.name}))}/>
        <Sel label="Org Unit" value={form.org_unit_id} onChange={v=>set("org_unit_id",v)}
          options={[{value:"",label:"Unassigned"},...orgUnits.map(o=>({value:o.id,label:`${o.name} (${o.type})`}))]}/>
        <Sel label="Status" value={form.status} onChange={v=>set("status",v)} options={["active","invited","deactivated"].map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={()=>onSave(form)}>Save Changes</Btn>
        </div>
      </div>
    </Modal>
  );
};

const ResetPasswordModal = ({user,onSave,onClose}) => {
  const [pw,setPw] = useState(""); const [confirm,setConfirm] = useState("");
  const valid = pw.length>=8 && pw===confirm;
  return (
    <Modal title={`Reset Password: ${user.first_name}`} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Inp label="New Password" type="password" value={pw} onChange={setPw} help="Min 8 characters"/>
        <Inp label="Confirm Password" type="password" value={confirm} onChange={setConfirm}/>
        {confirm && pw!==confirm && <span style={{fontSize:12,color:"#dc2626"}}>Passwords don't match</span>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={()=>onSave(pw)} disabled={!valid}>Reset Password</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ── Roles & Permissions Section ───────────────────────────────────────────────
const OBJECTS = [{slug:"people",label:"People"},{slug:"jobs",label:"Jobs"},{slug:"talent-pools",label:"Talent Pools"}];
const ACTIONS = ["view","create","edit","delete","export"];
const ROLE_COLORS = ["#3b5bdb","#f59f00","#0ca678","#e03131","#7048e8","#e64980","#1098ad"];

const RolesSection = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get("/roles");
    setRoles(Array.isArray(r) ? r : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectRole = async (role) => {
    setSelectedRole(role);
    const perms = await api.get(`/roles/${role.id}/permissions`);
    setPermissions(Array.isArray(perms) ? perms : []);
  };

  const getPerm = (objectSlug, action) => {
    const p = permissions.find(p => p.object_slug === objectSlug && p.action === action);
    return p ? !!p.allowed : false;
  };

  const togglePerm = (objectSlug, action) => {
    const current = getPerm(objectSlug, action);
    setPermissions(prev => {
      const existing = prev.find(p => p.object_slug === objectSlug && p.action === action);
      if (existing) return prev.map(p => p.object_slug===objectSlug&&p.action===action ? {...p,allowed:current?0:1} : p);
      return [...prev, {object_slug:objectSlug,action,allowed:current?0:1}];
    });
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const payload = OBJECTS.flatMap(obj => ACTIONS.map(action => ({object_slug:obj.slug,action,allowed:getPerm(obj.slug,action)})));
    await api.put(`/roles/${selectedRole.id}/permissions`, {permissions:payload});
    setSaving(false);
  };

  const handleCreateRole = async (form) => {
    await api.post("/roles", form);
    await load();
    setShowCreate(false);
  };

  return (
    <Card title="Roles & Permissions" subtitle="Define what each role can do per object">
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:20,marginTop:16}}>
        {/* Role list */}
        <div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
            {loading ? <div style={{color:C.text3,fontSize:13}}>Loading…</div> : roles.map(role=>(
              <button key={role.id} onClick={()=>selectRole(role)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:`2px solid ${selectedRole?.id===role.id?role.color||C.accent:"transparent"}`,background:selectedRole?.id===role.id?`${role.color||C.accent}10`:"#f8f9fc",cursor:"pointer",fontFamily:F,textAlign:"left",transition:"all .12s"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:role.color||C.accent,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text1,display:"flex",alignItems:"center",gap:6}}>
                    {role.name}
                    {role.is_system?<Badge color="#868e96" light>system</Badge>:null}
                  </div>
                  <div style={{fontSize:11,color:C.text3}}>{role.user_count||0} users</div>
                </div>
              </button>
            ))}
          </div>
          <Btn v="secondary" sz="sm" icon="plus" onClick={()=>setShowCreate(true)} style={{width:"100%",justifyContent:"center"}}>New Role</Btn>
        </div>

        {/* Permission matrix */}
        <div>
          {!selectedRole ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:C.text3,fontSize:13,flexDirection:"column",gap:8,background:"#f8f9fc",borderRadius:12}}>
              <Ic n="sliders" s={24} c="#d1d5db"/>
              Select a role to configure permissions
            </div>
          ) : (
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div>
                  <span style={{fontSize:14,fontWeight:700,color:C.text1}}>{selectedRole.name}</span>
                  <span style={{fontSize:12,color:C.text3,marginLeft:8}}>{selectedRole.description}</span>
                </div>
                <Btn onClick={savePermissions} disabled={saving} sz="sm">{saving?"Saving…":"Save Permissions"}</Btn>
              </div>

              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:"#f8f9fc"}}>
                    <th style={{padding:"8px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",borderRadius:"8px 0 0 8px"}}>Object</th>
                    {ACTIONS.map(a=>(
                      <th key={a} style={{padding:"8px 14px",textAlign:"center",fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em"}}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OBJECTS.map((obj,i)=>(
                    <tr key={obj.slug} style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,color:C.text1}}>{obj.label}</td>
                      {ACTIONS.map(action=>{
                        const allowed = getPerm(obj.slug,action);
                        return (
                          <td key={action} style={{padding:"12px 14px",textAlign:"center"}}>
                            <button onClick={()=>!selectedRole.is_system&&togglePerm(obj.slug,action)} style={{width:24,height:24,borderRadius:6,border:`2px solid ${allowed?selectedRole.color||C.accent:C.border}`,background:allowed?selectedRole.color||C.accent:"transparent",cursor:selectedRole.is_system?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",transition:"all .12s"}}>
                              {allowed&&<Ic n="check" s={12} c="white"/>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedRole.is_system && <p style={{fontSize:11,color:C.text3,marginTop:12,fontStyle:"italic"}}>System role permissions cannot be modified.</p>}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <Modal title="Create Custom Role" onClose={()=>setShowCreate(false)}>
          <CreateRoleForm roles={roles} onSave={handleCreateRole} onClose={()=>setShowCreate(false)}/>
        </Modal>
      )}
    </Card>
  );
};

const CreateRoleForm = ({roles,onSave,onClose}) => {
  const [form,setForm] = useState({name:"",description:"",color:ROLE_COLORS[0],clone_from_role_id:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Inp label="Role Name" value={form.name} onChange={v=>set("name",v)} placeholder="e.g. Senior Recruiter" required/>
      <Inp label="Description" value={form.description} onChange={v=>set("description",v)} placeholder="What can this role do?"/>
      <Sel label="Clone permissions from" value={form.clone_from_role_id} onChange={v=>set("clone_from_role_id",v)} options={[{value:"",label:"Start fresh"},...roles.map(r=>({value:r.id,label:r.name}))]}/>
      <div>
        <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:8}}>Colour</label>
        <div style={{display:"flex",gap:8}}>{ROLE_COLORS.map(c=><button key={c} onClick={()=>set("color",c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:"none",cursor:"pointer",outline:form.color===c?`3px solid ${c}`:"none",outlineOffset:2}}/>)}</div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${C.border}`}}>
        <Btn v="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave(form)} disabled={!form.name} style={{background:form.color,borderColor:form.color}}>Create Role</Btn>
      </div>
    </div>
  );
};

// ── Security Section ──────────────────────────────────────────────────────────
const SecuritySection = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/security/settings").then(d => { setSettings(d); setLoading(false); });
  }, []);

  const set = (k,v) => setSettings(s=>({...s,[k]:v}));

  const handleSave = async () => {
    setSaving(true);
    await api.patch("/security/settings", settings);
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  if (loading||!settings) return <div style={{padding:24,textAlign:"center",color:C.text3}}>Loading…</div>;

  return (
    <div>
      {/* Password Policy */}
      <Card title="Password Policy" subtitle="Rules enforced when users set or change passwords"
        action={<Btn onClick={handleSave} disabled={saving}>{saved?"✓ Saved":saving?"Saving…":"Save Changes"}</Btn>}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:16}}>
          <Inp label="Minimum Length" type="number" value={settings.password_min_length} onChange={v=>set("password_min_length",parseInt(v))} help="Minimum number of characters"/>
          <Inp label="Password Expiry (days)" type="number" value={settings.password_expiry_days} onChange={v=>set("password_expiry_days",parseInt(v))} help="0 = never expires"/>
        </div>
        <div style={{marginTop:4}}>
          <Tog checked={!!settings.password_require_uppercase} onChange={v=>set("password_require_uppercase",v?1:0)} label="Require uppercase letter" help="At least one A–Z character"/>
          <Tog checked={!!settings.password_require_number} onChange={v=>set("password_require_number",v?1:0)} label="Require number" help="At least one 0–9 digit"/>
          <Tog checked={!!settings.password_require_symbol} onChange={v=>set("password_require_symbol",v?1:0)} label="Require symbol" help="At least one special character like !@#$"/>
        </div>
      </Card>

      {/* Session & Login */}
      <Card title="Session & Login Security" subtitle="Control session duration and login attempt limits">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginTop:16}}>
          <Inp label="Session Timeout (minutes)" type="number" value={settings.session_timeout_minutes} onChange={v=>set("session_timeout_minutes",parseInt(v))} help="Inactive sessions expire after this"/>
          <Inp label="Max Login Attempts" type="number" value={settings.max_login_attempts} onChange={v=>set("max_login_attempts",parseInt(v))} help="Before account lockout"/>
          <Inp label="Lockout Duration (minutes)" type="number" value={settings.lockout_duration_minutes} onChange={v=>set("lockout_duration_minutes",parseInt(v))} help="How long account stays locked"/>
        </div>
        <div style={{marginTop:4}}>
          <Tog checked={!!settings.mfa_required} onChange={v=>set("mfa_required",v?1:0)} label="Require MFA for all users" help="Users must set up multi-factor authentication"/>
        </div>
      </Card>

      {/* SSO */}
      <Card title="Single Sign-On (SSO)" subtitle="Allow users to log in via your identity provider">
        <div style={{marginTop:4}}>
          <Tog checked={!!settings.sso_enabled} onChange={v=>set("sso_enabled",v?1:0)} label="Enable SSO" help="Users can log in via OAuth 2.0 / SAML"/>
        </div>
        {settings.sso_enabled ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            <Sel label="SSO Provider" value={settings.sso_provider||""} onChange={v=>set("sso_provider",v)} options={[{value:"",label:"Select provider…"},{value:"google",label:"Google Workspace"},{value:"azure",label:"Microsoft Azure AD"},{value:"okta",label:"Okta"},{value:"saml",label:"Custom SAML"}]}/>
            <Inp label="Domain" value={settings.sso_domain||""} onChange={v=>set("sso_domain",v)} placeholder="yourcompany.com"/>
            <Inp label="Client ID" value={settings.sso_client_id||""} onChange={v=>set("sso_client_id",v)} placeholder="OAuth Client ID"/>
            <Inp label="Client Secret" type="password" value={settings.sso_client_secret||""} onChange={v=>set("sso_client_secret",v)} placeholder="OAuth Client Secret"/>
          </div>
        ) : (
          <div style={{marginTop:12,padding:"12px 16px",background:"#f8f9fc",borderRadius:10,fontSize:12,color:C.text3}}>
            Enable SSO to configure your identity provider. Supports Google Workspace, Microsoft Azure AD, Okta, and custom SAML 2.0.
          </div>
        )}
      </Card>
    </div>
  );
};

// ── Audit Log Section ────────────────────────────────────────────────────────
const AuditLogSection = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api.get(`/security/audit-log?page=${page}&limit=20${filter?`&action=${filter}`:""}`);
    setLogs(d.logs||[]);
    setTotal(d.pagination?.total||0);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const actionColor = (action) => {
    if (action.includes("delete")||action.includes("deactivat")) return "#e03131";
    if (action.includes("create")||action.includes("invite")) return "#0ca678";
    if (action.includes("login")) return "#3b5bdb";
    return "#868e96";
  };

  return (
    <Card title="Audit Log" subtitle={`${total} total events`}
      action={
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",background:C.surface,color:C.text1}}>
          <option value="">All events</option>
          <option value="auth">Authentication</option>
          <option value="user">User management</option>
          <option value="record">Data changes</option>
        </select>
      }>
      {loading ? <div style={{padding:24,textAlign:"center",color:C.text3}}>Loading…</div> : (
        <div style={{marginTop:16}}>
          {logs.length===0 ? (
            <div style={{padding:32,textAlign:"center",color:C.text3,fontSize:13}}>No audit events found</div>
          ) : logs.map(log=>(
            <div key={log.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:actionColor(log.action),flexShrink:0,marginTop:5}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <code style={{fontSize:12,fontFamily:"ui-monospace,monospace",color:actionColor(log.action),fontWeight:600}}>{log.action}</code>
                  {log.actor&&<span style={{fontSize:12,color:C.text3}}>by {log.actor}</span>}
                </div>
                {log.details&&Object.keys(log.details).length>0&&(
                  <div style={{fontSize:11,color:C.text3,marginTop:2,fontFamily:"ui-monospace,monospace"}}>{JSON.stringify(log.details).slice(0,120)}</div>
                )}
              </div>
              <div style={{fontSize:11,color:C.text3,flexShrink:0}}>{new Date(log.created_at).toLocaleString()}</div>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16}}>
            <span style={{fontSize:12,color:C.text3}}>Showing {logs.length} of {total}</span>
            <div style={{display:"flex",gap:6}}>
              <Btn v="secondary" sz="sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Previous</Btn>
              <Btn v="secondary" sz="sm" onClick={()=>setPage(p=>p+1)} disabled={logs.length<20}>Next</Btn>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// ── Active Sessions Section ──────────────────────────────────────────────────
const SessionsSection = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const d = await api.get("/security/sessions");
    setSessions(Array.isArray(d)?d:[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const revoke = async (id) => {
    await api.del(`/security/sessions/${id}`);
    load();
  };

  return (
    <Card title="Active Sessions" subtitle={`${sessions.length} active sessions`}>
      {loading ? <div style={{padding:24,textAlign:"center",color:C.text3}}>Loading…</div> : (
        <div style={{marginTop:16}}>
          {sessions.length===0 ? (
            <div style={{padding:32,textAlign:"center",color:C.text3,fontSize:13}}>No active sessions</div>
          ) : sessions.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"#f0f4ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Ic n="user" s={14} c={C.accent}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{s.user?.first_name} {s.user?.last_name}</div>
                <div style={{fontSize:11,color:C.text3}}>{s.user?.email} · Token: {s.token} · Expires: {new Date(s.expires_at).toLocaleString()}</div>
              </div>
              <Btn v="danger" sz="sm" onClick={()=>revoke(s.id)}>Revoke</Btn>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ── Data Model Section ────────────────────────────────────────────────────────
const FIELD_TYPES_DM = [
  {value:"text",label:"Text",icon:"T"},{value:"textarea",label:"Long Text",icon:"¶"},{value:"number",label:"Number",icon:"#"},
  {value:"email",label:"Email",icon:"@"},{value:"phone",label:"Phone",icon:"☎"},{value:"url",label:"URL",icon:"🔗"},
  {value:"date",label:"Date",icon:"📅"},{value:"boolean",label:"Boolean",icon:"◉"},{value:"select",label:"Select",icon:"▾"},
  {value:"multi_select",label:"Multi Select",icon:"☑"},{value:"currency",label:"Currency",icon:"$"},{value:"rating",label:"Rating",icon:"★"},
];
const COLORS_DM = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#64748b"];

const DataModelSection = () => {
  const [envs,       setEnvs]       = useState([]);
  const [selEnv,     setSelEnv]     = useState(null);
  const [objects,    setObjects]    = useState([]);
  const [selObj,     setSelObj]     = useState(null);
  const [fields,     setFields]     = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showField,  setShowField]  = useState(false);
  const [editField,  setEditField]  = useState(null);
  const [loading,    setLoading]    = useState(false);

  // Load envs
  useEffect(() => {
    api.get("/environments").then(d => {
      const list = Array.isArray(d) ? d : [];
      setEnvs(list);
      const def = list.find(e => e.is_default) || list[0];
      if (def) setSelEnv(def);
    });
  }, []);

  // Load objects when env changes
  useEffect(() => {
    if (!selEnv) return;
    api.get(`/objects?environment_id=${selEnv.id}`).then(d => {
      setObjects(Array.isArray(d) ? d : []);
      setSelObj(null);
    });
  }, [selEnv?.id]);

  // Load fields when object selected
  useEffect(() => {
    if (!selObj) return;
    setLoading(true);
    api.get(`/fields?object_id=${selObj.id}`).then(d => {
      setFields(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, [selObj?.id]);

  const reloadFields = () => api.get(`/fields?object_id=${selObj.id}`).then(d => setFields(Array.isArray(d)?d:[]));
  const reloadObjects = () => api.get(`/objects?environment_id=${selEnv.id}`).then(d => setObjects(Array.isArray(d)?d:[]));

  const saveField = async (payload, id) => {
    if (id) await api.patch(`/fields/${id}`, payload);
    else    await api.post("/fields", payload);
    await reloadFields();
    setShowField(false); setEditField(null);
  };

  const deleteField = async (f) => {
    if (!confirm(`Delete field "${f.name}"? This removes data from all records.`)) return;
    await api.del(`/fields/${f.id}`);
    reloadFields();
  };

  const createObject = async (payload) => {
    await api.post("/objects", { ...payload, environment_id: selEnv.id });
    await reloadObjects();
    setShowCreate(false);
  };

  // ── Field form modal ──────────────────────────────────────────────────────
  const FieldModal = ({ field, onClose }) => {
    const isEdit = !!field?.id;
    const [form, setForm] = useState({
      name: field?.name||"", api_key: field?.api_key||"", field_type: field?.field_type||"text",
      is_required: field?.is_required||false, show_in_list: field?.show_in_list!==undefined?!!field.show_in_list:true,
      options: field?.options ? (Array.isArray(field.options)?field.options.join(", "):field.options) : "",
      placeholder: field?.placeholder||"", help_text: field?.help_text||"",
    });
    const [autoKey, setAutoKey] = useState(!isEdit);
    const [saving, setSaving] = useState(false);
    const set = (k,v) => setForm(f=>({...f,[k]:v}));
    const handleName = v => { set("name",v); if(autoKey) set("api_key", v.toLowerCase().replace(/[^a-z0-9]/g,"_").replace(/__+/g,"_").replace(/^_|_$/g,"")); };
    const handle = async () => {
      setSaving(true);
      await saveField({ ...form, object_id: selObj.id, environment_id: selEnv.id,
        options: ["select","multi_select"].includes(form.field_type) ? form.options.split(",").map(s=>s.trim()).filter(Boolean) : undefined
      }, field?.id);
      setSaving(false);
    };
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div style={{background:"#fff",borderRadius:16,padding:"24px 28px",width:520,maxHeight:"90vh",overflow:"auto",fontFamily:F,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
          <div style={{fontSize:16,fontWeight:800,color:C.text1,marginBottom:16}}>{isEdit?"Edit":"New"} Field</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:16}}>
            {FIELD_TYPES_DM.map(ft=>(
              <button key={ft.value} onClick={()=>set("field_type",ft.value)} style={{padding:"7px 4px",borderRadius:8,border:`2px solid ${form.field_type===ft.value?"#3b5bdb":"#e8eaed"}`,background:form.field_type===ft.value?"#3b5bdb":"#fff",color:form.field_type===ft.value?"#fff":"#6b7280",cursor:"pointer",fontSize:10,fontWeight:600,textAlign:"center",fontFamily:F}}>
                <div>{ft.icon}</div><div>{ft.label}</div>
              </button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <Inp label="Field Name" value={form.name} onChange={handleName} required/>
            <Inp label="API Key" value={form.api_key} onChange={v=>{set("api_key",v);setAutoKey(false);}} disabled={isEdit&&field?.is_system}/>
          </div>
          {["select","multi_select"].includes(form.field_type) && <div style={{marginBottom:12}}><Inp label="Options (comma-separated)" value={form.options} onChange={v=>set("options",v)} placeholder="Option A, Option B"/></div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <Inp label="Placeholder" value={form.placeholder} onChange={v=>set("placeholder",v)}/>
            <Inp label="Help Text" value={form.help_text} onChange={v=>set("help_text",v)}/>
          </div>
          <div style={{display:"flex",gap:16,marginBottom:16}}>
            {[{k:"is_required",l:"Required"},{k:"show_in_list",l:"Show in list"}].map(({k,l})=>(
              <label key={k} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,fontWeight:600,color:C.text2}}>
                <input type="checkbox" checked={!!form[k]} onChange={e=>set(k,e.target.checked)}/>{l}
              </label>
            ))}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:`1px solid ${C.border}`,paddingTop:16}}>
            <Btn v="secondary" onClick={onClose}>Cancel</Btn>
            <Btn onClick={handle} disabled={saving||!form.name}>{saving?"Saving…":isEdit?"Save Changes":"Add Field"}</Btn>
          </div>
        </div>
      </div>
    );
  };

  // ── Create object modal ───────────────────────────────────────────────────
  const CreateObjectModal = ({ onClose }) => {
    const [form, setForm] = useState({name:"",plural_name:"",slug:"",color:"#6366f1",description:""});
    const [saving, setSaving] = useState(false);
    const [autoSlug, setAutoSlug] = useState(true);
    const [autoPlural, setAutoPlural] = useState(true);
    const set = (k,v) => setForm(f=>({...f,[k]:v}));
    const handleName = v => { set("name",v); if(autoSlug) set("slug",v.toLowerCase().replace(/[^a-z0-9]/g,"-").replace(/--+/g,"-").replace(/^-|-$/g,"")); if(autoPlural) set("plural_name",v+"s"); };
    const handle = async () => { setSaving(true); await createObject(form); setSaving(false); };
    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div style={{background:"#fff",borderRadius:16,padding:"24px 28px",width:440,fontFamily:F,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
          <div style={{fontSize:16,fontWeight:800,color:C.text1,marginBottom:16}}>New Object</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Name" value={form.name} onChange={handleName} required/>
              <Inp label="Plural Name" value={form.plural_name} onChange={v=>{set("plural_name",v);setAutoPlural(false);}}/>
            </div>
            <Inp label="Slug" value={form.slug} onChange={v=>{set("slug",v);setAutoSlug(false);}} help="Used in API and URLs"/>
            <Inp label="Description" value={form.description} onChange={v=>set("description",v)}/>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Color</label>
              <div style={{display:"flex",gap:6}}>
                {COLORS_DM.map(c=><button key={c} onClick={()=>set("color",c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:"none",cursor:"pointer",outline:form.color===c?`3px solid ${c}`:"none",outlineOffset:2}}/>)}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:`1px solid ${C.border}`,paddingTop:16,marginTop:16}}>
            <Btn v="secondary" onClick={onClose}>Cancel</Btn>
            <Btn onClick={handle} disabled={saving||!form.name} style={{background:form.color}}>{saving?"Creating…":"Create Object"}</Btn>
          </div>
        </div>
      </div>
    );
  };

  if (!selEnv) return <div style={{padding:40,textAlign:"center",color:C.text3}}>Loading…</div>;

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text1}}>Data Model</div>
          <div style={{fontSize:12,color:C.text3}}>Configure objects and fields for each environment</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <select value={selEnv?.id||""} onChange={e=>setSelEnv(envs.find(v=>v.id===e.target.value))}
            style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,fontFamily:F,outline:"none",background:"#fff",color:C.text1}}>
            {envs.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          {selObj && <Btn v="ghost" sz="sm" icon="x" onClick={()=>setSelObj(null)}>Back to Objects</Btn>}
          {!selObj && <Btn sz="sm" icon="plus" onClick={()=>setShowCreate(true)}>New Object</Btn>}
          {selObj  && <Btn sz="sm" icon="plus" onClick={()=>setShowField(true)}>Add Field</Btn>}
        </div>
      </div>

      {/* Objects grid */}
      {!selObj && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
          {objects.map(o=>(
            <div key={o.id} onClick={()=>setSelObj(o)} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,padding:"16px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)";e.currentTarget.style.borderColor="#d1d5db";}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.border;}}>
              <div style={{width:40,height:40,borderRadius:10,background:o.color||"#6366f1",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{color:"white",fontSize:16,fontWeight:700}}>{o.name.charAt(0)}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{o.plural_name||o.name}</div>
                <div style={{fontSize:11,color:C.text3}}>{o.field_count||0} fields · {o.record_count||0} records {o.is_system&&"· system"}</div>
              </div>
              <Ic n="chevR" s={14} c={C.text3}/>
            </div>
          ))}
        </div>
      )}

      {/* Fields list */}
      {selObj && (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"14px 16px",background:"#fff",borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{width:36,height:36,borderRadius:9,background:selObj.color||"#6366f1",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{color:"white",fontSize:14,fontWeight:700}}>{selObj.name.charAt(0)}</span>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:C.text1}}>{selObj.name} Schema</div>
              <div style={{fontSize:11,color:C.text3}}>{fields.length} fields</div>
            </div>
          </div>
          {loading ? <div style={{padding:40,textAlign:"center",color:C.text3}}>Loading fields…</div> : (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {fields.map(f=>(
                <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#fff",borderRadius:10,border:`1px solid ${C.border}`}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:13,fontWeight:600,color:C.text1}}>{f.name}</span>
                      {f.is_system&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:"#f1f5f9",color:"#64748b",fontWeight:600}}>system</span>}
                      {!!f.is_required&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:"#fef2f2",color:"#ef4444",fontWeight:600}}>required</span>}
                    </div>
                    <div style={{fontSize:11,color:C.text3,marginTop:2}}><code style={{fontFamily:"monospace"}}>{f.api_key}</code> · {f.field_type}</div>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <Btn v="ghost" sz="sm" icon="edit" onClick={()=>setEditField(f)}/>
                    {!f.is_system&&<Btn v="ghost" sz="sm" icon="trash" onClick={()=>deleteField(f)} style={{color:"#ef4444"}}/>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreate && <CreateObjectModal onClose={()=>setShowCreate(false)}/>}
      {(showField||editField) && <FieldModal field={editField} onClose={()=>{setShowField(false);setEditField(null);}}/>}
    </div>
  );
};

// ── Main Settings Page ────────────────────────────────────────────────────────
const SECTIONS = [
  { id:"datamodel",   icon:"database", label:"Data Model" },
  { id:"users",       icon:"users",    label:"Users" },
  { id:"roles",       icon:"shield",   label:"Roles & Permissions" },
  { id:"org",         icon:"layers",   label:"Org Structure" },
  { id:"security",    icon:"lock",     label:"Security" },
  { id:"sessions",    icon:"activity", label:"Active Sessions" },
  { id:"audit",       icon:"key",      label:"Audit Log" },
];

const SUPER_ADMIN_SECTIONS = [
  { id:"superadmin",  icon:"zap",      label:"Super Admin" },
];

export default function SettingsPage({ currentUser, environment }) {
  const [activeSection, setActiveSection] = useState("datamodel");

  // Super admin check — currentUser prop from App, fallback to localStorage
  const user = currentUser || (() => { try { return JSON.parse(localStorage.getItem("talentos_user")||"{}"); } catch { return {}; } })();
  const isSuperAdmin = user?.role_name === "super_admin" || user?.role_name === "Super Admin" || user?.is_super_admin;

  return (
    <div style={{display:"flex",gap:0,minHeight:"100%"}}>
      {/* Settings sidebar */}
      <div style={{width:200,flexShrink:0,paddingRight:24}}>
        <h1 style={{margin:"0 0 20px",fontSize:20,fontWeight:800,color:C.text1}}>Settings</h1>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setActiveSection(s.id)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,border:"none",cursor:"pointer",background:activeSection===s.id?"#f0f4ff":"transparent",color:activeSection===s.id?C.accent:C.text2,fontSize:13,fontWeight:activeSection===s.id?700:500,fontFamily:F,textAlign:"left",transition:"all .12s"}}>
              <Ic n={s.icon} s={15}/>{s.label}
            </button>
          ))}

          {/* Super Admin section — divider + gated nav item */}
          <div style={{ margin:"12px 0 6px", borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.08em", padding:"0 10px 4px" }}>System</div>
            {SUPER_ADMIN_SECTIONS.map(s=>(
              <button key={s.id} onClick={()=>setActiveSection(s.id)}
                style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,border:"none",cursor:"pointer",
                  background:activeSection===s.id?"#fef3c7":"transparent",
                  color:activeSection===s.id?"#92400e":C.text2,
                  fontSize:13,fontWeight:activeSection===s.id?700:500,fontFamily:F,textAlign:"left",transition:"all .12s"}}>
                <Ic n={s.icon} s={15}/>{s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,minWidth:0}}>
        {activeSection==="datamodel" && <DataModelSection/>}
        {activeSection==="users"     && <UsersSection/>}
        {activeSection==="roles"     && <RolesSection/>}
        {activeSection==="org"       && <OrgChart environment={environment}/>}
        {activeSection==="security"  && <SecuritySection/>}
        {activeSection==="sessions"  && <SessionsSection/>}
        {activeSection==="audit"     && <AuditLogSection/>}
        {activeSection==="superadmin" && <SuperAdminSection/>}
      </div>
    </div>
  );
}
