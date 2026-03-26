import { useState, useEffect, useCallback, useRef } from "react";

const api = {
  get:   p     => fetch(`/api${p}`).then(r=>r.json()),
  post:  (p,b) => fetch(`/api${p}`,{method:"POST",  headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  patch: (p,b) => fetch(`/api${p}`,{method:"PATCH", headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  del:   p     => fetch(`/api${p}`,{method:"DELETE"}).then(r=>r.json()),
};

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg:"#f8f9fc", surface:"#ffffff", border:"#e8eaed", border2:"#d1d5db",
  text1:"#111827", text2:"#4b5563", text3:"#9ca3af", accent:"#3b5bdb",
  hover:"#f3f4f6"
};

// ── SVG Icons ────────────────────────────────────────────────────────────────
const PATHS = {
  x:"M18 6L6 18M6 6l12 12", plus:"M12 5v14M5 12h14",
  search:"M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  arrowL:"M19 12H5M12 19l-7-7 7-7",
  chevR:"M9 18l6-6-6-6", chevD:"M6 9l6 6 6-6",
  list:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  kanban:"M3 3h7v18H3zM14 3h7v9h-7zM14 16h7v5h-7z",
  filter:"M22 3H2l8 9.46V19l4 2V12.46L22 3",
  download:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 0-2-2v-4M7 10l5 5 5-5M12 15V3",
  check:"M20 6L9 17l-5-5", star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  phone:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  link:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  calendar:"M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
  users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  briefcase:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  layers:"M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  circle:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  moreH:"M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",
  clipboard:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z",
};
const Ic = ({n,s=16,c="currentColor"}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {PATHS[n]&&<path d={PATHS[n]}/>}
  </svg>
);

// ── Design Primitives ────────────────────────────────────────────────────────
const Btn = ({children,onClick,v="primary",sz="md",icon,disabled,style={}}) => {
  const base={display:"inline-flex",alignItems:"center",gap:6,fontFamily:F,fontWeight:600,cursor:disabled?"not-allowed":"pointer",border:"1px solid transparent",borderRadius:8,transition:"all 0.15s",opacity:disabled?0.5:1,...(sz==="sm"?{fontSize:12,padding:"5px 10px"}:{fontSize:13,padding:"8px 14px"})};
  const vs={
    primary:{background:C.accent,color:"#fff",borderColor:C.accent},
    secondary:{background:C.surface,color:C.text1,borderColor:C.border},
    ghost:{background:"transparent",color:C.text2,borderColor:"transparent"},
    danger:{background:"#fef2f2",color:"#dc2626",borderColor:"#fecaca"},
  };
  return <button style={{...base,...vs[v],...style}} onClick={onClick} disabled={disabled}>{icon&&<Ic n={icon} s={14}/>}{children}</button>;
};

const Badge = ({children,color="#6b7280",light=true}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,background:light?`${color}18`:color,color:light?color:"white",border:`1px solid ${color}28`,whiteSpace:"nowrap"}}>{children}</span>
);

const Modal = ({title,children,onClose,width=600}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:C.surface,borderRadius:16,width:"100%",maxWidth:width,boxShadow:"0 24px 48px rgba(0,0,0,.18)",maxHeight:"92vh",overflow:"auto",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.text1}}>{title}</h2>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:C.text3,display:"flex",borderRadius:6}}><Ic n="x" s={18}/></button>
      </div>
      <div style={{padding:24,overflow:"auto"}}>{children}</div>
    </div>
  </div>
);

// ── Field value renderer ─────────────────────────────────────────────────────
const FieldValue = ({value, fieldType, compact=false}) => {
  if (value === null || value === undefined || value === "") return <span style={{color:C.text3,fontSize:12}}>—</span>;

  if (fieldType === "boolean") return value ? <Badge color="#0ca678">Yes</Badge> : <Badge color="#868e96">No</Badge>;
  if (fieldType === "select") return <Badge color={C.accent}>{value}</Badge>;
  if (fieldType === "multi_select" && Array.isArray(value)) return (
    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{value.map(v=><Badge key={v} color={C.accent}>{v}</Badge>)}</div>
  );
  if (fieldType === "rating") return (
    <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(i=><Ic key={i} n="star" s={13} c={i<=value?"#f59f00":"#d1d5db"}/>)}</div>
  );
  if (fieldType === "email") return <a href={`mailto:${value}`} style={{color:C.accent,fontSize:13,textDecoration:"none"}}>{value}</a>;
  if (fieldType === "url") return <a href={value} target="_blank" rel="noreferrer" style={{color:C.accent,fontSize:13,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}><Ic n="link" s={12}/>{compact?"Link":value}</a>;
  if (fieldType === "phone") return <a href={`tel:${value}`} style={{color:C.text1,fontSize:13,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}><Ic n="phone" s={12}/>{value}</a>;
  if (fieldType === "date" || fieldType === "datetime") return <span style={{fontSize:13,color:C.text2}}>{new Date(value).toLocaleDateString()}</span>;
  if (fieldType === "currency") return <span style={{fontSize:13,fontWeight:600,color:C.text1}}>{typeof value === "number" ? `$${value.toLocaleString()}` : value}</span>;
  if (fieldType === "textarea" || fieldType === "rich_text") return compact ? <span style={{fontSize:13,color:C.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200,display:"block"}}>{value}</span> : <p style={{margin:0,fontSize:13,color:C.text2,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{value}</p>;

  return <span style={{fontSize:13,color:C.text1}}>{String(value)}</span>;
};

// ── Field editor for forms ────────────────────────────────────────────────────
const FieldEditor = ({field, value, onChange}) => {
  const base = {padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,width:"100%",boxSizing:"border-box"};

  if (field.field_type === "boolean") return (
    <div style={{display:"flex",gap:12}}>
      {["Yes","No"].map(opt=>(
        <label key={opt} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,color:C.text1}}>
          <input type="radio" checked={(opt==="Yes")?!!value:!value} onChange={()=>onChange(opt==="Yes")} style={{accentColor:C.accent}}/>
          {opt}
        </label>
      ))}
    </div>
  );

  if (field.field_type === "select") return (
    <select value={value||""} onChange={e=>onChange(e.target.value)} style={{...base,cursor:"pointer"}}>
      <option value="">Select…</option>
      {(field.options||[]).map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );

  if (field.field_type === "multi_select") {
    const vals = Array.isArray(value) ? value : [];
    return (
      <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"6px 10px",border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,minHeight:38}}>
        {vals.map(v=>(
          <span key={v} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",background:`${C.accent}18`,color:C.accent,borderRadius:99,fontSize:12,fontWeight:600}}>
            {v}<button onClick={()=>onChange(vals.filter(x=>x!==v))} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:C.accent,display:"flex",lineHeight:1}}>×</button>
          </span>
        ))}
        <select value="" onChange={e=>{if(e.target.value&&!vals.includes(e.target.value))onChange([...vals,e.target.value]);}} style={{border:"none",outline:"none",fontSize:12,color:C.text3,fontFamily:F,background:"transparent",cursor:"pointer"}}>
          <option value="">+ Add…</option>
          {(field.options||[]).filter(o=>!vals.includes(o)).map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (field.field_type === "rating") return (
    <div style={{display:"flex",gap:4}}>
      {[1,2,3,4,5].map(i=>(
        <button key={i} onClick={()=>onChange(i)} style={{background:"none",border:"none",cursor:"pointer",padding:2}}>
          <Ic n="star" s={20} c={i<=(value||0)?"#f59f00":"#d1d5db"}/>
        </button>
      ))}
    </div>
  );

  if (field.field_type === "textarea" || field.field_type === "rich_text") return (
    <textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={4} placeholder={field.placeholder||""}
      style={{...base,resize:"vertical",lineHeight:1.6}}/>
  );

  if (field.field_type === "date") return <input type="date" value={value||""} onChange={e=>onChange(e.target.value)} style={base}/>;
  if (field.field_type === "datetime") return <input type="datetime-local" value={value||""} onChange={e=>onChange(e.target.value)} style={base}/>;
  if (field.field_type === "number" || field.field_type === "currency") return (
    <input type="number" value={value||""} onChange={e=>onChange(parseFloat(e.target.value)||"")} placeholder={field.placeholder||""} style={base}/>
  );
  if (field.field_type === "email") return <input type="email" value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||""} style={base}/>;
  if (field.field_type === "phone") return <input type="tel" value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||""} style={base}/>;
  if (field.field_type === "url") return <input type="url" value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||""} style={base}/>;

  return <input type="text" value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder||""} style={base}/>;
};

// ── Quick Add / Full Record Form ─────────────────────────────────────────────
const RecordForm = ({objectDef, record, onSave, onClose, title}) => {
  const [data, setData] = useState(record?.data || {});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fields = (objectDef.fields||[]).filter(f=>f.show_in_form);

  const validate = () => {
    const errs = {};
    fields.filter(f=>f.is_required).forEach(f=>{
      if (!data[f.api_key] && data[f.api_key] !== 0) errs[f.api_key] = "Required";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave(data);
    setSaving(false);
  };

  const setField = (key,val) => setData(d=>({...d,[key]:val}));

  return (
    <Modal title={title||"New Record"} onClose={onClose} width={640}>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:4}}>
          {fields.map(field=>(
            <div key={field.id} style={{
              gridColumn: ["textarea","rich_text","multi_select"].includes(field.field_type) ? "1/-1" : "auto",
              display:"flex",flexDirection:"column",gap:4
            }}>
              <label style={{fontSize:12,fontWeight:600,color:C.text2,letterSpacing:"0.02em"}}>
                {field.name}{!!field.is_required&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}
              </label>
              <FieldEditor field={field} value={data[field.api_key]} onChange={v=>setField(field.api_key,v)}/>
              {errors[field.api_key]&&<span style={{fontSize:11,color:"#ef4444"}}>{errors[field.api_key]}</span>}
              {field.help_text&&<span style={{fontSize:11,color:C.text3}}>{field.help_text}</span>}
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:16,borderTop:`1px solid ${C.border}`,marginTop:8}}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>{saving?"Saving…":record?"Save Changes":"Create Record"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ── Record Detail Panel (slide-in) ───────────────────────────────────────────
const RecordDetail = ({record, objectDef, onClose, onUpdate, onDelete}) => {
  const [editing, setEditing] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    api.get(`/records/${record.id}/activity`).then(d=>setActivity(Array.isArray(d)?d:[]));
  }, [record.id]);

  const fields = objectDef.fields || [];
  const primaryField = fields.find(f=>f.api_key==="first_name"||f.api_key==="job_title"||f.api_key==="pool_name") || fields[0];
  const title = primaryField ? (record.data[primaryField.api_key]||"Untitled") : "Record";
  const subtitle = fields.find(f=>f.api_key==="current_title"||f.api_key==="department"||f.api_key==="category");
  const statusField = fields.find(f=>f.api_key==="status");
  const listFields = fields.filter(f=>f.show_in_list && f.api_key !== primaryField?.api_key);

  const handleDelete = async () => {
    if (!confirm(`Delete this ${objectDef.name}? This cannot be undone.`)) return;
    await api.del(`/records/${record.id}`);
    onDelete(record.id);
  };

  const avatar = title.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  return (
    <div style={{
      position:"fixed",right:0,top:0,bottom:0,width:560,background:C.surface,
      boxShadow:"-8px 0 32px rgba(0,0,0,.12)",zIndex:200,display:"flex",flexDirection:"column",
      animation:"slideIn 0.2s ease"
    }}>
      <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      {/* Header */}
      <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
          <div style={{width:48,height:48,borderRadius:14,background:objectDef.color||C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{color:"white",fontWeight:800,fontSize:16}}>{avatar}</span>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.text1,lineHeight:1.2}}>{
              fields.find(f=>f.api_key==="first_name") && fields.find(f=>f.api_key==="last_name")
                ? `${record.data.first_name||""} ${record.data.last_name||""}`.trim() || "Untitled"
                : title
            }</h2>
            {subtitle && record.data[subtitle.api_key] && (
              <p style={{margin:"4px 0 0",fontSize:13,color:C.text2}}>{record.data[subtitle.api_key]}</p>
            )}
            <div style={{display:"flex",gap:8,marginTop:6,alignItems:"center"}}>
              {statusField && record.data.status && <Badge color={C.accent}>{record.data.status}</Badge>}
              <span style={{fontSize:11,color:C.text3}}>Created {new Date(record.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <Btn v="secondary" sz="sm" icon="edit" onClick={()=>setEditing(true)}>Edit</Btn>
            <Btn v="danger" sz="sm" icon="trash" onClick={handleDelete}/>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:6,color:C.text3,display:"flex",borderRadius:6}}><Ic n="x" s={18}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,marginTop:16,borderBottom:`1px solid ${C.border}`,marginBottom:-1}}>
          {["details","activity"].map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"8px 16px",border:"none",background:"none",cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:600,color:activeTab===tab?C.accent:C.text3,borderBottom:`2px solid ${activeTab===tab?C.accent:"transparent"}`,transition:"all .15s",textTransform:"capitalize"}}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,overflow:"auto",padding:"20px 24px"}}>
        {activeTab==="details" ? (
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {fields.map(field => (
              <div key={field.id} style={{display:"flex",alignItems:"flex-start",gap:16,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:140,flexShrink:0,fontSize:12,fontWeight:600,color:C.text3,paddingTop:2}}>{field.name}</div>
                <div style={{flex:1,minWidth:0}}>
                  <FieldValue value={record.data[field.api_key]} fieldType={field.field_type}/>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {activity.length===0 ? (
              <div style={{padding:32,textAlign:"center",color:C.text3,fontSize:13}}>No activity yet</div>
            ) : activity.map(a=>(
              <div key={a.id} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:a.action==="created"?"#0ca678":"#3b5bdb",flexShrink:0,marginTop:5}}/>
                <div>
                  <div style={{fontSize:13,color:C.text1,fontWeight:500}}>
                    {a.action==="created"?"Record created":"Record updated"}
                    {a.actor&&<span style={{color:C.text3}}> by {a.actor}</span>}
                  </div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}>{new Date(a.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <RecordForm
          objectDef={objectDef}
          record={record}
          title={`Edit ${objectDef.name}`}
          onSave={async (data) => { await onUpdate(record.id, data); setEditing(false); }}
          onClose={()=>setEditing(false)}
        />
      )}
    </div>
  );
};

// ── Table View ────────────────────────────────────────────────────────────────
const TableView = ({objectDef, environmentId, onSelectRecord}) => {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const searchRef = useRef(null);

  const listFields = (objectDef.fields||[]).filter(f=>f.show_in_list).slice(0,7);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api.get(`/records?object_id=${objectDef.id}&environment_id=${environmentId}&page=${page}&limit=25${search?`&search=${encodeURIComponent(search)}`:""}`);
    setRecords(d.records||[]);
    setTotal(d.pagination?.total||0);
    setLoading(false);
  }, [objectDef.id, environmentId, page, search]);

  useEffect(()=>{ load(); },[load]);

  // debounce search
  useEffect(()=>{ const t = setTimeout(()=>setSearch(searchInput),300); return ()=>clearTimeout(t); },[searchInput]);

  const handleCreate = async (data) => {
    await api.post("/records", {object_id:objectDef.id, environment_id:environmentId, data});
    await load();
    setShowAdd(false);
  };

  const handleUpdate = async (id, data) => {
    await api.patch(`/records/${id}`, {data});
    await load();
    setSelectedRecord(prev => prev ? {...prev, data:{...prev.data,...data}} : null);
  };

  const handleDelete = async (id) => {
    setRecords(r=>r.filter(x=>x.id!==id));
    setSelectedRecord(null);
    setTotal(t=>t-1);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} records?`)) return;
    for (const id of selectedIds) await api.del(`/records/${id}`);
    setSelectedIds(new Set());
    load();
  };

  const toggleSelect = (id) => setSelectedIds(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = () => setSelectedIds(prev => prev.size===records.length ? new Set() : new Set(records.map(r=>r.id)));

  const primaryField = (objectDef.fields||[]).find(f=>f.api_key==="first_name"||f.api_key==="job_title"||f.api_key==="pool_name") || listFields[0];

  const getRecordTitle = (record) => {
    if (record.data.first_name) return `${record.data.first_name} ${record.data.last_name||""}`.trim();
    return record.data[primaryField?.api_key] || "Untitled";
  };

  const getRecordInitials = (record) => getRecordTitle(record).split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  const pages = Math.ceil(total/25);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:"1 1 260px",maxWidth:360}}>
          <input ref={searchRef} value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder={`Search ${objectDef.plural_name||objectDef.name}…`}
            style={{padding:"8px 12px 8px 34px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",width:"100%",boxSizing:"border-box",color:C.text1}}/>
          <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:C.text3,display:"flex"}}><Ic n="search" s={14}/></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto"}}>
          {selectedIds.size>0 && (
            <Btn v="danger" sz="sm" icon="trash" onClick={handleBulkDelete}>Delete {selectedIds.size}</Btn>
          )}
          <span style={{fontSize:12,color:C.text3}}>{total} records</span>
          <Btn icon="plus" onClick={()=>setShowAdd(true)}>Add {objectDef.name}</Btn>
        </div>
      </div>

      {/* Table */}
      <div style={{flex:1,overflow:"auto",background:C.surface,borderRadius:12,border:`1px solid ${C.border}`}}>
        <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
          <thead>
            <tr style={{background:"#f8f9fc",borderBottom:`2px solid ${C.border}`}}>
              <th style={{width:44,padding:"10px 14px"}}>
                <input type="checkbox" checked={selectedIds.size===records.length&&records.length>0} onChange={toggleAll} style={{accentColor:C.accent,cursor:"pointer"}}/>
              </th>
              {listFields.map(f=>(
                <th key={f.id} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:C.text3,letterSpacing:"0.05em",textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {f.name}
                </th>
              ))}
              <th style={{width:60,padding:"10px 14px"}}/>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={listFields.length+2} style={{padding:40,textAlign:"center",color:C.text3}}>Loading…</td></tr>
            ) : records.length===0 ? (
              <tr><td colSpan={listFields.length+2}>
                <div style={{padding:"48px 24px",textAlign:"center"}}>
                  <div style={{width:48,height:48,borderRadius:14,background:`${objectDef.color||C.accent}18`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                    <Ic n={objectDef.icon||"circle"} s={22} c={objectDef.color||C.accent}/>
                  </div>
                  <p style={{margin:"0 0 4px",fontSize:14,fontWeight:600,color:C.text1}}>No {objectDef.plural_name||objectDef.name} yet</p>
                  <p style={{margin:"0 0 16px",fontSize:12,color:C.text3}}>{search?"No results match your search":"Get started by adding your first record"}</p>
                  {!search&&<Btn icon="plus" onClick={()=>setShowAdd(true)}>Add {objectDef.name}</Btn>}
                </div>
              </td></tr>
            ) : records.map(record=>(
              <tr key={record.id}
                style={{borderBottom:`1px solid ${C.border}`,cursor:"pointer",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f8f9fc"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"10px 14px"}} onClick={e=>e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(record.id)} onChange={()=>toggleSelect(record.id)} style={{accentColor:C.accent,cursor:"pointer"}}/>
                </td>
                {listFields.map((field,i)=>(
                  <td key={field.id} style={{padding:"10px 14px",maxWidth:220,overflow:"hidden"}} onClick={()=>{setSelectedRecord(record);}}>
                    {i===0 ? (
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:28,height:28,borderRadius:8,background:`${objectDef.color||C.accent}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:10,fontWeight:800,color:objectDef.color||C.accent}}>{getRecordInitials(record)}</span>
                        </div>
                        <span style={{fontSize:13,fontWeight:600,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          <FieldValue value={record.data[field.api_key]} fieldType={field.field_type} compact/>
                        </span>
                      </div>
                    ) : (
                      <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        <FieldValue value={record.data[field.api_key]} fieldType={field.field_type} compact/>
                      </div>
                    )}
                  </td>
                ))}
                <td style={{padding:"10px 14px",textAlign:"right"}}>
                  <Btn v="ghost" sz="sm" icon="eye" onClick={()=>setSelectedRecord(record)}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12}}>
          <span style={{fontSize:12,color:C.text3}}>Page {page} of {pages} · {total} total</span>
          <div style={{display:"flex",gap:6}}>
            <Btn v="secondary" sz="sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Previous</Btn>
            <Btn v="secondary" sz="sm" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}>Next</Btn>
          </div>
        </div>
      )}

      {showAdd && <RecordForm objectDef={objectDef} title={`Add ${objectDef.name}`} onSave={handleCreate} onClose={()=>setShowAdd(false)}/>}

      {selectedRecord && (
        <>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.15)",zIndex:199}} onClick={()=>setSelectedRecord(null)}/>
          <RecordDetail
            record={selectedRecord}
            objectDef={objectDef}
            onClose={()=>setSelectedRecord(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
};

// ── Kanban View ───────────────────────────────────────────────────────────────
const KanbanView = ({objectDef, environmentId}) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(null); // column value
  const [selectedRecord, setSelectedRecord] = useState(null);

  const statusField = (objectDef.fields||[]).find(f=>f.api_key==="status");
  const columns = statusField?.options || [];

  const primaryField = (objectDef.fields||[]).find(f=>f.api_key==="first_name"||f.api_key==="job_title"||f.api_key==="pool_name") || (objectDef.fields||[])[0];
  const subtitleField = (objectDef.fields||[]).find(f=>["current_title","department","category"].includes(f.api_key));

  useEffect(()=>{
    api.get(`/records?object_id=${objectDef.id}&environment_id=${environmentId}&limit=200`).then(d=>{
      setRecords(d.records||[]);
      setLoading(false);
    });
  },[objectDef.id, environmentId]);

  const handleCreate = async (data) => {
    if (showAdd) data.status = showAdd;
    const r = await api.post("/records", {object_id:objectDef.id, environment_id:environmentId, data});
    setRecords(prev=>[...prev, r]);
    setShowAdd(null);
  };

  const handleUpdate = async (id, data) => {
    await api.patch(`/records/${id}`, {data});
    setRecords(prev=>prev.map(r=>r.id===id?{...r,data:{...r.data,...data}}:r));
    setSelectedRecord(prev=>prev?{...prev,data:{...prev.data,...data}}:null);
  };

  const handleDelete = (id) => {
    setRecords(prev=>prev.filter(r=>r.id!==id));
    setSelectedRecord(null);
  };

  const moveCard = async (record, newStatus) => {
    await handleUpdate(record.id, {status: newStatus});
  };

  const COLUMN_COLORS = {
    "Draft":"#868e96","Open":"#0ca678","Active":"#0ca678",
    "On Hold":"#f59f00","Passive":"#f59f00",
    "Filled":"#3b5bdb","Placed":"#3b5bdb",
    "Cancelled":"#e03131","Archived":"#e03131","Not Looking":"#e03131",
    "Inactive":"#868e96",
  };

  if (!statusField) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,color:C.text3,fontSize:13,flexDirection:"column",gap:8}}>
      <p>Kanban view requires a <strong>Status</strong> field with options.</p>
    </div>
  );

  return (
    <div style={{display:"flex",gap:12,overflow:"auto",paddingBottom:16,height:"100%",alignItems:"flex-start"}}>
      {columns.map(col=>{
        const colRecords = records.filter(r=>r.data.status===col);
        const color = COLUMN_COLORS[col] || C.accent;
        return (
          <div key={col} style={{width:260,flexShrink:0,display:"flex",flexDirection:"column",gap:0}}>
            {/* Column header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.surface,borderRadius:"12px 12px 0 0",border:`1px solid ${C.border}`,borderBottom:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:color}}/>
                <span style={{fontSize:12,fontWeight:700,color:C.text1}}>{col}</span>
                <span style={{fontSize:11,color:C.text3,background:"#f0f0f0",padding:"1px 6px",borderRadius:99}}>{colRecords.length}</span>
              </div>
              <button onClick={()=>setShowAdd(col)} style={{background:"none",border:"none",cursor:"pointer",color:C.text3,display:"flex",padding:2,borderRadius:4}}>
                <Ic n="plus" s={14}/>
              </button>
            </div>

            {/* Cards */}
            <div style={{background:"#f2f4f8",borderRadius:"0 0 12px 12px",border:`1px solid ${C.border}`,borderTop:"none",padding:"8px",display:"flex",flexDirection:"column",gap:6,minHeight:120}}>
              {loading ? (
                <div style={{padding:16,textAlign:"center",color:C.text3,fontSize:12}}>Loading…</div>
              ) : colRecords.length===0 ? (
                <div style={{padding:16,textAlign:"center",color:C.text3,fontSize:12}}>No records</div>
              ) : colRecords.map(record=>{
                const title = record.data.first_name
                  ? `${record.data.first_name} ${record.data.last_name||""}`.trim()
                  : record.data[primaryField?.api_key] || "Untitled";
                const sub = subtitleField ? record.data[subtitleField.api_key] : null;
                const initials = title.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

                return (
                  <div key={record.id} onClick={()=>setSelectedRecord(record)}
                    style={{background:C.surface,borderRadius:10,padding:"12px",border:`1px solid ${C.border}`,cursor:"pointer",transition:"all .12s",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.06)";e.currentTarget.style.transform="none";}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:sub?6:0}}>
                      <div style={{width:26,height:26,borderRadius:7,background:`${objectDef.color||C.accent}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:10,fontWeight:800,color:objectDef.color||C.accent}}>{initials}</span>
                      </div>
                      <span style={{fontSize:13,fontWeight:600,color:C.text1,lineHeight:1.3}}>{title}</span>
                    </div>
                    {sub && <div style={{fontSize:12,color:C.text3,marginLeft:34}}>{sub}</div>}
                    {/* Move buttons */}
                    <div style={{display:"flex",gap:4,marginTop:8}} onClick={e=>e.stopPropagation()}>
                      {columns.indexOf(col)>0 && (
                        <button onClick={()=>moveCard(record,columns[columns.indexOf(col)-1])} style={{flex:1,padding:"3px 0",background:"#f0f4ff",border:"none",borderRadius:6,cursor:"pointer",fontSize:10,color:C.accent,fontFamily:F,fontWeight:600}}>← {columns[columns.indexOf(col)-1]}</button>
                      )}
                      {columns.indexOf(col)<columns.length-1 && (
                        <button onClick={()=>moveCard(record,columns[columns.indexOf(col)+1])} style={{flex:1,padding:"3px 0",background:"#f0f4ff",border:"none",borderRadius:6,cursor:"pointer",fontSize:10,color:C.accent,fontFamily:F,fontWeight:600}}>{columns[columns.indexOf(col)+1]} →</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {showAdd && (
        <RecordForm
          objectDef={objectDef}
          title={`Add ${objectDef.name} — ${showAdd}`}
          onSave={handleCreate}
          onClose={()=>setShowAdd(null)}
        />
      )}

      {selectedRecord && (
        <>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.15)",zIndex:199}} onClick={()=>setSelectedRecord(null)}/>
          <RecordDetail
            record={selectedRecord}
            objectDef={objectDef}
            onClose={()=>setSelectedRecord(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
};

// ── Main ObjectApp ─────────────────────────────────────────────────────────────
export default function ObjectApp({object, environment}) {
  const [objectDef, setObjectDef] = useState(null);
  const [view, setView] = useState("table");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    setLoading(true);
    api.get(`/objects/${object.id}`).then(d=>{ setObjectDef(d); setLoading(false); });
  },[object.id]);

  if (loading||!objectDef) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,color:C.text3,fontFamily:F}}>Loading…</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",fontFamily:F}}>
      {/* Object header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
        <div style={{width:40,height:40,borderRadius:12,background:objectDef.color||C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Ic n={objectDef.icon||"circle"} s={20} c="white"/>
        </div>
        <div>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.text1}}>{objectDef.plural_name||objectDef.name}</h1>
          {objectDef.description&&<p style={{margin:0,fontSize:12,color:C.text3}}>{objectDef.description}</p>}
        </div>

        {/* View switcher */}
        <div style={{marginLeft:"auto",display:"flex",background:"#f0f0f0",borderRadius:10,padding:3,gap:2}}>
          {[{id:"table",icon:"list",label:"Table"},{id:"kanban",icon:"kanban",label:"Pipeline"}].map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{
              display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",
              background:view===v.id?C.surface:"transparent",
              color:view===v.id?C.text1:C.text3,
              fontFamily:F,fontSize:12,fontWeight:600,
              boxShadow:view===v.id?"0 1px 3px rgba(0,0,0,.1)":"none",
              transition:"all .15s"
            }}>
              <Ic n={v.icon} s={13}/>{v.label}
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {view==="table" && <TableView objectDef={objectDef} environmentId={environment.id} onSelectRecord={()=>{}}/>}
        {view==="kanban" && <KanbanView objectDef={objectDef} environmentId={environment.id}/>}
      </div>
    </div>
  );
}
