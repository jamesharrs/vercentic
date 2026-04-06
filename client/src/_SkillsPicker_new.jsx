// ── SkillsPicker ──────────────────────────────────────────────────────────────
// Server-side typeahead — searches 2,400+ ESCO skills without loading all upfront
const SkillsPicker = ({ field, value, onChange, environment, recordData }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [aiTooltip, setAiTooltip] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const ref = useRef(null);
  const debounceRef = useRef(null);
  const isMulti = field.skills_multi !== false && field.skills_multi !== "false";
  const selected = Array.isArray(value) ? value : (value ? [value] : []);

  // Close on outside click
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load categories on mount
  useEffect(() => {
    tFetch("/api/enterprise/skills/search/categories")
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setCategories(d); })
      .catch(() => {});
  }, []);

  // Debounced server-side search
  const doSearch = useCallback((q, cat) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: q || "", limit: "30" });
        if (cat) params.set("category", cat);
        const res = await tFetch(`/api/enterprise/skills/search?${params}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch { setResults([]); }
      setLoading(false);
    }, q ? 200 : 0); // instant for empty (browse mode), 200ms debounce for typing
  }, []);

  // Trigger search when dropdown opens, search changes, or category changes
  useEffect(() => {
    if (open) doSearch(search, filterCat);
  }, [open, search, filterCat, doSearch]);

  const CAT_COLORS = { Digital:"#4361EE", Technology:"#4361EE", Business:"#0CA678", Design:"#7C3AED", Transversal:"#F59F00", Languages:"#E03131", Certifications:"#1098AD", Engineering:"#3B5BDB", Healthcare:"#D6336C", Education:"#845EF7", Construction:"#E8590C", Hospitality:"#20C997", Media:"#BE4BDB" };

  const toggle = (name) => {
    if (isMulti) {
      onChange(selected.includes(name) ? selected.filter(s=>s!==name) : [...selected, name]);
    } else {
      onChange(name === selected[0] ? "" : name);
      setOpen(false);
    }
  };
  const remove = (name, e) => { e.stopPropagation(); onChange(isMulti ? selected.filter(s=>s!==name) : ""); };

  // AI skill extraction — calls server-side endpoint that extracts keywords then searches ESCO
  const handleAiExtract = async (e) => {
    e.stopPropagation();
    if (extracting || !recordData) return;
    setExtracting(true);
    try {
      const res = await tFetch("/api/enterprise/skills/ai-extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: recordData.job_title || recordData.title || recordData.name || "",
          department: recordData.department || "",
          level: recordData.job_level || recordData.seniority || "",
          description: recordData.description || recordData.job_description || "",
          existing_skills: selected,
        }),
      });
      const data = await res.json();
      if (data.results?.length > 0) {
        const suggestions = data.results
          .filter(s => !selected.includes(s.name))
          .map(s => ({ name: s.name, category: s.category || "", checked: true }));
        setAiSuggestions(suggestions.length > 0 ? suggestions : []);
      } else {
        setAiSuggestions([]);
      }
    } catch (err) { console.error("AI skill extraction failed:", err); }
    setExtracting(false);
  };

  const hasContext = recordData && (recordData.description || recordData.job_description || recordData.job_title);

  return (
    <div ref={ref} style={{position:"relative"}}>
      {/* Selected pills + input trigger */}
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",flexWrap:"wrap",gap:4,padding:"6px 8px",borderRadius:8,border:`1.5px solid ${open?C.accent:C.border}`,background:"white",cursor:"pointer",minHeight:36,alignItems:"center"}}>
        {selected.map(s => (
          <span key={s} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,background:`${C.accent}12`,border:`1px solid ${C.accent}28`,fontSize:12,fontWeight:600,color:C.accent}}>
            ⚡ {s}
            <span onClick={e=>remove(s,e)} style={{cursor:"pointer",opacity:0.6,fontSize:13,lineHeight:1}}>×</span>
          </span>
        ))}
        {selected.length===0 && <span style={{fontSize:13,color:C.text3,userSelect:"none"}}>{field.placeholder||"Add skills…"}</span>}
        {/* AI extract button */}
        {hasContext && (
          <div style={{marginLeft:"auto",position:"relative",flexShrink:0}}
            onMouseEnter={()=>setAiTooltip(true)} onMouseLeave={()=>setAiTooltip(false)}>
            <button onClick={handleAiExtract} disabled={extracting}
              style={{display:"flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:8,border:"none",
                background:extracting?"#E9ECEF":"linear-gradient(135deg,#7C3AED,#4361EE)",cursor:extracting?"wait":"pointer",transition:"all .15s"}}>
              {extracting ? <span style={{fontSize:12,color:C.text3}}>…</span> : <span style={{fontSize:14,filter:"brightness(10)"}}>✨</span>}
            </button>
            {aiTooltip && !extracting && (
              <div style={{position:"absolute",bottom:"calc(100% + 8px)",right:0,width:220,padding:"10px 12px",borderRadius:10,background:"#1a1a2e",color:"white",fontSize:11,lineHeight:1.5,zIndex:999,boxShadow:"0 8px 24px rgba(0,0,0,0.25)"}}>
                <strong style={{fontSize:12}}>AI Skill Extraction</strong><br/>
                Analyses the job to suggest matching skills from the full ESCO taxonomy ({categories.reduce((s,c)=>s+c.count,0).toLocaleString()} skills).
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,maxHeight:340,background:"white",borderRadius:12,border:`1.5px solid ${C.border}`,boxShadow:"0 12px 40px rgba(0,0,0,0.12)",zIndex:800,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {/* Search input */}
          <div style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} autoFocus
              placeholder="Search 2,400+ skills…" style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none"}}/>
          </div>
          {/* Category filter pills */}
          <div style={{display:"flex",gap:4,padding:"6px 10px",flexWrap:"wrap",borderBottom:`1px solid ${C.border}`,background:"#FAFBFC"}}>
            <button onClick={()=>setFilterCat("")} style={{padding:"3px 10px",borderRadius:99,border:`1px solid ${filterCat?C.border:C.accent}`,background:filterCat?"white":`${C.accent}12`,color:filterCat?C.text3:C.accent,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>All</button>
            {categories.map(c=>(
              <button key={c.name} onClick={()=>setFilterCat(f=>f===c.name?"":c.name)}
                style={{padding:"3px 10px",borderRadius:99,border:`1px solid ${filterCat===c.name?(CAT_COLORS[c.name]||C.accent):C.border}`,
                  background:filterCat===c.name?`${CAT_COLORS[c.name]||C.accent}12`:"white",
                  color:filterCat===c.name?(CAT_COLORS[c.name]||C.accent):C.text3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>
                {c.name} <span style={{opacity:0.5}}>({c.count})</span>
              </button>
            ))}
          </div>
          {/* Results list */}
          <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
            {loading ? (
              <div style={{padding:"20px",textAlign:"center",fontSize:12,color:C.text3}}>Searching…</div>
            ) : results.length === 0 ? (
              <div style={{padding:"20px",textAlign:"center",fontSize:12,color:C.text3}}>
                {search ? `No skills matching "${search}"` : "Type to search skills"}
              </div>
            ) : results.map(s => {
              const isSelected = selected.includes(s.name);
              const catColor = CAT_COLORS[s.category] || "#6B7280";
              return (
                <div key={s.id||s.name} onClick={()=>toggle(s.name)}
                  style={{padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,
                    background:isSelected?`${C.accent}08`:"transparent",borderLeft:isSelected?`3px solid ${C.accent}`:"3px solid transparent"}}
                  onMouseEnter={e=>e.currentTarget.style.background=isSelected?`${C.accent}12`:"#F7F8FA"}
                  onMouseLeave={e=>e.currentTarget.style.background=isSelected?`${C.accent}08`:"transparent"}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:catColor,flexShrink:0}}/>
                  <span style={{fontSize:13,fontWeight:isSelected?700:400,color:isSelected?C.accent:C.text1,flex:1}}>{s.name}</span>
                  <span style={{fontSize:10,color:C.text3}}>{s.category}</span>
                  {isSelected && <Ic n="check" s={13} c={C.accent}/>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Suggestion modal */}
      {aiSuggestions !== null && ReactDOM.createPortal(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setAiSuggestions(null)}>
          <div onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}
            style={{width:440,maxHeight:"70vh",background:"white",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#7C3AED,#4361EE)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:16,filter:"brightness(10)"}}>✨</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text1}}>AI Skill Suggestions</div>
                <div style={{fontSize:12,color:C.text3}}>{aiSuggestions.length} skills found from ESCO taxonomy</div>
              </div>
              {aiSuggestions.length > 0 && (
                <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.text3,cursor:"pointer"}}>
                  <input type="checkbox" checked={aiSuggestions.every(s=>s.checked)}
                    onChange={e=>setAiSuggestions(prev=>prev.map(s=>({...s,checked:e.target.checked})))} /> Select all
                </label>
              )}
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
              {aiSuggestions.length === 0 ? (
                <div style={{padding:"32px 20px",textAlign:"center",fontSize:13,color:C.text3}}>All matching skills are already added, or no taxonomy matches were found.</div>
              ) : aiSuggestions.map((s,i) => {
                const catColor = CAT_COLORS[s.category] || "#6B7280";
                return (
                  <div key={s.name} onClick={()=>setAiSuggestions(prev=>prev.map((x,j)=>j===i?{...x,checked:!x.checked}:x))}
                    style={{padding:"8px 20px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderBottom:`1px solid ${C.border}20`}}
                    onMouseEnter={e=>e.currentTarget.style.background="#F7F8FA"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <input type="checkbox" checked={s.checked} readOnly style={{accentColor:C.accent}}/>
                    <div style={{width:8,height:8,borderRadius:"50%",background:catColor,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:500,color:C.text1,flex:1}}>{s.name}</span>
                    <span style={{fontSize:10,color:catColor,fontWeight:600,padding:"2px 6px",borderRadius:4,background:`${catColor}12`}}>{s.category}</span>
                  </div>
                );
              })}
            </div>
            {aiSuggestions.length > 0 && (
              <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8}}>
                <button onClick={()=>setAiSuggestions(null)} style={{flex:1,padding:"9px",borderRadius:8,border:`1px solid ${C.border}`,background:"white",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F,color:C.text2}}>Cancel</button>
                <button onClick={()=>{
                  const toAdd = aiSuggestions.filter(s=>s.checked).map(s=>s.name);
                  if (toAdd.length) onChange(isMulti ? [...selected, ...toAdd] : toAdd[0]);
                  setAiSuggestions(null);
                }} style={{flex:2,padding:"9px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#7C3AED,#4361EE)",color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>
                  Add {aiSuggestions.filter(s=>s.checked).length} skills
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
