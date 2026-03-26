import { useState, useEffect, useCallback, useRef } from "react";

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

const Inp = ({ label, value, onChange, placeholder, type="text", disabled, multiline, rows=3, style={} }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{label}</label>}
    {multiline
      ? <textarea rows={rows} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:disabled?"#f9fafb":C.surface, resize:"vertical", ...style }}/>
      : <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, background:disabled?"#f9fafb":C.surface, width:"100%", boxSizing:"border-box", ...style }}/>
    }
  </div>
);

const Sel = ({ label, value, onChange, options }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:12, fontWeight:600, color:C.text2 }}>{label}</label>}
    <select value={value||""} onChange={e=>onChange(e.target.value)}
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

const FieldValue = ({ field, value }) => {
  if (value===null||value===undefined||value==="") return <span style={{color:C.text3,fontSize:12}}>—</span>;
  switch(field.field_type) {
    case "select": {
      const col = STATUS_COLORS[value] || C.accent;
      return <Badge color={col} light>{value}</Badge>;
    }
    case "multi_select": {
      const arr = Array.isArray(value) ? value : (typeof value==="string"?value.split(","):[]);
      return <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{arr.map(v=><Badge key={v} color={STATUS_COLORS[v]||C.accent} light>{v}</Badge>)}</div>;
    }
    case "boolean": return <Badge color={value?"#0ca678":"#868e96"} light>{value?"Yes":"No"}</Badge>;
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

const FieldEditor = ({ field, value, onChange }) => {
  switch(field.field_type) {
    case "textarea":
    case "rich_text":
      return <Inp multiline value={value} onChange={onChange} placeholder={field.placeholder||field.name}/>;
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
      return <Inp type="number" value={value} onChange={v=>onChange(v===''?'':Number(v))} placeholder={field.placeholder||field.name}/>;
    case "date":
      return <Inp type="date" value={value} onChange={onChange}/>;
    case "email":
      return <Inp type="email" value={value} onChange={onChange} placeholder={field.placeholder||`Enter ${field.name}`}/>;
    case "url":
      return <Inp type="url" value={value} onChange={onChange} placeholder="https://…"/>;
    default:
      return <Inp value={value} onChange={onChange} placeholder={field.placeholder||`Enter ${field.name}`}/>;
  }
};

/* ─── record display name ──────────────────────────────────────────────────── */
const recordTitle = (record, fields) => {
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
                        {field.name}{field.is_required&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}
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
const TableView = ({ records, fields, objectColor, onSelect, onEdit, onDelete }) => {
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
              <tr key={record.id} onClick={()=>onSelect(record)} style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer", transition:"background .1s" }}
                onMouseEnter={e=>e.currentTarget.style.background="#f8f9fc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"12px 12px" }}>
                  <Avatar name={title} color={objectColor} size={28}/>
                </td>
                {listFields.map(f=>(
                  <td key={f.id} style={{ padding:"12px 14px", maxWidth:220 }}>
                    <FieldValue field={f} value={record.data?.[f.api_key]}/>
                  </td>
                ))}
                <td style={{ padding:"12px 14px", textAlign:"right" }}>
                  <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }} onClick={e=>e.stopPropagation()}>
                    <Btn v="ghost" sz="sm" icon="edit"   onClick={()=>onEdit(record)}/>
                    <Btn v="ghost" sz="sm" icon="expand" onClick={()=>onSelect(record)}/>
                    <Btn v="ghost" sz="sm" icon="trash"  onClick={()=>onDelete(record.id)} style={{color:"#ef4444"}}/>
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
const KanbanView = ({ records, fields, objectColor, onSelect, onEdit, onDelete, onStatusChange }) => {
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
                  <div key={record.id} draggable onDragStart={()=>setDragging(record.id)} onClick={()=>onSelect(record)}
                    style={{ background:C.surface, borderRadius:10, border:`1px solid ${C.border}`, padding:"12px 14px", cursor:"pointer", transition:"all .12s", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.05)";e.currentTarget.style.transform="none";}}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      <Avatar name={fullTitle||"?"} color={colColor} size={30}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fullTitle||"Untitled"}</div>
                        {sub && <div style={{ fontSize:11, color:C.text3, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub}</div>}
                        {extra && <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>{extra}</div>}
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"flex-end", gap:4, marginTop:8 }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>onEdit(record)} style={{ background:"none", border:"none", cursor:"pointer", padding:3, color:C.text3, borderRadius:5, display:"flex" }}><Ic n="edit" s={12}/></button>
                      <button onClick={()=>onDelete(record.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:3, color:"#ef444450", borderRadius:5, display:"flex" }}><Ic n="trash" s={12}/></button>
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

/* ─── Record Detail (slide-in panel + full page) ───────────────────────────── */
const RecordDetail = ({ record, fields, allObjects, environment, objectName, objectColor, onClose, fullPage, onToggleFullPage, onUpdate, onDelete }) => {
  const [tab, setTab]           = useState("fields");
  const [editing, setEditing]   = useState({});
  const [notes, setNotes]       = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [relRecords, setRelRecords] = useState({});
  const [newNote, setNewNote]   = useState("");
  const [saving, setSaving]     = useState(false);

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

  const handleFieldEdit = (key, value) => setEditing(e=>({...e,[key]:value}));

  const handleSaveField = async (key) => {
    setSaving(true);
    const updated = await api.patch(`/records/${record.id}`, { data: { [key]: editing[key] } });
    onUpdate(updated);
    setEditing(e=>{ const n={...e}; delete n[key]; return n; });
    setSaving(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await api.post("/notes", { record_id:record.id, content:newNote, author:"Admin" });
    setNewNote("");
    load();
  };

  const handleDeleteNote = async (id) => {
    await api.del(`/notes/${id}`);
    load();
  };

  const handleAddAttachment = async () => {
    const name = prompt("File name (demo):");
    if (!name) return;
    await api.post("/attachments", { record_id:record.id, name, size:0, type:"application/pdf" });
    load();
  };

  const title = recordTitle(record, fields);
  const subtitle = recordSubtitle(record, fields);
  const statusField = fields.find(f=>f.api_key==="status");
  const status = record.data?.status;

  const fieldSections = [
    { label:"Core",       fs: fields.filter((_,i)=>i<7) },
    { label:"Additional", fs: fields.filter((_,i)=>i>=7) },
  ].filter(s=>s.fs.length);

  const TABS = [
    { id:"fields",      icon:"edit",          label:"Fields" },
    { id:"activity",    icon:"activity",      label:"Activity" },
    { id:"notes",       icon:"messageSquare", label:`Notes${notes.length?` (${notes.length})`:""}` },
    { id:"attachments", icon:"paperclip",     label:`Files${attachments.length?` (${attachments.length})`:""}` },
  ];

  const containerStyle = fullPage
    ? { position:"fixed", inset:0, background:C.surface, zIndex:900, display:"flex", flexDirection:"column", overflow:"hidden" }
    : { position:"fixed", top:0, right:0, bottom:0, width:600, background:C.surface, zIndex:900, display:"flex", flexDirection:"column", boxShadow:"-8px 0 40px rgba(0,0,0,.14)", animation:"slideIn .2s ease" };

  return (
    <>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      {!fullPage && <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.2)", zIndex:899 }} onClick={onClose}/>}
      <div style={containerStyle}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:14, padding:"18px 24px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <Avatar name={title} color={objectColor} size={40}/>
          <div style={{ flex:1, minWidth:0 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:C.text1 }}>{title}</h2>
            {subtitle && <div style={{ fontSize:12, color:C.text3, marginTop:1 }}>{subtitle}</div>}
          </div>
          {status && statusField && <Badge color={STATUS_COLORS[status]||C.accent} light>{status}</Badge>}
          <div style={{ display:"flex", gap:6 }}>
            <Btn v="ghost" sz="sm" icon={fullPage?"chevL":"expand"} onClick={onToggleFullPage}/>
            <Btn v="danger" sz="sm" icon="trash" onClick={()=>onDelete(record.id)}/>
            <Btn v="ghost" sz="sm" icon="x" onClick={onClose}/>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, padding:"0 24px", borderBottom:`1px solid ${C.border}`, flexShrink:0, overflowX:"auto" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 14px", border:"none", background:"transparent", cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:tab===t.id?700:500, color:tab===t.id?C.accent:C.text3, borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`, transition:"all .12s", whiteSpace:"nowrap" }}>
              <Ic n={t.icon} s={13}/>{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflow:"auto", padding:"24px" }}>

          {/* ── Fields tab ── */}
          {tab==="fields" && (
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {fieldSections.map(section => (
                <div key={section.label} style={{ marginBottom:24 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>{section.label}</div>
                  <div style={{ background:"#f8f9fc", borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}` }}>
                    {section.fs.map((field,i) => {
                      const isEditing = editing.hasOwnProperty(field.api_key);
                      const val = isEditing ? editing[field.api_key] : record.data?.[field.api_key];
                      return (
                        <div key={field.id} style={{ display:"flex", alignItems:isEditing?"flex-start":"center", gap:12, padding:"12px 16px", borderBottom:i<section.fs.length-1?`1px solid ${C.border}`:"none", background:isEditing?"#fafbff":"transparent", transition:"background .1s" }}>
                          <div style={{ width:140, fontSize:12, fontWeight:600, color:C.text3, flexShrink:0 }}>{field.name}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            {isEditing
                              ? <FieldEditor field={field} value={val} onChange={v=>handleFieldEdit(field.api_key,v)}/>
                              : <div onClick={()=>!field.is_system&&handleFieldEdit(field.api_key, val)} style={{ cursor:"text", minHeight:22 }}>
                                  <FieldValue field={field} value={val}/>
                                </div>
                            }
                          </div>
                          {isEditing ? (
                            <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                              <Btn sz="sm" onClick={()=>handleSaveField(field.api_key)} disabled={saving}>Save</Btn>
                              <Btn v="ghost" sz="sm" icon="x" onClick={()=>setEditing(e=>{const n={...e};delete n[field.api_key];return n;})}/>
                            </div>
                          ) : (
                            <button onClick={()=>handleFieldEdit(field.api_key, val)} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, opacity:0, padding:4, display:"flex", transition:"opacity .1s" }}
                              onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}>
                              <Ic n="edit" s={13}/>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Activity tab ── */}
          {tab==="activity" && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>Timeline</div>
              {activity.length===0 ? (
                <div style={{ textAlign:"center", padding:"48px 0", color:C.text3, fontSize:13 }}>No activity yet</div>
              ) : activity.map(event=>(
                <div key={event.id} style={{ display:"flex", gap:12, marginBottom:16 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:event.action==="created"?"#f0fdf4":C.accentLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Ic n={event.action==="created"?"plus":"edit"} s={12} c={event.action==="created"?"#16a34a":C.accent}/>
                    </div>
                  </div>
                  <div style={{ flex:1, paddingTop:4 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text1, textTransform:"capitalize" }}>{event.action}</div>
                    {event.actor && <div style={{ fontSize:11, color:C.text3 }}>by {event.actor}</div>}
                    <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{new Date(event.created_at).toLocaleString()}</div>
                    {event.changes && Object.keys(event.changes).length>0 && (
                      <div style={{ marginTop:6, background:"#f8f9fc", borderRadius:8, padding:"8px 10px" }}>
                        {Object.entries(event.changes).slice(0,5).map(([k,v])=>(
                          <div key={k} style={{ fontSize:11, color:C.text2 }}><strong>{k}:</strong> {String(v)?.slice(0,60)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Notes tab ── */}
          {tab==="notes" && (
            <div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:16 }}>
                <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Add a note…" rows={3}
                  style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1, resize:"vertical", width:"100%", boxSizing:"border-box" }}/>
                <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <Btn onClick={handleAddNote} disabled={!newNote.trim()} sz="sm">Add Note</Btn>
                </div>
              </div>
              {notes.length===0 ? (
                <div style={{ textAlign:"center", padding:"32px 0", color:C.text3, fontSize:13 }}>No notes yet</div>
              ) : notes.map(note=>(
                <div key={note.id} style={{ background:"#f8f9fc", borderRadius:10, padding:"12px 14px", marginBottom:10, border:`1px solid ${C.border}` }}>
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
              ))}
            </div>
          )}

          {/* ── Attachments tab ── */}
          {tab==="attachments" && (
            <div>
              <button onClick={handleAddAttachment}
                style={{ width:"100%", border:`2px dashed ${C.border}`, borderRadius:12, padding:"24px", textAlign:"center", cursor:"pointer", background:"transparent", marginBottom:16, fontFamily:F, color:C.text3, transition:"all .15s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text3;}}>
                <Ic n="upload" s={20}/><div style={{ fontSize:13, marginTop:6, fontWeight:600 }}>Upload File</div>
                <div style={{ fontSize:11, marginTop:2 }}>Click to add attachment (demo)</div>
              </button>
              {attachments.length===0 ? (
                <div style={{ textAlign:"center", padding:"24px 0", color:C.text3, fontSize:13 }}>No attachments yet</div>
              ) : attachments.map(att=>(
                <div key={att.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"#f8f9fc", borderRadius:10, marginBottom:8, border:`1px solid ${C.border}` }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Ic n="file" s={16} c={C.accent}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{att.name}</div>
                    <div style={{ fontSize:11, color:C.text3 }}>{att.uploaded_by} · {new Date(att.created_at).toLocaleDateString()}</div>
                  </div>
                  <button onClick={async()=>{await api.del(`/attachments/${att.id}`);load();}} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:4, display:"flex" }}><Ic n="trash" s={14}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ─── Main Records View ────────────────────────────────────────────────────── */
export default function RecordsView({ environment, object }) {
  const [records, setRecords]   = useState([]);
  const [fields,  setFields]    = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view,    setView]      = useState("table");
  const [search,  setSearch]    = useState("");
  const [selected, setSelected] = useState(null);
  const [fullPage, setFullPage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, r] = await Promise.all([
      api.get(`/fields?object_id=${object.id}`),
      api.get(`/records?object_id=${object.id}&environment_id=${environment.id}&page=${page}&limit=50${search?`&search=${encodeURIComponent(search)}`:""}`),
    ]);
    setFields(Array.isArray(f)?f:[]);
    setRecords(r.records||[]);
    setTotal(r.pagination?.total||0);
    setLoading(false);
  }, [object.id, environment.id, page, search]);

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

        <div style={{ flex:1 }}/>

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

        <Btn icon="plus" onClick={()=>setShowForm(true)}>New {object.name}</Btn>
      </div>

      {/* Content */}
      <div style={{ flex:1, background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:C.text3 }}>Loading…</div>
        ) : view==="table" ? (
          <TableView records={records} fields={fields} objectColor={object.color||C.accent}
            onSelect={r=>{setSelected(r);setFullPage(false);}} onEdit={r=>setEditRecord(r)} onDelete={handleDelete}/>
        ) : (
          <div style={{ padding:"20px" }}>
            <KanbanView records={records} fields={fields} objectColor={object.color||C.accent}
              onSelect={r=>{setSelected(r);setFullPage(false);}} onEdit={r=>setEditRecord(r)}
              onDelete={handleDelete} onStatusChange={handleStatusChange}/>
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

      {/* Detail panel */}
      {selected && (
        <RecordDetail
          record={selected}
          fields={fields}
          environment={environment}
          objectName={object.name}
          objectColor={object.color||C.accent}
          fullPage={fullPage}
          onClose={()=>{setSelected(null);setFullPage(false);}}
          onToggleFullPage={()=>setFullPage(f=>!f)}
          onUpdate={handleDetailUpdate}
          onDelete={handleDelete}
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
    </div>
  );
}
