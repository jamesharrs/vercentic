import { useState, useEffect, useCallback, useRef } from "react";

import api from './apiClient.js';




const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg:"#f4f5f8", surface:"#ffffff", border:"#e8eaed",
  text1:"#111827", text2:"#4b5563", text3:"#9ca3af",
  accent:"#3b5bdb", accentLight:"#eef1ff",
};

const Ic = ({ n, s=16, c="currentColor" }) => {
  const P = {
    search:"M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
    x:"M18 6L6 18M6 6l12 12",
    filter:"M22 3H2l8 9.46V19l4 2v-8.54L22 3",
    chevD:"M6 9l6 6 6-6", chevR:"M9 18l6-6-6-6",
    plus:"M12 5v14M5 12h14",
    users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    briefcase:"M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
    layers:"M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    arrowR:"M5 12h14M12 5l7 7-7 7",
    sliders:"M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    clock:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    save:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {P[n] && <path d={P[n]}/>}
    </svg>
  );
};

const Badge = ({ children, color="#6b7280", light, onRemove }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:99, fontSize:11, fontWeight:600, background:light?`${color}18`:color, color:light?color:"white", border:`1px solid ${color}28` }}>
    {children}
    {onRemove && <button onClick={onRemove} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", color:"inherit", opacity:0.7 }}><Ic n="x" s={10}/></button>}
  </span>
);

const STATUS_COLORS = {
  "Active":"#0ca678","Passive":"#f59f00","Not Looking":"#868e96","Placed":"#3b5bdb","Archived":"#adb5bd",
  "Open":"#0ca678","Draft":"#868e96","On Hold":"#f59f00","Filled":"#3b5bdb","Cancelled":"#e03131",
  "High":"#e03131","Critical":"#c92a2a","Medium":"#f59f00","Low":"#0ca678",
};

const FieldValue = ({ field, value }) => {
  if (!value && value !== 0) return <span style={{color:C.text3,fontSize:12}}>—</span>;
  switch(field?.field_type) {
    case "select": return <Badge color={STATUS_COLORS[value]||C.accent} light>{value}</Badge>;
    case "rating": return <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(i=><Ic key={i} n="star" s={12} c={i<=value?"#f59f00":"#e5e7eb"}/>)}</div>;
    case "email":  return <a href={`mailto:${value}`} style={{color:C.accent,fontSize:12,textDecoration:"none"}} onClick={e=>e.stopPropagation()}>{value}</a>;
    default:       return <span style={{fontSize:12,color:C.text1}}>{String(value).slice(0,60)}</span>;
  }
};

const Avatar = ({ name, color=C.accent, size=32 }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
    <span style={{ color:"white", fontSize:size*0.35, fontWeight:700 }}>{name?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?"}</span>
  </div>
);

/* ─── Filter Builder ─────────────────────────────────────────────────────── */
const OPERATORS = {
  text:     ["contains","does not contain","is","starts with","is empty","is not empty"],
  email:    ["contains","is","is empty","is not empty"],
  number:   ["equals","greater than","less than","between","is empty","is not empty"],
  currency: ["equals","greater than","less than","between","is empty","is not empty"],
  select:   ["is","is not","is empty","is not empty"],
  multi_select: ["includes","excludes","is empty","is not empty"],
  boolean:  ["is true","is false"],
  date:     ["is","before","after","between","is empty","is not empty"],
  rating:   ["equals","greater than","less than"],
};

const getOperators = (fieldType) => OPERATORS[fieldType] || OPERATORS.text;

const FilterRow = ({ filter, fields, onChange, onRemove }) => {
  const field = fields.find(f=>f.id===filter.field_id);
  const operators = field ? getOperators(field.field_type) : [];
  const needsValue = !["is empty","is not empty","is true","is false"].includes(filter.operator);

  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
      {/* Field selector */}
      <select value={filter.field_id||""} onChange={e=>onChange({...filter,field_id:e.target.value,operator:getOperators(fields.find(f=>f.id===e.target.value)?.field_type||"text")[0],value:""})}
        style={{ padding:"6px 8px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:"none", background:C.surface, color:C.text1, minWidth:130 }}>
        <option value="">Select field…</option>
        {fields.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
      </select>

      {/* Operator */}
      <select value={filter.operator||""} onChange={e=>onChange({...filter,operator:e.target.value,value:""})}
        style={{ padding:"6px 8px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:"none", background:C.surface, color:C.text1, minWidth:120 }}>
        {operators.map(op=><option key={op} value={op}>{op}</option>)}
      </select>

      {/* Value */}
      {needsValue && field && (
        field.field_type==="select" ? (
          <select value={filter.value||""} onChange={e=>onChange({...filter,value:e.target.value})}
            style={{ padding:"6px 8px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:"none", background:C.surface, color:C.text1, minWidth:110 }}>
            <option value="">Any</option>
            {(field.options||[]).map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        ) : field.field_type==="boolean" ? null : (
          <input value={filter.value||""} onChange={e=>onChange({...filter,value:e.target.value})}
            placeholder="Value…" type={["number","currency","rating"].includes(field.field_type)?"number":"text"}
            style={{ padding:"6px 8px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:12, fontFamily:F, outline:"none", background:C.surface, color:C.text1, width:110 }}/>
        )
      )}

      <button onClick={onRemove} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:4, display:"flex", flexShrink:0, marginLeft:"auto" }}>
        <Ic n="x" s={14}/>
      </button>
    </div>
  );
};

/* ─── Apply filters to records client-side ───────────────────────────────── */
const applyFilters = (records, filters, fields) => {
  if (!filters.length) return records;
  return records.filter(record => {
    return filters.every(filter => {
      const field = fields.find(f=>f.id===filter.field_id);
      if (!field) return true;
      const val = record.data?.[field.api_key];
      const fval = filter.value;
      switch(filter.operator) {
        case "contains":         return String(val||"").toLowerCase().includes(String(fval).toLowerCase());
        case "does not contain": return !String(val||"").toLowerCase().includes(String(fval).toLowerCase());
        case "is":               return String(val||"")===String(fval);
        case "is not":           return String(val||"")!==String(fval);
        case "starts with":      return String(val||"").toLowerCase().startsWith(String(fval).toLowerCase());
        case "is empty":         return !val && val!==0;
        case "is not empty":     return !!val || val===0;
        case "equals":           return Number(val)===Number(fval);
        case "greater than":     return Number(val)>Number(fval);
        case "less than":        return Number(val)<Number(fval);
        case "includes":         return (Array.isArray(val)?val:String(val||"").split(",")).includes(fval);
        case "excludes":         return !(Array.isArray(val)?val:String(val||"").split(",")).includes(fval);
        case "before":           return new Date(val)<new Date(fval);
        case "after":            return new Date(val)>new Date(fval);
        case "is true":          return !!val;
        case "is false":         return !val;
        default:                 return true;
      }
    });
  });
};

/* ─── Result Card ─────────────────────────────────────────────────────────── */
const ResultCard = ({ record, fields, object, onClick }) => {
  const d = record.data || {};
  // Build display name from data directly — don't depend on fields being loaded
  const title = [d.first_name, d.last_name].filter(Boolean).join(" ")
    || d.name || d.job_title || d.pool_name || d.title
    || (fields.find(f=>f.api_key==="first_name") ? "" : Object.values(d).find(v=>typeof v==="string"&&v.length>1))
    || record.id?.slice(0,8);
  const sub = d.current_title || d.department || d.category || d.description?.slice(0,60) || d.email || "";
  const bodyFs = fields.filter(f=>f.show_in_list&&!["first_name","last_name","name"].includes(f.api_key)).slice(0,4);

  return (
    <div onClick={onClick} style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:"14px 16px", cursor:"pointer", transition:"all .12s", display:"flex", alignItems:"flex-start", gap:12 }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.08)";e.currentTarget.style.borderColor="#d1d5db";}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.border;}}>
      <Avatar name={title} color={object?.color||C.accent} size={36}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
          <span style={{ fontSize:14, fontWeight:700, color:C.text1 }}>{title}</span>
          <span style={{ fontSize:11, color:C.text3, background:"#f3f4f6", borderRadius:6, padding:"1px 6px" }}>{object?.name}</span>
        </div>
        {sub && <div style={{ fontSize:12, color:C.text3, marginBottom:6 }}>{sub}</div>}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 16px" }}>
          {bodyFs.map(f => {
            const v = record.data?.[f.api_key];
            if (!v && v!==0) return null;
            return (
              <div key={f.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:11, color:C.text3 }}>{f.name}:</span>
                <FieldValue field={f} value={v}/>
              </div>
            );
          })}
        </div>
      </div>
      <Ic n="arrowR" s={14} c={C.text3}/>
    </div>
  );
};

/* ─── Saved Searches ─────────────────────────────────────────────────────── */
const STORAGE_KEY = "talentos_saved_searches";
const getSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); } catch { return []; } };
const setSaved = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

/* ─── Main Search & Filter Page ──────────────────────────────────────────── */
export default function SearchPage({ environment, onNavigateToRecord }) {
  const [query,      setQuery]      = useState("");
  const [objects,    setObjects]    = useState([]);
  const [fields,     setFields]     = useState({});   // { object_id: [fields] }
  const [allRecords, setAllRecords] = useState({});   // { object_id: [records] }
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);
  const [results,    setResults]    = useState([]);

  // Filters
  const [showFilters,  setShowFilters]  = useState(false);
  const [activeObject, setActiveObject] = useState(null); // object to filter on
  const [filters,      setFilters]      = useState([]);
  const [filterLogic,  setFilterLogic]  = useState("AND");

  // Saved searches
  const [savedSearches, setSavedSearches] = useState(getSaved());
  const [saveName,      setSaveName]      = useState("");
  const [showSave,      setShowSave]      = useState(false);

  const inputRef = useRef(null);

  // Pick up query passed from the global search bar
  useEffect(() => {
    const pending = sessionStorage.getItem("talentos_search_query");
    if (pending) {
      sessionStorage.removeItem("talentos_search_query");
      setQuery(pending);
      // Trigger search after objects load — handled in the search effect below
      setTimeout(() => { inputRef.current?.focus(); }, 100);
    }
  }, []);

  // Load objects + fields on mount — set fields BEFORE marking objects as ready
  useEffect(() => {
    if (!environment?.id) return;
    const load = async () => {
      const objs = await api.get(`/objects?environment_id=${environment.id}`);
      if (!Array.isArray(objs) || !objs.length) return;
      // Load all fields first, then set objects so search can't run with empty fields
      const fieldMap = {};
      await Promise.all(objs.map(async obj => {
        const fs = await api.get(`/fields?object_id=${obj.id}`);
        fieldMap[obj.id] = Array.isArray(fs) ? fs : [];
      }));
      setFields(fieldMap);
      setObjects(objs);
      if (objs.length) setActiveObject(objs[0]);
    };
    load();
  }, [environment?.id]);

  // Auto-search if query was pre-filled from global search bar
  useEffect(() => {
    if (objects.length && query.trim()) {
      const pending = sessionStorage.getItem("talentos_autosearch");
      if (pending === "1") {
        sessionStorage.removeItem("talentos_autosearch");
        handleSearch();
      }
    }
  }, [objects.length]);

  // Load all records when searching
  const loadAllRecords = useCallback(async () => {
    const recordMap = {};
    await Promise.all(objects.map(async obj => {
      const r = await api.get(`/records?object_id=${obj.id}&environment_id=${environment.id}&limit=500`);
      recordMap[obj.id] = r.records || [];
    }));
    setAllRecords(recordMap);
    return recordMap;
  }, [objects, environment?.id]);

  const handleSearch = useCallback(async () => {
    if (!query.trim() && !filters.length) return;
    if (!objects.length) return; // wait for objects to load
    setLoading(true);
    setSearched(true);
    // Always reload records — stale cache from a different object set causes missed results
    const recordMap = await loadAllRecords();

    let combined = [];
    for (const obj of objects) {
      let recs = recordMap[obj.id] || [];
      // Text search
      if (query.trim()) {
        recs = recs.filter(r => JSON.stringify(r.data||{}).toLowerCase().includes(query.toLowerCase()));
      }
      // Apply filters (only for activeObject if set)
      if (filters.length && activeObject?.id === obj.id) {
        recs = applyFilters(recs, filters, fields[obj.id]||[]);
      }
      combined.push(...recs.map(r => ({ ...r, _object: obj })));
    }
    setResults(combined);
    setLoading(false);
  }, [query, filters, objects, allRecords, loadAllRecords, activeObject, fields]);

  // Live search as user types — also re-run when objects finish loading
  useEffect(() => {
    if (!query.trim() && !filters.length) { setResults([]); setSearched(false); return; }
    if (!objects.length) return; // don't fire until objects are loaded
    const t = setTimeout(handleSearch, 300);
    return () => clearTimeout(t);
  }, [query, handleSearch, objects.length]);

  const handleSaveSearch = () => {
    if (!saveName.trim()) return;
    const newSaved = [...savedSearches, { id: Date.now(), name: saveName, query, filters, activeObjectId: activeObject?.id, created: new Date().toISOString() }];
    setSavedSearches(newSaved);
    setSaved(newSaved);
    setSaveName(""); setShowSave(false);
  };

  const handleLoadSaved = (s) => {
    setQuery(s.query||"");
    setFilters(s.filters||[]);
    const obj = objects.find(o=>o.id===s.activeObjectId);
    if (obj) setActiveObject(obj);
    setTimeout(handleSearch, 100);
  };

  const handleDeleteSaved = (id) => {
    const updated = savedSearches.filter(s=>s.id!==id);
    setSavedSearches(updated);
    setSaved(updated);
  };

  const addFilter = () => {
    const objFields = fields[activeObject?.id]||[];
    const firstField = objFields[0];
    if (!firstField) return;
    setFilters(f=>[...f, { id:Date.now(), field_id:firstField.id, operator:getOperators(firstField.field_type)[0], value:"" }]);
  };

  const objResults = (objId) => results.filter(r=>r._object?.id===objId);
  const activeFields = fields[activeObject?.id]||[];

  const OBJECT_ICONS = { people:"users", jobs:"briefcase", "talent-pools":"layers" };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:F }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:C.text1 }}>Search & Filter</h1>
        <p style={{ margin:0, fontSize:13, color:C.text3 }}>Search across all objects or build advanced filters</p>
      </div>

      <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
        {/* Left: search + filters */}
        <div style={{ flex:1, minWidth:0 }}>
          {/* Search bar */}
          <div style={{ position:"relative", marginBottom:12 }}>
            <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:C.text3, display:"flex" }}>
              <Ic n="search" s={18}/>
            </div>
            <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSearch()}
              placeholder="Search people, jobs, talent pools…"
              style={{ width:"100%", padding:"13px 16px 13px 44px", borderRadius:12, border:`2px solid ${C.border}`, fontSize:15, fontFamily:F, outline:"none", color:C.text1, background:C.surface, boxSizing:"border-box", transition:"border-color .15s" }}
              onFocus={e=>e.target.style.borderColor=C.accent}
              onBlur={e=>e.target.style.borderColor=C.border}
            />
            {query && <button onClick={()=>{setQuery("");setResults([]);setSearched(false);}} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.text3, display:"flex" }}><Ic n="x" s={16}/></button>}
          </div>

          {/* Filter toolbar */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            <button onClick={()=>setShowFilters(f=>!f)}
              style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:8, border:`1.5px solid ${showFilters?C.accent:C.border}`, background:showFilters?C.accentLight:"transparent", color:showFilters?C.accent:C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
              <Ic n="sliders" s={13}/> Filters {filters.length>0&&`(${filters.length})`}
            </button>

            {/* Active filters as badges */}
            {filters.map(f => {
              const field = activeFields.find(fd=>fd.id===f.field_id);
              if (!field) return null;
              return (
                <Badge key={f.id} color={C.accent} light onRemove={()=>setFilters(fs=>fs.filter(x=>x.id!==f.id))}>
                  {field.name} {f.operator} {f.value}
                </Badge>
              );
            })}

            {filters.length>1 && (
              <div style={{ display:"flex", border:`1px solid ${C.border}`, borderRadius:6, overflow:"hidden" }}>
                {["AND","OR"].map(l=>(
                  <button key={l} onClick={()=>setFilterLogic(l)}
                    style={{ padding:"4px 10px", border:"none", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:F, background:filterLogic===l?C.accent:"transparent", color:filterLogic===l?"white":C.text3 }}>
                    {l}
                  </button>
                ))}
              </div>
            )}

            <div style={{ flex:1 }}/>

            {searched && results.length>0 && (
              <button onClick={()=>setShowSave(true)}
                style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", color:C.text2, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
                <Ic n="save" s={13}/> Save Search
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:"16px 20px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.text2 }}>Filter</span>
                {/* Object tabs */}
                <div style={{ display:"flex", gap:4 }}>
                  {objects.map(obj=>(
                    <button key={obj.id} onClick={()=>{setActiveObject(obj);setFilters([]);}}
                      style={{ padding:"4px 10px", borderRadius:6, border:`1.5px solid ${activeObject?.id===obj.id?obj.color||C.accent:C.border}`, background:activeObject?.id===obj.id?`${obj.color||C.accent}12`:"transparent", color:activeObject?.id===obj.id?obj.color||C.accent:C.text3, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:F }}>
                      {obj.name}
                    </button>
                  ))}
                </div>
              </div>

              {filters.map((f,i) => (
                <FilterRow key={f.id} filter={f} fields={activeFields}
                  onChange={updated=>setFilters(fs=>fs.map(x=>x.id===f.id?updated:x))}
                  onRemove={()=>setFilters(fs=>fs.filter(x=>x.id!==f.id))}/>
              ))}

              <button onClick={addFilter}
                style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:10, padding:"6px 12px", borderRadius:8, border:`1px dashed ${C.border}`, background:"transparent", color:C.text3, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
                <Ic n="plus" s={13}/> Add Filter
              </button>

              {filters.length>0 && (
                <button onClick={handleSearch}
                  style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:10, marginLeft:8, padding:"6px 14px", borderRadius:8, border:"none", background:C.accent, color:"white", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
                  Apply Filters
                </button>
              )}
            </div>
          )}

          {/* Save search dialog */}
          {showSave && (
            <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:"16px 20px", marginBottom:16, display:"flex", gap:8, alignItems:"center" }}>
              <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Name this search…" onKeyDown={e=>e.key==="Enter"&&handleSaveSearch()}
                style={{ flex:1, padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, fontFamily:F, outline:"none", color:C.text1 }}/>
              <button onClick={handleSaveSearch} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:C.accent, color:"white", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>Save</button>
              <button onClick={()=>setShowSave(false)} style={{ padding:"7px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", cursor:"pointer", display:"flex", color:C.text3 }}><Ic n="x" s={14}/></button>
            </div>
          )}

          {/* Results */}
          {loading && (
            <div style={{ textAlign:"center", padding:"48px 0", color:C.text3 }}>
              <div style={{ fontSize:13 }}>Searching…</div>
            </div>
          )}

          {!loading && searched && results.length===0 && (
            <div style={{ textAlign:"center", padding:"64px 0", color:C.text3 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
              <div style={{ fontSize:15, fontWeight:600, color:C.text2, marginBottom:4 }}>No results found</div>
              <div style={{ fontSize:13 }}>Try different keywords or adjust your filters</div>
            </div>
          )}

          {!loading && results.length>0 && (
            <div>
              {/* Results by object */}
              {objects.map(obj => {
                const recs = objResults(obj.id);
                if (!recs.length) return null;
                return (
                  <div key={obj.id} style={{ marginBottom:24 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                      <div style={{ width:24, height:24, borderRadius:6, background:obj.color||C.accent, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Ic n={OBJECT_ICONS[obj.slug]||"layers"} s={12} c="white"/>
                      </div>
                      <span style={{ fontSize:13, fontWeight:700, color:C.text1 }}>{obj.plural_name}</span>
                      <span style={{ fontSize:11, color:C.text3, background:"#f3f4f6", borderRadius:99, padding:"1px 8px", fontWeight:600 }}>{recs.length}</span>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {recs.slice(0,10).map(r => (
                        <ResultCard key={r.id} record={r} fields={fields[obj.id]||[]} object={obj} onClick={()=>onNavigateToRecord?.(r)}/>
                      ))}
                      {recs.length>10 && (
                        <div style={{ fontSize:12, color:C.text3, textAlign:"center", padding:"6px 0" }}>+{recs.length-10} more results</div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize:12, color:C.text3, textAlign:"center", padding:"12px 0" }}>{results.length} total result{results.length!==1?"s":""}</div>
            </div>
          )}

          {/* Empty state */}
          {!searched && !loading && (
            <div style={{ textAlign:"center", padding:"64px 40px", color:C.text3 }}>
              <div style={{ width:56, height:56, borderRadius:16, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <Ic n="search" s={24} c={C.accent}/>
              </div>
              <div style={{ fontSize:15, fontWeight:600, color:C.text2, marginBottom:6 }}>Search your talent data</div>
              <div style={{ fontSize:13, maxWidth:360, margin:"0 auto", lineHeight:1.6 }}>
                Type to search across people, jobs, and talent pools — or use filters to build precise queries
              </div>
            </div>
          )}
        </div>

        {/* Right: saved searches */}
        <div style={{ width:220, flexShrink:0 }}>
          <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text2 }}>Saved Searches</div>
            </div>
            <div style={{ padding:"8px" }}>
              {savedSearches.length===0 ? (
                <div style={{ padding:"16px 8px", textAlign:"center", color:C.text3, fontSize:12 }}>No saved searches yet</div>
              ) : savedSearches.map(s=>(
                <div key={s.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 8px", borderRadius:8, cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#f8f9fc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <button onClick={()=>handleLoadSaved(s)} style={{ flex:1, background:"none", border:"none", cursor:"pointer", textAlign:"left", fontFamily:F, padding:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.text1 }}>{s.name}</div>
                    {s.query && <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>"{s.query}"</div>}
                    {s.filters?.length>0 && <div style={{ fontSize:11, color:C.text3 }}>{s.filters.length} filter{s.filters.length!==1?"s":""}</div>}
                  </button>
                  <button onClick={()=>handleDeleteSaved(s.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, padding:2, display:"flex", opacity:0.5, flexShrink:0 }}
                    onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.5}>
                    <Ic n="trash" s={12}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden", marginTop:12 }}>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text2 }}>Quick Stats</div>
            </div>
            <div style={{ padding:"8px 16px 12px" }}>
              {objects.map(obj=>(
                <div key={obj.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:obj.color||C.accent }}/>
                    <span style={{ fontSize:12, color:C.text2 }}>{obj.plural_name}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:C.text1 }}>{(allRecords[obj.id]||[]).length}</span>
                </div>
              ))}
              {!Object.keys(allRecords).length && (
                <div style={{ fontSize:11, color:C.text3, padding:"8px 0", textAlign:"center" }}>Search to see counts</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
