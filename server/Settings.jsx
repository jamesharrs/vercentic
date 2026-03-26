import { useState, useEffect, useCallback } from "react";

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
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const [u, r] = await Promise.all([api.get("/users"), api.get("/roles")]);
    setUsers(Array.isArray(u) ? u : []);
    setRoles(Array.isArray(r) ? r : []);
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
                {["User","Role","Status","Last Login",""].map(h=>(
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

      {showInvite && <InviteUserModal roles={roles} onSave={handleInvite} onClose={()=>setShowInvite(false)}/>}
      {editUser && <EditUserModal user={editUser} roles={roles} onSave={(updates)=>handleUpdate(editUser.id,updates)} onClose={()=>setEditUser(null)}/>}
      {resetUser && <ResetPasswordModal user={resetUser} onSave={(pw)=>handleResetPassword(resetUser.id,pw)} onClose={()=>setResetUser(null)}/>}
    </div>
  );
};

const InviteUserModal = ({roles,onSave,onClose}) => {
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

const EditUserModal = ({user,roles,onSave,onClose}) => {
  const [form,setForm] = useState({first_name:user.first_name,last_name:user.last_name,role_id:user.role_id,status:user.status});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal title={`Edit: ${user.first_name} ${user.last_name}`} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="First Name" value={form.first_name} onChange={v=>set("first_name",v)}/>
          <Inp label="Last Name" value={form.last_name} onChange={v=>set("last_name",v)}/>
        </div>
        <Sel label="Role" value={form.role_id} onChange={v=>set("role_id",v)} options={roles.map(r=>({value:r.id,label:r.name}))}/>
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

// ── Main Settings Page ────────────────────────────────────────────────────────
const SECTIONS = [
  { id:"users",    icon:"users",    label:"Users" },
  { id:"roles",    icon:"shield",   label:"Roles & Permissions" },
  { id:"security", icon:"lock",     label:"Security" },
  { id:"sessions", icon:"activity", label:"Active Sessions" },
  { id:"audit",    icon:"key",      label:"Audit Log" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("users");

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
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,minWidth:0}}>
        {activeSection==="users"    && <UsersSection/>}
        {activeSection==="roles"    && <RolesSection/>}
        {activeSection==="security" && <SecuritySection/>}
        {activeSection==="sessions" && <SessionsSection/>}
        {activeSection==="audit"    && <AuditLogSection/>}
      </div>
    </div>
  );
}
