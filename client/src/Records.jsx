import { useState, useEffect, useCallback, useRef } from "react";
import { MatchingEngine } from "./AI.jsx";
import CommunicationsPanel from "./Communications.jsx";
import { RecordPipelinePanel, PeoplePipelineWidget, LinkedRecordsPanel } from "./Workflows.jsx";

const api = {
  get:    p     => fetch(`/api${p}`).then(r=>r.json()),
  post:   (p,b) => fetch(`/api${p}`,{method:"POST",  headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:  (p,b) => fetch(`/api${p}`,{method:"PATCH", headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()),
  del:    p     => fetch(`/api${p}`,{method:"DELETE"}).then(r=>r.json()),
};

const F  = "'DM Sans', -apple-system, sans-serif";
const C  = {
  bg:"#f4f5f8", surface:"#ffffff", border:"#e8eaed", border2:"#d1d5db",
  text1:"#111827", text2:"#4b5563", text3:"#9ca3af", accent:"#3b5bdb",
  accentLight:"#eef1ff",
};

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
/* ─── CSV helpers ────────────────────────────────────────────────────────────── */
const downloadCSV = async (objectId, environmentId, objectSlug) => {
  const url = `/api/csv/export?object_id=${objectId}&environment_id=${environmentId}`;
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${objectSlug}-export.csv`;
  a.click();
};

const downloadTemplate = async (objectId, objectSlug) => {
  const url = `/api/csv/template?object_id=${objectId}`;
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${objectSlug}-template.csv`;
  a.click();
};

const importCSV = async (objectId, environmentId, file, mode='create') => {
  const text = await file.text();
  const res = await fetch(`/api/csv/import?object_id=${objectId}&environment_id=${environmentId}&mode=${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: text,
  });
  return res.json();
};

const Ic = ({ n, s=16, c="currentColor" }) => {
  const P = {
    list:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    kanban:"M3 3h7v18H3zM14 3h7v11h-7zM14 17h7v4h-7z",
    plus:"M12 5v14M5 12h14",
    x:"M18 6L6 18M6 6l12 12",
    search:"M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
    chevR:"M9 18l6-6-6-6", chevL:"M15 18l-6-6 6-6", chevD:"M6 9l6 6 6-6",
    edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    expand:"M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
    activity:"M22 12h-4l-3 9L9 3l-3 9H2",
    paperclip:"M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
    messageSquare:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    link:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    upload:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
    filter:"M22 3H2l8 9.46V19l4 2v-8.54L22 3",
    star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    check:"M20 6L9 17l-5-5",
    user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    file:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
    tag:"M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z",
    briefcase:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {P[n] && <path d={P[n]}/>}
    </svg>
  );
};

const Btn = ({ children, onClick, v="primary", sz="md", icon, disabled, style={} }) => {
  const base = { display:"inline-flex", alignItems:"center", gap:6, fontFamily:F, fontWeight:600, cursor:disabled?"not-allowed":"pointer", border:"1px solid transparent", borderRadius:8, transition:"all 0.15s", opacity:disabled?0.5:1, ...(sz==="sm"?{fontSize:12,padding:"5px 10px"}:{fontSize:13,padding:"8px 14px"}) };
  const vs = {
    primary:   { background:C.accent,   color:"#fff",    borderColor:C.accent },
    secondary: { background:C.surface,  color:C.text1,   borderColor:C.border },
    ghost:     { background:"transparent", color:C.text2, border:"none" },
    danger:    { background:"#fef2f2",  color:"#dc2626", borderColor:"#fecaca" },
  };
  return <button style={{...base,...vs[v],...style}} onClick={onClick} disabled={disabled}>{icon&&<Ic n={icon} s={14}/>}{children}</button>;
};

const Badge = ({ children, color="#6b7280", light }) => (
  <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:600, background:light?`${color}18`:color, color:light?color:"white", border:`1px solid ${color}28`, whiteSpace:"nowrap" }}>
    {children}
  </span>
);

const Inp = ({ label, value, onChange, placeholder, type="text", disabled, multiline, rows=3, style={}, autoFocus }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{label}</label>}
    {multiline
      ? <textarea rows={rows} value={value ?? ""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
          style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:disabled?"#f9fafb":C.surface, resize:"vertical", ...style }}/>
      : <input type={type} value={value ?? ""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} autoFocus={autoFocus}
          style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:disabled?"#f9fafb":C.surface, width:"100%", boxSizing:"border-box", ...style }}/>
    }
  </div>
);

const Sel = ({ label, value, onChange, options }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{label}</label>}
    <select value={value ?? ""} onChange={e=>onChange(e.target.value)}
      style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", background:C.surface, color:C.text1 }}>
      <option value="">— Select —</option>
      {options.map(o => <option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>
);

/* ─── field renderer ───────────────────────────────────────────────────────── */
const STATUS_COLORS = {
  "Active":"#0ca678","Passive":"#f59f00","Not Looking":"#868e96","Placed":"#3b5bdb","Archived":"#adb5bd",
  "Open":"#0ca678","Draft":"#868e96","On Hold":"#f59f00","Filled":"#3b5bdb","Cancelled":"#e03131",
  "High":"#e03131","Critical":"#c92a2a","Medium":"#f59f00","Low":"#0ca678",
  "Remote":"#3b5bdb","Hybrid":"#7048e8","On-site":"#0ca678",
};

// Emit a filter-navigate event so the app shell can navigate to a filtered records list
const emitFilterNav = (fieldKey, fieldLabel, fieldValue) => {
  window.dispatchEvent(new CustomEvent("talentos:filter-navigate", {
    detail: { fieldKey, fieldLabel, fieldValue }
  }));
};

const FieldValue = ({ field, value }) => {
  if (value===null||value===undefined||value==="") return <span style={{color:C.text3,fontSize:12}}>—</span>;

  // Clickable pill — navigates to a filtered list of records with this value
  const FilterPill = ({ label, color }) => (
    <span
      onClick={e => { e.stopPropagation(); emitFilterNav(field.api_key, field.name, label); }}
      title={`Browse all records where ${field.name} = "${label}"`}
      style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99,
        fontSize:11, fontWeight:600, background:`${color}18`, color, border:`1px solid ${color}28`,
        whiteSpace:"nowrap", cursor:"pointer", userSelect:"none", transition:"filter .1s" }}
      onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.88)"}
      onMouseLeave={e=>e.currentTarget.style.filter="none"}
    >
      {label}
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{opacity:0.6}}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </span>
  );

  switch(field.field_type) {
    case "select": {
      const col = STATUS_COLORS[value] || C.accent;
      return <FilterPill label={value} color={col}/>;
    }
    case "multi_select": {
      const arr = Array.isArray(value) ? value : (typeof value==="string"?value.split(","):[]);
      return <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{arr.map(v=><FilterPill key={v} label={v} color={STATUS_COLORS[v]||C.accent}/>)}</div>;
    }
    case "boolean": return <FilterPill label={value?"Yes":"No"} color={value?"#0ca678":"#868e96"}/>;
    case "url":     return <a href={value} target="_blank" rel="noreferrer" style={{color:C.accent,fontSize:13,textDecoration:"none"}}>{value}</a>;
    case "email":   return <a href={`mailto:${value}`} style={{color:C.accent,fontSize:13,textDecoration:"none"}}>{value}</a>;
    case "rating":  return (
      <div style={{display:"flex",gap:2}}>
        {[1,2,3,4,5].map(i=><Ic key={i} n="star" s={14} c={i<=value?"#f59f00":"#e5e7eb"}/>)}
      </div>
    );
    case "currency": return <span style={{fontSize:13,color:C.text1,fontWeight:600}}>${Number(value).toLocaleString()}</span>;
    case "date":    return <span style={{fontSize:13}}>{new Date(value).toLocaleDateString()}</span>;
    default:        return <span style={{fontSize:13,color:C.text1,lineHeight:1.5}}>{String(value)}</span>;
  }
};

const FieldEditor = ({ field, value, onChange, autoFocus }) => {
  switch(field.field_type) {
    case "textarea":
    case "rich_text":
      return <Inp multiline value={value} onChange={onChange} placeholder={field.placeholder||field.name} autoFocus={autoFocus}/>;
    case "select":
      return <Sel value={value} onChange={onChange} options={(field.options||[]).map(o=>({value:o,label:o}))}/>;
    case "multi_select": {
      const selected = Array.isArray(value)?value:(value?value.split(","):[]);
      return (
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {(field.options||[]).map(opt => {
            const on = selected.includes(opt);
            return (
              <button key={opt} onClick={()=>onChange(on?selected.filter(s=>s!==opt):[...selected,opt])}
                style={{padding:"4px 10px",borderRadius:99,border:`1.5px solid ${on?C.accent:C.border}`,background:on?C.accentLight:"transparent",color:on?C.accent:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    case "boolean":
      return (
        <div style={{display:"flex",gap:8}}>
          {[{v:true,l:"Yes"},{v:false,l:"No"}].map(({v,l})=>(
            <button key={l} onClick={()=>onChange(v)} style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${value===v?C.accent:C.border}`,background:value===v?C.accentLight:"transparent",color:value===v?C.accent:C.text2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F}}>{l}</button>
          ))}
        </div>
      );
    case "rating":
      return (
        <div style={{display:"flex",gap:4}}>
          {[1,2,3,4,5].map(i=>(
            <button key={i} onClick={()=>onChange(i)} style={{background:"none",border:"none",cursor:"pointer",padding:2}}>
              <Ic n="star" s={22} c={i<=(value||0)?"#f59f00":"#e5e7eb"}/>
            </button>
          ))}
        </div>
      );
    case "number":
    case "currency":
      return <Inp type="number" value={value} onChange={v=>onChange(v===''?'':Number(v))} placeholder={field.placeholder||field.name} autoFocus={autoFocus}/>;
    case "date":
      return <Inp type="date" value={value} onChange={onChange} autoFocus={autoFocus}/>;
    case "email":
      return <Inp type="email" value={value} onChange={onChange} placeholder={field.placeholder||`Enter ${field.name}`} autoFocus={autoFocus}/>;
    case "url":
      return <Inp type="url" value={value} onChange={onChange} placeholder="https://…" autoFocus={autoFocus}/>;
    default:
      return <Inp value={value} onChange={onChange} placeholder={field.placeholder||`Enter ${field.name}`} autoFocus={autoFocus}/>;
  }
};

/* ─── record display name ──────────────────────────────────────────────────── */
export const recordTitle = (record, fields) => {
  const nameField = fields.find(f=>["first_name","name","job_title","pool_name","title"].includes(f.api_key));
  const lastField = fields.find(f=>f.api_key==="last_name");
  if (!record?.data) return "Untitled";
  const first = nameField ? record.data[nameField.api_key] : null;
  const last  = lastField ? record.data[lastField.api_key]  : null;
  if (first && last) return `${first} ${last}`;
  return first || record.id?.slice(0,8) || "Untitled";
};

const recordSubtitle = (record, fields) => {
  const sub = fields.find(f=>["current_title","department","category","email"].includes(f.api_key));
  return sub ? record.data[sub.api_key] : null;
};

/* ─── Avatar ───────────────────────────────────────────────────────────────── */
const Avatar = ({ name, color=C.accent, size=32 }) => {
  const initials = name?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() || "?";
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ color:"white", fontSize:size*0.35, fontWeight:700 }}>{initials}</span>
    </div>
  );
};

/* ─── Create / Edit Record Modal ───────────────────────────────────────────── */
const RecordFormModal = ({ fields, record, objectName, onSave, onClose }) => {
  const [data, setData] = useState(record?.data || {});
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setData(d=>({...d,[k]:v}));

  const handleSave = async () => {
    setSaving(true);
    await onSave(data);
    setSaving(false);
  };

  const sections = [
    { label:"Core Details",  keys: fields.filter((_,i)=>i<6).map(f=>f.api_key) },
    { label:"Additional",    keys: fields.filter((_,i)=>i>=6).map(f=>f.api_key) },
  ].filter(s=>s.keys.length);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"flex-end" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:560, height:"100%", background:C.surface, display:"flex", flexDirection:"column", boxShadow:"-8px 0 40px rgba(0,0,0,.12)", animation:"slideIn .2s ease" }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:`1px solid ${C.border}` }}>
          <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:C.text1 }}>{record?"Edit":"New"} {objectName}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, display:"flex" }}><Ic n="x" s={20}/></button>
        </div>
        <div style={{ flex:1, overflow:"auto", padding:"24px" }}>
          {sections.map(section => (
            <div key={section.label} style={{ marginBottom:28 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>{section.label}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {section.keys.map(key => {
                  const field = fields.find(f=>f.api_key===key);
                  if (!field) return null;
                  return (
                    <div key={key}>
                      <label style={{ fontSize:12, fontWeight:600, color:C.text2, display:"block", marginBottom:6 }}>
                        {field.name}{!!field.is_required&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}
                      </label>
                      <FieldEditor field={field} value={data[key]} onChange={v=>set(key,v)}/>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", padding:"16px 24px", borderTop:`1px solid ${C.border}` }}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>{saving?"Saving…":record?"Save Changes":"Create Record"}</Btn>
        </div>
      </div>
    </div>
  );
};

/* ─── Table View ───────────────────────────────────────────────────────────── */
const TableView = ({ records, fields, objectColor, onSelect, onEdit, onDelete, onProfile }) => {
  const listFields = fields.filter(f=>f.show_in_list).slice(0,6);

  if (records.length===0) return (
    <div style={{ textAlign:"center", padding:"80px 40px", color:C.text3 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
      <div style={{ fontSize:15, fontWeight:600, color:C.text2, marginBottom:4 }}>No records yet</div>
      <div style={{ fontSize:13 }}>Create your first record to get started</div>
    </div>
  );

  return (
    <div style={{ overflow:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
        <thead>
          <tr style={{ background:"#f8f9fc", borderBottom:`2px solid ${C.border}` }}>
            <th style={{ width:36, padding:"10px 12px" }}/>
            {listFields.map(f=>(
              <th key={f.id} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{f.name}</th>
            ))}
            <th style={{ padding:"10px 14px", textAlign:"right", fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.06em" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map(record => {
            const title = recordTitle(record, fields);
            return (
              <tr key={record.id} style={{ borderBottom:`1px solid ${C.border}`, transition:"background .1s" }}
                onMouseEnter={e=>e.currentTarget.style.background="#f8f9fc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"12px 12px", cursor:"pointer" }} onClick={()=>onProfile(record)}>
                  <Avatar name={title} color={objectColor} size={28}/>
                </td>
                {listFields.map((f,fi)=>(
                  <td key={f.id} style={{ padding:"12px 14px", maxWidth:220, cursor: fi===0?"pointer":"default" }}
                    onClick={fi===0 ? ()=>onProfile(record) : undefined}>
                    {fi===0
                      ? <span style={{ fontWeight:700, color:"#4361EE", textDecoration:"none" }}
                          onMouseEnter={e=>e.currentTarget.style.textDecoration="underline"}
                          onMouseLeave={e=>e.currentTarget.style.textDecoration="none"}>
                          <FieldValue field={f} value={record.data?.[f.api_key]}/>
                        </span>
                      : <FieldValue field={f} value={record.data?.[f.api_key]}/>
                    }
                  </td>
                ))}
                <td style={{ padding:"12px 14px", textAlign:"right" }}>
                  <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }}>
                    {onEdit   && <Btn v="ghost" sz="sm" icon="edit"   onClick={()=>onEdit(record)}/>}
                    <Btn v="ghost" sz="sm" icon="expand" onClick={()=>onSelect(record)}/>
                    {onDelete && <Btn v="ghost" sz="sm" icon="trash"  onClick={()=>onDelete(record.id)} style={{color:"#ef4444"}}/>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ─── Kanban View ──────────────────────────────────────────────────────────── */
const KanbanView = ({ records, fields, objectColor, onSelect, onEdit, onDelete, onStatusChange, onProfile }) => {
  const statusField = fields.find(f=>f.api_key==="status"&&f.field_type==="select");
  const columns = statusField?.options || ["Active","Passive","Archived"];
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const getColRecords = col => records.filter(r => (r.data?.status||columns[0])===col);

  const handleDrop = (col) => {
    if (!dragging||dragging===col) return;
    const record = records.find(r=>r.id===dragging);
    if (record) onStatusChange(record.id, col);
    setDragging(null); setDragOver(null);
  };

  const colColors = {
    "Active":"#0ca678","Open":"#0ca678","Passive":"#f59f00","Draft":"#868e96",
    "On Hold":"#f59f00","Filled":"#3b5bdb","Not Looking":"#868e96","Placed":"#3b5bdb",
    "Archived":"#adb5bd","Cancelled":"#e03131","Inactive":"#adb5bd",
  };

  const titleField = fields.find(f=>["first_name","name","job_title","pool_name"].includes(f.api_key));
  const subtitleField = fields.find(f=>["current_title","department","category","email"].includes(f.api_key));
  const extraField = fields.find(f=>["current_company","location","work_type"].includes(f.api_key));

  return (
    <div style={{ display:"flex", gap:14, overflow:"auto", paddingBottom:16, alignItems:"flex-start" }}>
      {columns.map(col => {
        const colRecords = getColRecords(col);
        const colColor = colColors[col] || C.accent;
        const isOver = dragOver===col;
        return (
          <div key={col} style={{ width:260, flexShrink:0 }}
            onDragOver={e=>{e.preventDefault();setDragOver(col);}}
            onDrop={()=>handleDrop(col)}
            onDragLeave={()=>setDragOver(null)}>
            {/* Column header */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, padding:"8px 10px", borderRadius:10, background:isOver?`${colColor}12`:"transparent", transition:"background .15s" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:colColor }}/>
              <span style={{ fontSize:12, fontWeight:700, color:C.text1 }}>{col}</span>
              <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color:C.text3, background:C.border, borderRadius:99, padding:"1px 7px" }}>{colRecords.length}</span>
            </div>
            {/* Cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:8, minHeight:80, borderRadius:10, padding:isOver?"6px":0, background:isOver?`${colColor}08`:"transparent", transition:"all .15s" }}>
              {colRecords.map(record=>{
                const title = titleField ? record.data?.[titleField.api_key] : recordTitle(record,fields);
                const lastN = record.data?.last_name||"";
                const fullTitle = lastN ? `${title} ${lastN}` : title;
                const sub   = subtitleField ? record.data?.[subtitleField.api_key] : null;
                const extra = extraField ? record.data?.[extraField.api_key] : null;
                return (
                  <div key={record.id} draggable onDragStart={()=>setDragging(record.id)} onClick={()=>onProfile(record)}
                    style={{ background:C.surface, borderRadius:10, border:`1px solid ${C.border}`, padding:"12px 14px", cursor:"pointer", transition:"all .12s", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.05)";e.currentTarget.style.transform="none";}}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      <Avatar name={fullTitle||"?"} color={colColor} size={30}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#4361EE", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fullTitle||"Untitled"}</div>
                        {sub && <div style={{ fontSize:11, color:C.text3, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub}</div>}
                        {extra && <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>{extra}</div>}
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"flex-end", gap:4, marginTop:8 }} onClick={e=>e.stopPropagation()}>
                      {onEdit   && <button onClick={()=>onEdit(record)} style={{ background:"none", border:"none", cursor:"pointer", padding:3, color:C.text3, borderRadius:5, display:"flex" }}><Ic n="edit" s={12}/></button>}
                      {onDelete && <button onClick={()=>onDelete(record.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:3, color:"#ef444450", borderRadius:5, display:"flex" }}><Ic n="trash" s={12}/></button>}
                    </div>
                  </div>
                );
              })}
              {colRecords.length===0&&(
                <div style={{ padding:"20px 10px", textAlign:"center", color:C.text3, fontSize:12, fontStyle:"italic" }}>Empty</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Record Workflows Tab ─────────────────────────────────────────────────── */
const STEP_COLORS = { stage_change:"#3b5bdb", ai_prompt:"#7c3aed", update_field:"#0ca678", send_email:"#f59f00", webhook:"#e03131" };
const STEP_LABELS = { stage_change:"Change Stage", ai_prompt:"AI Prompt", update_field:"Update Field", send_email:"Send Email", webhook:"Webhook" };
const STEP_ICONS  = { stage_change:"tag", ai_prompt:"sparkles", update_field:"edit", send_email:"mail", webhook:"activity" };

const RecordWorkflows = ({ record, objectId, environment, objectName, onNavigate }) => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [running, setRunning]     = useState(null);
  const [results, setResults]     = useState({});

  useEffect(() => {
    if (!objectId || !environment?.id) return;
    api.get(`/workflows?object_id=${objectId}&environment_id=${environment.id}`)
      .then(d => { setWorkflows(Array.isArray(d) ? d.filter(w => w.active !== false) : []); setLoading(false); });
  }, [objectId, environment?.id]);

  const runWorkflow = async (wf) => {
    setRunning(wf.id);
    setResults(r => ({ ...r, [wf.id]: null }));
    try {
      const res = await api.post(`/workflows/${wf.id}/run`, { record_id: record.id });
      setResults(r => ({ ...r, [wf.id]: res }));
    } catch(e) {
      setResults(r => ({ ...r, [wf.id]: { error: e.message } }));
    }
    setRunning(null);
  };

  if (loading) return <div style={{ padding:"32px 0", textAlign:"center", color:C.text3, fontSize:13 }}>Loading…</div>;

  // Automation workflows (original behaviour)
  const automationWfs = workflows.filter(w => !w.workflow_type || w.workflow_type === "automation");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Pipeline + People Link section */}
      <RecordPipelinePanel record={record} objectId={objectId} environment={environment} objectName={objectName} onNavigate={onNavigate}/>

      {/* Automation workflows */}
      {automationWfs.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>⚡ Automations</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {automationWfs.map(wf => {
              const res = results[wf.id];
              const isRunning = running === wf.id;
              return (
                <div key={wf.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"#f9fafb", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${C.accent},#7c3aed)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ic n="zap" s={14} c="white"/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{wf.name}</div>
                {wf.description && <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>{wf.description}</div>}
              </div>
              {/* Step count pills */}
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {(wf.steps||[]).slice(0,4).map((s,i) => {
                  const col = STEP_COLORS[s.type] || C.accent;
                  return <span key={i} style={{ fontSize:10, fontWeight:600, color:col, background:`${col}15`, padding:"2px 7px", borderRadius:99 }}>{STEP_LABELS[s.type]||s.type}</span>;
                })}
              </div>
              <button onClick={() => runWorkflow(wf)} disabled={isRunning}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, border:"none", background:isRunning?C.border:`linear-gradient(135deg,${C.accent},#7c3aed)`, color:"white", fontSize:12, fontWeight:700, cursor:isRunning?"not-allowed":"pointer", fontFamily:F, flexShrink:0, transition:"all .15s" }}>
                <Ic n={isRunning?"loader":"zap"} s={12}/>{isRunning ? "Running…" : "Run"}
              </button>
            </div>

            {/* Results */}
            {res && (
              <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:6 }}>
                {res.error && <div style={{ fontSize:12, color:C.red, padding:"8px 10px", background:C.redLight, borderRadius:8 }}>Error: {res.error}</div>}
                {res.steps?.map((step, i) => {
                  const ok = step.status === "done";
                  const col = ok ? "#0ca678" : step.status === "error" ? C.red : C.orange;
                  const bg  = ok ? "#ecfdf5" : step.status === "error" ? C.redLight : "#fffbeb";
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 12px", borderRadius:9, background:bg }}>
                      <Ic n={ok?"check":"x"} s={13} c={col}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:C.text1 }}>{STEP_LABELS[step.type]||step.type}</div>
                        {step.output && <div style={{ fontSize:11, color:C.text2, marginTop:3, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{step.output}</div>}
                        {step.error  && <div style={{ fontSize:11, color:col, marginTop:2 }}>Error: {step.error}</div>}
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, color:col, textTransform:"uppercase", flexShrink:0 }}>{step.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
          </div>
        </div>
      )}
    </div>
  );
};


/* ─── Record Detail (slide-in panel + full-page 2-col layout) ─────────────── */

/* ─── User Panel — shows linked platform user on a Person record ─────────── */
const STATUS_COLOR = { active:"#0CAF77", invited:"#F79009", deactivated:"#EF4444" };
const STATUS_BG    = { active:"#ECFDF5", invited:"#FFF7ED", deactivated:"#FEF2F2" };

function PlatformUserSection({ record }) {
  const email = record?.data?.email;
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [roles,     setRoles]     = useState([]);
  const [open,      setOpen]      = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [createForm,setCreateForm]= useState({ first_name:"", last_name:"", role_id:"" });

  const load = async () => {
    setLoading(true);
    const [r, rs] = await Promise.all([
      email ? api.get(`/users/by-email/${encodeURIComponent(email)}`).catch(()=>null) : Promise.resolve(null),
      api.get("/roles").catch(()=>[]),
    ]);
    const found = r && !r.error ? r : null;
    setUser(found);
    setRoles(Array.isArray(rs) ? rs : []);
    if (found) setOpen(true);
    setLoading(false);
  };
  useEffect(() => { load(); }, [email]);

  const roleName = roles.find(r=>r.id===user?.role_id)?.name || user?.role?.name || "—";

  // Section header — matches CORE / ADDITIONAL style
  const Header = () => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: open ? 10 : 0, marginTop:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.08em" }}>Platform User</div>
        {!loading && user && (
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99,
            background:STATUS_BG[user.status]||"#f3f4f6", color:STATUS_COLOR[user.status]||C.text2 }}>
            {user.status}
          </span>
        )}
      </div>
      <button onClick={()=>setOpen(p=>!p)} style={{ background:"none", border:"none", cursor:"pointer",
        fontSize:11, color:C.text3, fontFamily:F, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
        {open ? "▲ hide" : (user ? "▼ show" : "▼ set up")}
      </button>
    </div>
  );

  if (!open) return <Header/>;
  if (loading) return <><Header/><div style={{ fontSize:12, color:C.text3, padding:"6px 0" }}>Loading…</div></>;

  // ── No linked user ──
  if (!user) return (
    <>
      <Header/>
      <div style={{ background:"#f8f9fc", borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        {!creating ? (
          <div style={{ padding:"18px 16px", textAlign:"center" }}>
            <div style={{ fontSize:13, color:C.text3, marginBottom:12 }}>
              {email ? `No platform account linked to ${email}` : "Add an email to this person first"}
            </div>
            {email && (
              <button onClick={()=>setCreating(true)} style={{ padding:"7px 16px", borderRadius:8,
                border:`1.5px solid ${C.accent}`, background:C.accentLight, color:C.accent,
                fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>
                + Invite as platform user
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            {[["First name","first_name"],["Last name","last_name"]].map(([lbl,key])=>(
              <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{lbl}</div>
                <input value={createForm[key]} onChange={e=>setCreateForm(p=>({...p,[key]:e.target.value}))}
                  style={{ flex:1, padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F }}/>
              </div>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>Role</div>
              <select value={createForm.role_id} onChange={e=>setCreateForm(p=>({...p,role_id:e.target.value}))}
                style={{ flex:1, padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F }}>
                <option value="">Select role…</option>
                {roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
              <button onClick={()=>setCreating(false)} style={{ padding:"6px 14px", borderRadius:7,
                border:`1px solid ${C.border}`, background:"transparent", fontSize:13, fontWeight:600,
                cursor:"pointer", fontFamily:F, color:C.text2 }}>Cancel</button>
              <button onClick={async()=>{
                if(!createForm.first_name||!createForm.last_name||!createForm.role_id) return;
                setSaving(true);
                const res = await api.post("/users",{...createForm,email});
                setSaving(false);
                if(res.error){alert(res.error);return;}
                setCreating(false); load();
              }} disabled={saving||!createForm.first_name||!createForm.last_name||!createForm.role_id}
                style={{ padding:"6px 16px", borderRadius:7, border:"none", background:C.accent, color:"#fff",
                  fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F, opacity:saving?0.6:1 }}>
                {saving?"Inviting…":"Send Invite"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // ── Linked user ──
  const viewRows = [
    ["Email",      user.email],
    ["Role",       roleName],
    ["Last login", user.last_login ? new Date(user.last_login).toLocaleString() : "Never"],
    ["Logins",     user.login_count || 0],
    ["MFA",        user.mfa_enabled ? "✅ Enabled" : "Not enabled"],
  ];

  return (
    <>
      <Header/>
      <div style={{ background:"#f8f9fc", borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}` }}>
        {editing ? (
          <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            {[["First name","first_name"],["Last name","last_name"]].map(([lbl,key])=>(
              <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{lbl}</div>
                <input value={form[key]||""} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                  style={{ flex:1, padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F }}/>
              </div>
            ))}
            {[["Role","role_id",roles.map(r=>({v:r.id,l:r.name}))],
              ["Status","status",[{v:"active",l:"Active"},{v:"invited",l:"Invited"},{v:"deactivated",l:"Deactivated"}]]
            ].map(([lbl,key,opts])=>(
              <div key={key} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{lbl}</div>
                <select value={form[key]||""} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                  style={{ flex:1, padding:"6px 9px", borderRadius:7, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F }}>
                  {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
              <button onClick={()=>setEditing(false)} style={{ padding:"6px 14px", borderRadius:7,
                border:`1px solid ${C.border}`, background:"transparent", fontSize:12, fontWeight:600,
                cursor:"pointer", fontFamily:F, color:C.text2 }}>Cancel</button>
              <button onClick={async()=>{ setSaving(true); await api.patch(`/users/${user.id}`,form); await load(); setEditing(false); setSaving(false); }}
                disabled={saving} style={{ padding:"6px 16px", borderRadius:7, border:"none", background:C.accent,
                  color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F, opacity:saving?0.6:1 }}>
                {saving?"Saving…":"Save changes"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {viewRows.map(([label, val], i) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                borderBottom: i < viewRows.length-1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{label}</div>
                <div style={{ flex:1, fontSize:13, color:C.text1 }}>{val}</div>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"flex-end", padding:"9px 14px",
              borderTop:`1px solid ${C.border}`, background:"#f4f5f8" }}>
              <button onClick={()=>{ setForm({first_name:user.first_name,last_name:user.last_name,role_id:user.role_id,status:user.status}); setEditing(true); }}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:7,
                  border:`1px solid ${C.border}`, background:"transparent", fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:F, color:C.text2 }}>
                <Ic n="edit" s={12}/> Edit user
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// Panel registry — future: load custom panels from object config (Settings > Objects > Panels)
export const PANEL_META = {
  comms:       { icon:"mail",          label:"Communications", defaultOpen:true  },
  notes:       { icon:"messageSquare", label:"Notes",     defaultOpen:true  },
  attachments: { icon:"paperclip",     label:"Files",     defaultOpen:true  },
  activity:    { icon:"activity",      label:"Activity",  defaultOpen:false },
  workflows:   { icon:"layers",        label:"Pipeline",  defaultOpen:false },
  linked:      { icon:"link",          label:"Linked Records", defaultOpen:true },
  match:       { icon:"sparkles",      label:"AI Match",  defaultOpen:false },
  user:        { icon:"user",          label:"Platform User",  defaultOpen:true },
};

export const getDefaultPanelOrder = (objectName) => {
  const base = ["comms","notes","attachments","activity","workflows"];
  if (objectName === "Person") base.splice(1, 0, "linked"); // after comms
  if (["Person","Job"].includes(objectName)) base.push("match");
  return base;
};

export const RecordDetail = ({ record, fields, allObjects, environment, objectName, objectColor, onClose, fullPage, onToggleFullPage, onUpdate, onDelete, onNavigate }) => {
  const [tab, setTab]           = useState("fields");
  const [editing, setEditing]   = useState({});
  const [notes, setNotes]       = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [newNote, setNewNote]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [openPanels, setOpenPanels] = useState({comms:true,notes:true,attachments:true,activity:false,workflows:false,match:false,user:true});
  const [composeType, setComposeType] = useState(null);   // drives compose modal in CommunicationsPanel
  const [showCommMenu, setShowCommMenu] = useState(false);
  const [draggingPanel, setDraggingPanel] = useState(null);
  const [dragOverPanel, setDragOverPanel] = useState(null);

  const storageKey = `talentos_panels_${objectName}`;
  const [panelOrder, setPanelOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || getDefaultPanelOrder(objectName); }
    catch { return getDefaultPanelOrder(objectName); }
  });

  const savePanelOrder = (order) => {
    setPanelOrder(order);
    try { localStorage.setItem(storageKey, JSON.stringify(order)); } catch {}
  };


  const load = useCallback(async () => {
    const [n, att, act] = await Promise.all([
      api.get(`/notes?record_id=${record.id}`),
      api.get(`/attachments?record_id=${record.id}`),
      api.get(`/records/${record.id}/activity`),
    ]);
    setNotes(Array.isArray(n)?n:[]);
    setAttachments(Array.isArray(att)?att:[]);
    setActivity(Array.isArray(act)?act:[]);
  }, [record.id]);

  useEffect(() => { load(); setEditing({}); setTab("fields"); }, [record.id, load]);

  // Click-based types save immediately when value changes; text types wait for explicit save
  const CLICK_SAVE_TYPES = ["select","multi_select","boolean","rating"];

  const handleFieldEdit = (key, value, fieldType) => {
    setEditing(e=>({...e,[key]:value}));
    // For click-based types, save immediately
    if (CLICK_SAVE_TYPES.includes(fieldType)) {
      handleSaveFieldValue(key, record.data?.[key], value);
    }
  };

  const handleSaveFieldValue = async (key, oldValue, newValue) => {
    const oldStr = oldValue === null || oldValue === undefined ? "" : String(oldValue);
    const newStr = newValue === null || newValue === undefined ? "" : String(newValue);
    if (oldStr === newStr) { setEditing(e=>{ const n={...e}; delete n[key]; return n; }); return; }
    setSaving(true);
    const fieldDef = fields.find(f=>f.api_key===key);
    const updated = await api.patch(`/records/${record.id}`, {
      data: { [key]: newValue },
      updated_by: "Admin",
      field_changes: [{ field_key:key, field_name:fieldDef?.name||key, old_value:oldValue, new_value:newValue }]
    });
    onUpdate(updated);
    setEditing(e=>{ const n={...e}; delete n[key]; return n; });
    setSaving(false);
    load();
  };

  const handleSaveField = async (key, oldValue) => {
    if (!editing.hasOwnProperty(key)) return;
    await handleSaveFieldValue(key, oldValue, editing[key]);
  };
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await api.post("/notes", { record_id:record.id, content:newNote, author:"Admin" });
    setNewNote(""); load();
  };
  const handleDeleteNote = async (id) => { await api.del(`/notes/${id}`); load(); };
  const handleAddAttachment = async () => {
    const name = prompt("File name (demo):"); if (!name) return;
    await api.post("/attachments", { record_id:record.id, name, size:0, type:"application/pdf" }); load();
  };

  // Drag handlers for panel reorder
  const onPanelDragStart = (e, id) => { setDraggingPanel(id); e.dataTransfer.effectAllowed="move"; };
  const onPanelDragOver  = (e, id) => { e.preventDefault(); setDragOverPanel(id); };
  const onPanelDrop      = (targetId) => {
    if (!draggingPanel || draggingPanel===targetId) { setDraggingPanel(null); setDragOverPanel(null); return; }
    const next=[...panelOrder];
    const from=next.indexOf(draggingPanel), to=next.indexOf(targetId);
    next.splice(from,1); next.splice(to,0,draggingPanel);
    savePanelOrder(next); setDraggingPanel(null); setDragOverPanel(null);
  };

  const title = recordTitle(record, fields);
  const subtitle = recordSubtitle(record, fields);
  const statusField = fields.find(f=>f.api_key==="status");
  const status = record.data?.status;

  const fieldSections = [
    { label:"Core",       fs: fields.filter((_,i)=>i<7) },
    { label:"Additional", fs: fields.filter((_,i)=>i>=7) },
  ].filter(s=>s.fs.length);


  // ── Shared field panel (used in both slide-out tab and full-page left col) ──
  // Defined as JSX variable (not a component) so React never creates a new component
  // boundary here — critical for inline editing state to survive re-renders
  const fieldsPanelJSX = (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      {fieldSections.map(section => (        <div key={section.label} style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>{section.label}</div>
          <div style={{ background:"#f8f9fc", borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}` }}>
            {section.fs.map((field,i) => {
              const isEditing = editing.hasOwnProperty(field.api_key);
              const originalVal = record.data?.[field.api_key];
              const val = isEditing ? editing[field.api_key] : originalVal;
              const READONLY_KEYS = ["id","created_at","updated_at"];
              const isReadonly = READONLY_KEYS.includes(field.api_key);
              const isClickSave = CLICK_SAVE_TYPES.includes(field.field_type);
              return (
                <div key={field.id}
                  style={{ display:"flex", alignItems:isEditing?"flex-start":"center", gap:12, padding:"11px 14px", borderBottom:i<section.fs.length-1?`1px solid ${C.border}`:"none", background:isEditing?"#fafbff":"transparent", transition:"background .1s" }}
                  onMouseEnter={e=>{ if(!isEditing&&!isReadonly) { e.currentTarget.style.background="#f0f4ff"; const btn=e.currentTarget.querySelector(".edit-hint"); if(btn) btn.style.opacity=1; }}}
                  onMouseLeave={e=>{ e.currentTarget.style.background=isEditing?"#fafbff":"transparent"; const btn=e.currentTarget.querySelector(".edit-hint"); if(btn) btn.style.opacity=0; }}>
                  <div style={{ width:130, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{field.name}</div>
                  <div style={{ flex:1, minWidth:0 }}
                    onBlur={e=>{ if(isEditing && !isClickSave && !e.currentTarget.contains(e.relatedTarget)) handleSaveField(field.api_key, originalVal); }}
                    onKeyDown={e=>{ if(isEditing && !isClickSave){ if(e.key==="Enter"&&field.field_type!=="textarea"&&field.field_type!=="rich_text") handleSaveField(field.api_key, originalVal); if(e.key==="Escape") setEditing(prev=>{const n={...prev};delete n[field.api_key];return n;}); }}}>
                    {isEditing
                      ? <FieldEditor field={field} value={val} onChange={v=>handleFieldEdit(field.api_key, v, field.field_type)} autoFocus={!isClickSave}/>
                      : <div onClick={()=>!isReadonly&&setEditing(e=>({...e,[field.api_key]:originalVal}))} style={{ cursor:isReadonly?"default":"text", minHeight:22 }}>
                          <FieldValue field={field} value={val}/>
                        </div>
                    }
                  </div>
                  {isEditing ? (
                    <button onClick={()=>{ setEditing(e=>{const n={...e};delete n[field.api_key];return n;}); }}
                      style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:"3px 4px", display:"flex", alignItems:"center", borderRadius:5, flexShrink:0, fontFamily:F }}
                      title="Cancel (Esc)">
                      <Ic n="x" s={12} c={C.text3}/>
                    </button>
                  ) : !isReadonly && (
                    <button className="edit-hint" onClick={()=>setEditing(e=>({...e,[field.api_key]:originalVal}))}
                      style={{ background:"none", border:"none", cursor:"pointer", color:C.accent, opacity:0, padding:"3px 6px", display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, borderRadius:6, transition:"opacity .1s", flexShrink:0, fontFamily:F }}>
                      <Ic n="edit" s={12} c={C.accent}/> Edit
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {objectName === "Person" && <PlatformUserSection record={record}/>}
    </div>
  );


  // ── Panel content renderer ──
  const PanelContent = ({ id }) => {
    if (id==="comms") return (
      <CommunicationsPanel record={record} environment={environment} externalCompose={composeType} onExternalComposeDone={()=>setComposeType(null)}/>
    );
    if (id==="notes") return (
      <div>
        <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:14 }}>
          <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Add a note…" rows={3}
            style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, resize:"vertical", width:"100%", boxSizing:"border-box" }}/>
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <Btn onClick={handleAddNote} disabled={!newNote.trim()} sz="sm">Add Note</Btn>
          </div>
        </div>
        {notes.length===0
          ? <div style={{ textAlign:"center", padding:"20px 0", color:C.text3, fontSize:13 }}>No notes yet</div>
          : notes.map(note=>(
            <div key={note.id} style={{ background:"#f8f9fc", borderRadius:10, padding:"12px 14px", marginBottom:8, border:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Avatar name={note.author} size={22} color={C.accent}/>
                  <span style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{note.author}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11, color:C.text3 }}>{new Date(note.created_at).toLocaleString()}</span>
                  <button onClick={()=>handleDeleteNote(note.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:2, display:"flex" }}><Ic n="trash" s={12}/></button>
                </div>
              </div>
              <p style={{ margin:0, fontSize:13, color:C.text1, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{note.content}</p>
            </div>
          ))
        }
      </div>
    );

    if (id==="attachments") return (
      <div>
        <button onClick={handleAddAttachment}
          style={{ width:"100%", border:`2px dashed ${C.border}`, borderRadius:12, padding:"18px", textAlign:"center", cursor:"pointer", background:"transparent", marginBottom:12, fontFamily:F, color:C.text3, transition:"all .15s" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text3;}}>
          <Ic n="upload" s={18}/><div style={{ fontSize:13, marginTop:4, fontWeight:600 }}>Upload File</div>
        </button>
        {attachments.length===0
          ? <div style={{ textAlign:"center", padding:"16px 0", color:C.text3, fontSize:13 }}>No attachments yet</div>
          : attachments.map(att=>(
            <div key={att.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"#f8f9fc", borderRadius:10, marginBottom:8, border:`1px solid ${C.border}` }}>
              <div style={{ width:32, height:32, borderRadius:8, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ic n="file" s={15} c={C.accent}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{att.name}</div>
                <div style={{ fontSize:11, color:C.text3 }}>{new Date(att.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={async()=>{await api.del(`/attachments/${att.id}`);load();}} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:4, display:"flex" }}><Ic n="trash" s={14}/></button>
            </div>
          ))
        }
      </div>
    );


    if (id==="activity") return (
      <div>
        {activity.length===0
          ? <div style={{ textAlign:"center", padding:"28px 0", color:C.text3, fontSize:13 }}>No activity yet</div>
          : activity.map(event=>{
            const isFieldChange = event.action==="field_changed";
            const isCreated = event.action==="created";
            const ch = event.changes||{};
            const iconName = isCreated?"plus":isFieldChange?"edit":"activity";
            const iconColor = isCreated?"#16a34a":isFieldChange?C.accent:"#6366f1";
            const iconBg = isCreated?"#f0fdf4":isFieldChange?C.accentLight:"#eef2ff";
            const formatVal = v => {
              if(v===null||v===undefined||v==="") return <em style={{color:C.text3}}>empty</em>;
              if(Array.isArray(v)) return v.join(", ")||<em style={{color:C.text3}}>empty</em>;
              return String(v);
            };
            return (
              <div key={event.id} style={{ display:"flex", gap:10, marginBottom:16, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background:iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                  <Ic n={iconName} s={13} c={iconColor}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:2 }}>
                    {event.actor
                      ? <><Avatar name={event.actor} size={18} color={C.accent}/><span style={{ fontSize:12, fontWeight:700, color:C.text1 }}>{event.actor}</span></>
                      : <span style={{ fontSize:12, fontWeight:700, color:C.text1 }}>System</span>
                    }
                    <span style={{ fontSize:12, color:C.text3 }}>
                      {isFieldChange ? `updated ${ch.field_name||ch.field_key}` : isCreated ? "created this record" : "updated this record"}
                    </span>
                    <span style={{ fontSize:11, color:C.text3, marginLeft:"auto" }}>
                      {new Date(event.created_at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </span>
                  </div>
                  {isFieldChange && (
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, padding:"7px 10px", background:"#f8f9fc", borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, flexWrap:"wrap" }}>
                      <span style={{ color:C.text3, padding:"2px 7px", borderRadius:6, background:"#fee2e2", color:"#b91c1c", fontWeight:500, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{formatVal(ch.old_value)}</span>
                      <span style={{ color:C.text3 }}>→</span>
                      <span style={{ color:C.text3, padding:"2px 7px", borderRadius:6, background:"#dcfce7", color:"#15803d", fontWeight:500, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{formatVal(ch.new_value)}</span>
                    </div>
                  )}
                  {!isFieldChange && !isCreated && ch && Object.keys(ch).length>0 && (
                    <div style={{ marginTop:6, background:"#f8f9fc", borderRadius:8, padding:"6px 10px", fontSize:11, color:C.text2 }}>
                      {Object.entries(ch).slice(0,3).map(([k,v])=>(
                        <div key={k}><strong>{k}:</strong> {String(v)?.slice(0,60)}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        }
      </div>
    );

    if (id==="workflows") return <RecordWorkflows record={record} objectId={record.object_id} environment={environment} objectName={objectName} onNavigate={onNavigate}/>;
    if (id==="linked") return <LinkedRecordsPanel record={record} environment={environment} onNavigate={onNavigate}/>;

    if (id==="match") return (
      <div style={{ margin:"-16px" }}>
        <MatchingEngine environment={environment} initialRecord={record} initialObject={{ name:objectName, slug:objectName==="Person"?"people":"jobs" }}/>
      </div>
    );

    return null;
  };


  // ── Collapsible draggable panel card (right col) ──
  const PanelCard = ({ id }) => {
    const meta = PANEL_META[id];
    if (!meta) return null;
    const isOpen = openPanels[id];
    const badge = id==="notes" ? notes.length : id==="attachments" ? attachments.length : 0;
    const isDragOver = dragOverPanel===id;

    return (
      <div draggable onDragStart={e=>onPanelDragStart(e,id)} onDragOver={e=>onPanelDragOver(e,id)} onDrop={()=>onPanelDrop(id)} onDragEnd={()=>{setDraggingPanel(null);setDragOverPanel(null);}}
        style={{ background:C.surface, border:`1.5px solid ${isDragOver?C.accent:C.border}`, borderRadius:14, marginBottom:12, overflow:"hidden", transition:"border-color .15s, opacity .15s", opacity:draggingPanel===id?0.5:1, boxShadow:isDragOver?`0 0 0 3px ${C.accent}22`:"0 1px 4px rgba(0,0,0,.04)" }}>
        {/* Panel header — click to collapse, drag handle on left */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", cursor:"pointer", userSelect:"none", borderBottom:isOpen?`1px solid ${C.border}`:"none" }}
          onClick={()=>setOpenPanels(p=>({...p,[id]:!p[id]}))}>
          <div title="Drag to reorder" style={{ color:C.text3, cursor:"grab", padding:"0 2px", display:"flex", flexShrink:0 }} onClick={e=>e.stopPropagation()}>
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none"><circle cx="4" cy="4" r="1.5" fill="currentColor"/><circle cx="9" cy="4" r="1.5" fill="currentColor"/><circle cx="4" cy="9" r="1.5" fill="currentColor"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><circle cx="4" cy="14" r="1.5" fill="currentColor"/><circle cx="9" cy="14" r="1.5" fill="currentColor"/></svg>
          </div>
          <Ic n={meta.icon} s={14} c={C.accent}/>
          <span style={{ flex:1, fontSize:13, fontWeight:700, color:C.text1 }}>{meta.label}</span>
          {badge>0 && <span style={{ background:C.accentLight, color:C.accent, fontSize:11, fontWeight:700, borderRadius:20, padding:"1px 7px" }}>{badge}</span>}
          <span style={{ display:"flex", transition:"transform .2s", transform:isOpen?"rotate(180deg)":"rotate(0deg)" }}><Ic n="chevD" s={14} c={C.text3}/></span>
        </div>
        {isOpen && <div style={{ padding:"16px" }}><PanelContent id={id}/></div>}
      </div>
    );
  };


  // ── Shared header (slide-out only) ──
  const Header = () => (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 24px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
      <Avatar name={title} color={objectColor} size={38}/>
      <div style={{ flex:1, minWidth:0 }}>
        <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:C.text1 }}>{title}</h2>
        {subtitle && <div style={{ fontSize:12, color:C.text3, marginTop:1 }}>{subtitle}</div>}
      </div>
      {status && statusField && <Badge color={STATUS_COLORS[status]||C.accent} light>{status}</Badge>}
      <div style={{ display:"flex", gap:6 }}>
        <Btn v="ghost" sz="sm" icon="expand" onClick={onToggleFullPage}/>
        <Btn v="danger" sz="sm" icon="trash" onClick={()=>onDelete(record.id)}/>
        <Btn v="ghost" sz="sm" icon="x" onClick={onClose}/>
      </div>
    </div>
  );

  // ── SLIDE-OUT (600px panel) — tabs layout ──
  const TABS = [
    { id:"fields",      icon:"edit",          label:"Fields" },
    { id:"activity",    icon:"activity",      label:"Activity" },
    { id:"notes",       icon:"messageSquare", label:`Notes${notes.length?` (${notes.length})`:""}` },
    { id:"attachments", icon:"paperclip",     label:`Files${attachments.length?` (${attachments.length})`:""}` },
    { id:"workflows",   icon:"layers",        label:"Pipeline" },
    ...( objectName === "Person" ? [{ id:"linked", icon:"link", label:"Linked Records" }] : [] ),
    ...( ["Person","Job"].includes(objectName) ? [{ id:"match", icon:"sparkles", label:"AI Match" }] : [] ),
  ];

  if (!fullPage) return (
    <>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.2)", zIndex:899 }} onClick={onClose}/>
      <div style={{ position:"fixed", top:0, right:0, bottom:0, width:600, background:C.surface, zIndex:900, display:"flex", flexDirection:"column", boxShadow:"-8px 0 40px rgba(0,0,0,.14)", animation:"slideIn .2s ease" }}>
        <Header/>
        <div style={{ display:"flex", gap:0, padding:"0 24px", borderBottom:`1px solid ${C.border}`, flexShrink:0, overflowX:"auto" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 14px", border:"none", background:"transparent", cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:tab===t.id?700:500, color:tab===t.id?C.accent:C.text3, borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`, transition:"all .12s", whiteSpace:"nowrap" }}>
              <Ic n={t.icon} s={13}/>{t.label}
            </button>
          ))}
        </div>
        <div style={{ flex:1, overflow:"auto", padding:"24px" }}>
          {tab==="fields"  && fieldsPanelJSX}
          {tab!=="fields"  && <PanelContent id={tab}/>}
        </div>
      </div>
    </>
  );


  // ── FULL PAGE — 2-col layout ──
  // ── Resizable column split ──
  const colStorageKey = `talentos_colwidth_${objectName}`;
  const [leftPct, setLeftPct] = useState(() => {
    try { return parseFloat(localStorage.getItem(colStorageKey)) || 38; } catch { return 38; }
  });
  const containerRef = useRef(null);
  const draggingCol  = useRef(false);

  const onDividerMouseDown = (e) => {
    e.preventDefault();
    draggingCol.current = true;
    const onMove = (ev) => {
      if (!draggingCol.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct  = Math.min(65, Math.max(20, ((ev.clientX - rect.left) / rect.width) * 100));
      setLeftPct(pct);
    };
    const onUp = () => {
      draggingCol.current = false;
      try { localStorage.setItem(colStorageKey, leftPct.toFixed(1)); } catch {}
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Persist on release — capture latest via ref
  const leftPctRef = useRef(leftPct);
  useEffect(() => { leftPctRef.current = leftPct; }, [leftPct]);

  // Tinted identity card background from objectColor
  const hex = objectColor?.replace("#","") || "4361EE";
  const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
  const cardBg = `rgba(${r},${g},${b},0.07)`;
  const cardBorder = `rgba(${r},${g},${b},0.18)`;

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "Escape") onClose?.();
      if (e.key === "c" || e.key === "C") setShowCommMenu(v => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Photo upload ──
  const photoInputRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(record?.data?.photo_url || null);
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = ev.target.result;
      setPhotoUrl(url);
      await api.patch(`/records/${record.id}`, { data: { ...record.data, photo_url: url } });
    };
    reader.readAsDataURL(file);
  };

  // ── Functionality bar (full page only) ──
  const COMM_OPTIONS = [
    { type:"email",    label:"Send Email",    icon:"✉️" },
    { type:"sms",      label:"Send SMS",      icon:"💬" },
    { type:"whatsapp", label:"Send WhatsApp", icon:"📱" },
    { type:"call",     label:"Log Call",      icon:"📞" },
  ];

  // Last comms date from activity
  const lastCommDate = activity?.length
    ? new Date(activity[0]?.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})
    : null;

  const ActionBtn = ({ icon, label, onClick, accent }) => (
    <button onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 13px", borderRadius:9,
        border:`1.5px solid ${accent ? C.accent : C.border}`,
        background: accent ? C.accentLight : C.bg,
        color: accent ? C.accent : C.text2,
        fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:F, whiteSpace:"nowrap",
        transition:"all .12s" }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=accent?C.accent:C.border; e.currentTarget.style.color=accent?C.accent:C.text2; }}>
      <Ic n={icon} s={13} c="currentColor"/> {label}
    </button>
  );

  const FunctionalityBar = () => (
    <div style={{ display:"flex", alignItems:"center", gap:0, background:C.surface,
      borderBottom:`1px solid ${C.border}`, flexShrink:0, position:"relative", zIndex:50, minHeight:58 }}>

      {/* LEFT: back crumb + avatar + name + subtitle + pills */}
      <div style={{ display:"flex", alignItems:"center", gap:0, borderRight:`1px solid ${C.border}`, padding:"0 16px", minHeight:58, flexShrink:0, maxWidth:"50%" }}>
        {/* Back link */}
        <button onClick={onClose}
          style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none",
            cursor:"pointer", color:C.text3, fontSize:12, fontWeight:600, fontFamily:F, padding:"4px 0", flexShrink:0 }}
          onMouseEnter={e=>e.currentTarget.style.color=C.accent}
          onMouseLeave={e=>e.currentTarget.style.color=C.text3}>
          <Ic n="arrowLeft" s={13}/> {objectName}s
        </button>
        <span style={{ margin:"0 8px", color:C.border, fontSize:16, flexShrink:0 }}>/</span>
        {/* Avatar */}
        <div style={{ position:"relative", flexShrink:0, marginRight:10, cursor:"pointer" }}
          onClick={()=>photoInputRef.current?.click()} title="Click to upload photo">
          {photoUrl
            ? <img src={photoUrl} style={{ width:32, height:32, borderRadius:8, objectFit:"cover" }}/>
            : <Avatar name={title} color={objectColor} size={32}/>
          }
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoUpload}/>
        </div>
        {/* Name + subtitle + pills */}
        <div style={{ minWidth:0, display:"flex", flexDirection:"column", gap:2 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:14, fontWeight:800, color:C.text1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:220 }}>{title}</span>
            {status && statusField && (
              <Badge color={STATUS_COLORS[status]||C.accent} light>{status}</Badge>
            )}
            <span style={{ padding:"2px 8px", borderRadius:20, background:`rgba(${r},${g},${b},0.12)`, color:objectColor, fontWeight:700, fontSize:10, whiteSpace:"nowrap" }}>{objectName}</span>
            <span style={{ padding:"2px 8px", borderRadius:20, background:"#f3f4f6", color:C.text3, fontWeight:500, fontSize:10, whiteSpace:"nowrap" }}>
              Added {new Date(record.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
            </span>
          </div>
          {subtitle && <div style={{ fontSize:11, color:C.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:340 }}>{subtitle}</div>}
        </div>
      </div>

      {/* RIGHT: action buttons */}
      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 16px", flex:1 }}>
        {/* Communicate dropdown — only on Person records */}
        {objectName === "Person" && (
        <div style={{ position:"relative" }}>
          <button
            onClick={()=>setShowCommMenu(v=>!v)}
            onBlur={()=>setTimeout(()=>setShowCommMenu(false),150)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 13px", borderRadius:9,
              border:`1.5px solid ${C.accent}`, background:C.accentLight, color:C.accent,
              fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:F }}>
            <Ic n="mail" s={13} c={C.accent}/> Communicate
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginLeft:2, opacity:0.7 }}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </button>
          {showCommMenu && (
            <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, background:C.surface,
              border:`1.5px solid ${C.border}`, borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.14)",
              minWidth:200, zIndex:200, overflow:"hidden", padding:"4px 0" }}>
              {COMM_OPTIONS.map(opt=>(
                <button key={opt.type}
                  onClick={()=>{ setComposeType(opt.type); setShowCommMenu(false); }}
                  style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 16px",
                    background:"none", border:"none", cursor:"pointer", fontSize:13, color:C.text1,
                    textAlign:"left", fontFamily:F, transition:"background .1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <span style={{ fontSize:15 }}>{opt.icon}</span>
                  <span style={{ fontWeight:500 }}>{opt.label}</span>
                </button>
              ))}
              <div style={{ borderTop:`1px solid ${C.border}`, margin:"4px 0", padding:"2px 16px 2px" }}>
                <div style={{ fontSize:11, color:C.text3, paddingTop:4 }}>Shortcut: <kbd style={{ background:"#f1f5f9", borderRadius:4, padding:"1px 5px", fontFamily:"monospace" }}>C</kbd></div>
              </div>
            </div>
          )}
        </div>
        )} {/* end Person-only communicate */}

        {/* Spacer */}
        <div style={{ flex:1 }}/>

        {/* Last activity indicator */}
        {lastCommDate && (
          <div style={{ fontSize:12, color:C.text3, display:"flex", alignItems:"center", gap:5 }}>
            <Ic n="activity" s={12} c={C.text3}/> Last contact {lastCommDate}
          </div>
        )}

        {/* Destructive + close — far right, always visible */}
        <div style={{ display:"flex", gap:4, marginLeft:8 }}>
          <Btn v="danger" sz="sm" icon="trash" onClick={()=>onDelete(record.id)}/>
          <Btn v="ghost"  sz="sm" icon="x"     onClick={onClose}/>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", background:"#F4F6FB" }}>
      <FunctionalityBar/>
      {/* Full-width Linked People widget — only shown on non-Person objects */}
      {objectName !== "Person" && (
        <div style={{ flexShrink:0, borderBottom:`1px solid ${C.border}` }}>
          <PeoplePipelineWidget record={record} objectId={record.object_id} environment={environment} onNavigate={onNavigate}/>
        </div>
      )}
      {/* 2-col body */}
      <div ref={containerRef} style={{ flex:1, display:"flex", overflow:"hidden", userSelect:draggingCol.current?"none":"auto" }}>

        {/* LEFT COL — Fields as panel card */}
        <div style={{ width:`${leftPct}%`, flexShrink:0, background:"#F4F6FB", display:"flex", flexDirection:"column", overflow:"auto", padding:"16px 0 24px 16px" }}>
          <div style={{ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:14, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
              <Ic n="edit" s={14} c={C.accent}/>
              <span style={{ flex:1, fontSize:13, fontWeight:700, color:C.text1 }}>Profile Fields</span>
              <span style={{ fontSize:11, color:C.text3 }}>Click any field to edit</span>
            </div>
            <div style={{ padding:"16px" }}>
              {fieldsPanelJSX}
            </div>
          </div>
        </div>

        {/* DRAG DIVIDER — with visible grip dots */}
        <div onMouseDown={onDividerMouseDown}
          style={{ width:8, flexShrink:0, background:"transparent", cursor:"col-resize", position:"relative", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e=>{ e.currentTarget.querySelector(".divider-track").style.background=C.accent; e.currentTarget.querySelector(".divider-dots").style.opacity="1"; }}
          onMouseLeave={e=>{ e.currentTarget.querySelector(".divider-track").style.background=C.border; e.currentTarget.querySelector(".divider-dots").style.opacity="0.4"; }}>
          <div className="divider-track" style={{ position:"absolute", top:0, bottom:0, left:"50%", transform:"translateX(-50%)", width:2, background:C.border, transition:"background .15s" }}/>
          <div className="divider-dots" style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", gap:3, opacity:0.4, transition:"opacity .15s" }}>
            {[0,1,2,3,4,5].map(i=><div key={i} style={{ width:3, height:3, borderRadius:"50%", background:C.text3 }}/>)}
          </div>
        </div>

        {/* RIGHT COL — Panel cards */}
        <div style={{ flex:1, overflow:"auto", padding:"16px 20px 24px", background:"#F4F6FB" }}>
          {panelOrder.filter(id=>PANEL_META[id]).map(id=>(
            <PanelCard key={id} id={id}/>
          ))}
        </div>
      </div>
    </div>
  );
};


/* ─── Main Records View ────────────────────────────────────────────────────── */

/* ─── CSV Import Modal ───────────────────────────────────────────────────────── */
const CSVImportModal = ({ object, environment, onClose, onDone }) => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('create');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!file) return;
    setLoading(true);
    const r = await importCSV(object.id, environment.id, file, mode);
    setResult(r);
    setLoading(false);
    if (r.success) onDone();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", width:440, fontFamily:"'DM Sans',sans-serif", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize:17, fontWeight:800, color:"#111827", marginBottom:4 }}>Import CSV</div>
        <div style={{ fontSize:12, color:"#9ca3af", marginBottom:20 }}>Import {object.plural_name} from a CSV file</div>

        {!result ? <>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#4b5563", display:"block", marginBottom:6 }}>Import Mode</label>
            <div style={{ display:"flex", gap:8 }}>
              {[{v:"create",l:"Create new records"},{v:"upsert",l:"Update existing + create new"}].map(({v,l}) => (
                <button key={v} onClick={()=>setMode(v)}
                  style={{ flex:1, padding:"8px 10px", borderRadius:8, border:`1.5px solid ${mode===v?"#3b5bdb":"#e8eaed"}`, background:mode===v?"#eef1ff":"transparent", color:mode===v?"#3b5bdb":"#4b5563", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#4b5563", display:"block", marginBottom:6 }}>Select File</label>
            <input type="file" accept=".csv" onChange={e=>setFile(e.target.files[0])}
              style={{ width:"100%", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}/>
          </div>

          <div style={{ marginBottom:20 }}>
            <button onClick={()=>downloadTemplate(object.id, object.slug)}
              style={{ fontSize:12, color:"#3b5bdb", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", fontFamily:"'DM Sans',sans-serif", padding:0 }}>
              Download template CSV
            </button>
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #e8eaed", background:"white", color:"#4b5563", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
            <button onClick={handle} disabled={!file||loading}
              style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#3b5bdb", color:"white", fontSize:13, fontWeight:600, cursor:!file||loading?"not-allowed":"pointer", opacity:!file||loading?0.6:1, fontFamily:"'DM Sans',sans-serif" }}>
              {loading?"Importing…":"Import"}
            </button>
          </div>
        </> : (
          <div>
            <div style={{ background:result.success?"#f0fdf4":"#fef2f2", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:result.success?"#166534":"#991b1b", marginBottom:8 }}>
                {result.success?"Import complete":"Import failed"}
              </div>
              <div style={{ fontSize:12, color:"#374151" }}>
                ✅ {result.created} created · ✏️ {result.updated} updated · ⏭️ {result.skipped} skipped
              </div>
              {result.errors?.length > 0 && (
                <div style={{ marginTop:8, fontSize:11, color:"#991b1b" }}>
                  {result.errors.slice(0,3).map((e,i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ width:"100%", padding:"9px", borderRadius:8, border:"none", background:"#3b5bdb", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function RecordsView({ environment, object, onOpenRecord, initialFilter, session }) {
  const [records, setRecords]   = useState([]);
  const [fields,  setFields]    = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view,    setView]      = useState("table");
  const [search,  setSearch]    = useState("");
  const [filterChip, setFilterChip] = useState(initialFilter || null); // { fieldKey, fieldLabel, fieldValue }

  // Permission helper — Super Admin always passes; no session → deny
  const can = (action) => {
    if (!session) return true; // graceful fallback if no auth
    const { role, permissions } = session;
    if (role?.slug === "super_admin" || role?.slug === "admin") return true;
    return (permissions || []).some(
      p => p.object_slug === object.slug && p.action === action && p.allowed
    );
  };
  const [selected, setSelected] = useState(null);   // slide-out panel only
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [page, setPage]         = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab]   = useState("records");
  const [total, setTotal]       = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, r] = await Promise.all([
      api.get(`/fields?object_id=${object.id}`),
      api.get(`/records?object_id=${object.id}&environment_id=${environment.id}&page=${page}&limit=200${search?`&search=${encodeURIComponent(search)}`:""}`),
    ]);
    setFields(Array.isArray(f)?f:[]);
    const loaded = r.records||[];
    // Apply active filter chip client-side
    const filtered = filterChip
      ? loaded.filter(rec => {
          const v = rec.data?.[filterChip.fieldKey];
          if (Array.isArray(v)) return v.some(i => String(i).toLowerCase() === filterChip.fieldValue.toLowerCase());
          return String(v || "").toLowerCase() === filterChip.fieldValue.toLowerCase();
        })
      : loaded;
    setRecords(filtered);
    setTotal(filterChip ? filtered.length : (r.pagination?.total||0));
    setLoading(false);
  }, [object.id, environment.id, page, search, filterChip]);

  // Sync filterChip when initialFilter changes (e.g. navigating from a pill in another record)
  useEffect(() => { setFilterChip(initialFilter || null); setPage(1); }, [initialFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    await api.post("/records", { object_id:object.id, environment_id:environment.id, data, created_by:"Admin" });
    await load();
    setShowForm(false);
  };

  const handleUpdate = async (data) => {
    await api.patch(`/records/${editRecord.id}`, { data, updated_by:"Admin" });
    await load();
    setEditRecord(null);
  };

  const handleDetailUpdate = (updated) => {
    setRecords(rs => rs.map(r => r.id===updated.id ? updated : r));
    setSelected(updated);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record?")) return;
    await api.del(`/records/${id}`);
    if (selected?.id===id) setSelected(null);
    load();
  };

  const handleStatusChange = async (id, status) => {
    const updated = await api.patch(`/records/${id}`, { data:{ status }, updated_by:"Admin" });
    setRecords(rs => rs.map(r => r.id===id ? updated : r));
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:0 }}>
      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:C.text1, flex:"none" }}>{object.plural_name}</h1>
        <span style={{ fontSize:13, color:C.text3, fontWeight:500 }}>{total} record{total!==1?"s":""}</span>

        {/* Tab switcher */}
        <div style={{ display:"flex", border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", marginLeft:4 }}>
          {[{id:"records",icon:"list",label:"Records"},{id:"matching",icon:"sparkles",label:"AI Match"}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 13px", border:"none", cursor:"pointer", fontFamily:F, fontSize:12, fontWeight:600,
                background: activeTab===t.id ? C.accentLight : "transparent",
                color: activeTab===t.id ? C.accent : C.text3,
                transition:"all .12s" }}>
              <Ic n={t.icon} s={13}/>{t.label}
            </button>
          ))}
        </div>

        <div style={{ flex:1 }}/>

        {/* Active filter chip */}
        {filterChip && (
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px 5px 12px", borderRadius:20,
            background:C.accentLight, border:`1.5px solid ${C.accent}`, fontSize:12, color:C.accent, fontWeight:600 }}>
            <Ic n="filter" s={11} c={C.accent}/>
            {filterChip.fieldLabel}: <span style={{fontStyle:"italic"}}>{filterChip.fieldValue}</span>
            <button onClick={()=>{setFilterChip(null);setPage(1);}}
              style={{ background:"none", border:"none", cursor:"pointer", padding:"0 0 0 4px", display:"flex", color:C.accent, opacity:0.7 }}
              onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.7"}>
              <Ic n="x" s={12} c={C.accent}/>
            </button>
          </div>
        )}

        {activeTab === "records" && <>
        {/* Search */}
        <div style={{ position:"relative" }}>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={`Search ${object.plural_name}…`}
            style={{ padding:"8px 12px 8px 34px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", width:220, color:C.text1, background:C.surface }}/>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.text3, display:"flex" }}><Ic n="search" s={14}/></span>
        </div>

        {/* View toggle */}
        <div style={{ display:"flex", border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
          {[{v:"table",i:"list"},{v:"kanban",i:"kanban"}].map(({v,i})=>(
            <button key={v} onClick={()=>setView(v)}
              style={{ padding:"7px 12px", border:"none", cursor:"pointer", background:view===v?C.accentLight:"transparent", color:view===v?C.accent:C.text3, display:"flex", alignItems:"center", transition:"all .12s" }}>
              <Ic n={i} s={15}/>
            </button>
          ))}
        </div>

        <Btn icon="plus" onClick={()=>setShowForm(true)} style={{display:can("create")?"":"none"}}>New {object.name}</Btn>
        </>}
      </div>

      {/* AI Matching tab */}
      {activeTab === "matching" && (
        <MatchingEngine environment={environment} initialObject={object}/>
      )}

      {/* Records tab */}
      {activeTab === "records" && <>
      {/* Content */}
      <div style={{ flex:1, background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:C.text3 }}>Loading…</div>
        ) : view==="table" ? (
          <TableView records={records} fields={fields} objectColor={object.color||C.accent}
            onProfile={r=>onOpenRecord?.(r.id, object.id)}
            onSelect={r=>{setSelected(r);}}
            onEdit={can("edit") ? r=>setEditRecord(r) : null}
            onDelete={can("delete") ? handleDelete : null}/>
        ) : (
          <div style={{ padding:"20px" }}>
            <KanbanView records={records} fields={fields} objectColor={object.color||C.accent}
              onProfile={r=>onOpenRecord?.(r.id, object.id)}
              onSelect={r=>{setSelected(r);}}
              onEdit={can("edit") ? r=>setEditRecord(r) : null}
              onDelete={can("delete") ? handleDelete : null}
              onStatusChange={handleStatusChange}/>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:16 }}>
          <Btn v="secondary" sz="sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Previous</Btn>
          <span style={{ fontSize:13, color:C.text3, padding:"6px 10px" }}>Page {page}</span>
          <Btn v="secondary" sz="sm" onClick={()=>setPage(p=>p+1)} disabled={records.length<50}>Next</Btn>
        </div>
      )}

      </>}

      {/* Slide-out panel (expand icon) */}
      {selected && (
        <RecordDetail
          record={selected}
          fields={fields}
          environment={environment}
          objectName={object.name}
          objectColor={object.color||C.accent}
          fullPage={false}
          onClose={()=>setSelected(null)}
          onToggleFullPage={()=>onOpenRecord?.(selected.id, object.id)}
          onUpdate={handleDetailUpdate}
          onDelete={handleDelete}
          onNavigate={onOpenRecord}
        />
      )}

      {/* Create form */}
      {showForm && (
        <RecordFormModal fields={fields} objectName={object.name} onSave={handleCreate} onClose={()=>setShowForm(false)}/>
      )}

      {/* Edit form */}
      {editRecord && (
        <RecordFormModal fields={fields} record={editRecord} objectName={object.name} onSave={handleUpdate} onClose={()=>setEditRecord(null)}/>
      )}

      {/* CSV Import */}
      {showImport && (
        <CSVImportModal object={object} environment={environment} onClose={()=>setShowImport(false)} onDone={()=>{ setShowImport(false); load(); }}/>
      )}
    </div>
  );
}
