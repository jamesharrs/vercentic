import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const B = { purple:"#7F77DD", purpleLight:"#AFA9EC", rose:"#D4537E", teal:"#1D9E75", amber:"#EF9F27", gray:"#888780", gray2:"#374151", bg:"#F8F7FF", card:"white" };
const PALETTE = [B.purple, B.rose, B.teal, B.amber, B.purpleLight, "#E87FAA", "#5DCAA5"];
const api = { get:(p)=>fetch(p).then(r=>r.json()).catch(()=>null), post:(p,b)=>fetch(p,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>null), delete:(p)=>fetch(p,{method:"DELETE"}).then(r=>r.json()).catch(()=>null) };

function evalFormula(expr,row){
  try{
    const e=expr.toUpperCase(),nv=(k)=>{const v=row[k];return typeof v==="number"?v:parseFloat(v)||0;};
    if(/^COUNT\(\)$/i.test(e))return 1;
    if(/^SUM\(([^)]+)\)$/i.test(e)){const m=e.match(/SUM\(([^)]+)\)/);return nv(m[1].toLowerCase());}
    if(/^AVG\(([^)]+)\)$/i.test(e)){const m=e.match(/AVG\(([^)]+)\)/);return nv(m[1].toLowerCase());}
    if(/^UPPER\(([^)]+)\)$/i.test(e)){const m=expr.match(/UPPER\(([^)]+)\)/i);return String(row[m[1]]||"").toUpperCase();}
    if(/^LOWER\(([^)]+)\)$/i.test(e)){const m=expr.match(/LOWER\(([^)]+)\)/i);return String(row[m[1]]||"").toLowerCase();}
    if(/^LEN\(([^)]+)\)$/i.test(e)){const m=expr.match(/LEN\(([^)]+)\)/i);return String(row[m[1]]||"").length;}
    if(/^ROUND\(([^,)]+),([^)]+)\)$/i.test(e)){const m=expr.match(/ROUND\(([^,)]+),([^)]+)\)/i);return parseFloat(nv(m[1].trim()).toFixed(parseInt(m[2].trim())));}
    if(/^DIFF\(([^,)]+),([^)]+)\)$/i.test(e)){const m=e.match(/DIFF\(([^,)]+),([^)]+)\)/);return nv(m[1].trim())-nv(m[2].trim());}
    if(/^CONCAT\(([^)]+)\)$/i.test(e)){const m=expr.match(/CONCAT\(([^)]+)\)/i);return m[1].split(",").map(p=>{const t=p.trim();return t.startsWith("{")&&t.endsWith("}")?row[t.slice(1,-1)]||"":t.replace(/^['"]|['"]$/g,"");}).join("");}
    if(/^IF\(/i.test(e)){const m=expr.match(/IF\(([^,]+),([^,]+),([^)]+)\)/i);if(m){const[l,op,r]=(m[1].trim()).split(/(=|!=|>|<)/);const lv=row[l.trim().replace(/[{}]/g,"")]||0,rv=(r?.trim().replace(/['"]/g,""))||"";const pass=op==="="?String(lv)===rv:op==="!="?String(lv)!==rv:op===">"?lv>rv:lv<rv;return pass?m[2].trim().replace(/['"]/g,""):m[3].trim().replace(/['"]/g,"");}}
    const fm=expr.match(/\{([^}]+)\}/g);if(fm){let res=expr;fm.forEach(f=>{res=res.replace(f,row[f.slice(1,-1)]||"");});return res;}
    return "";
  }catch{return "";}
}

const OPS={text:["contains","is","is not","is empty","is not empty"],number:["=","≠",">","<","≥","≤","is empty"],select:["is","is not","is empty"],multi_select:["includes","does not include","is empty"],date:["is","before","after","is empty"],boolean:["is true","is false"],rating:["=",">","<"],currency:["=",">","<","≥","≤"]};

const DarkTip=({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:"#0F0F19",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#fff"}}><div style={{fontWeight:700,marginBottom:6}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:p.color||"#ccc",marginTop:2}}>{p.name}: <strong>{p.value}</strong></div>)}</div>);};

function Panel({title,sub,children,action}){return(<div style={{background:B.card,borderRadius:14,padding:"20px 22px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:sub?2:16}}><div><div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{title}</div>{sub&&<div style={{fontSize:11,color:B.gray,marginTop:2,marginBottom:12}}>{sub}</div>}</div>{action}</div>{children}</div>);}

function Pill({label,active,onClick}){return(<button onClick={onClick} style={{fontSize:11,padding:"4px 12px",borderRadius:20,cursor:"pointer",border:"none",background:active?B.purple:B.card,color:active?"#fff":B.gray,fontFamily:"inherit",fontWeight:active?700:400,boxShadow:active?"none":"0 1px 3px rgba(0,0,0,0.06)",transition:"all 0.15s"}}>{label}</button>);}

const SideLabel=({children})=>(<div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:B.gray,marginBottom:6}}>{children}</div>);
const Inp=({val,onChange,placeholder,style})=>(<input value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{fontSize:12,padding:"6px 10px",borderRadius:8,border:"0.5px solid rgba(0,0,0,0.1)",background:"white",color:"#111827",fontFamily:"inherit",width:"100%",outline:"none",...style}}/>);
const Sel=({val,onChange,opts})=>(<select value={val} onChange={e=>onChange(e.target.value)} style={{fontSize:12,padding:"6px 10px",borderRadius:8,border:"0.5px solid rgba(0,0,0,0.1)",background:"white",color:"#111827",fontFamily:"inherit",width:"100%",outline:"none"}}><option value="">— select —</option>{opts.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}</select>);

function ResultRow({row,cols,groupBy,active,onFilter}){
  const[hov,setHov]=useState(false);
  return(
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:active?"rgba(127,119,221,0.06)":hov?"#F8F7FF":"transparent",transition:"background 0.1s"}}>
      {cols.map(k=>(
        <td key={k} style={{padding:"9px 10px",color:k==="_count"?"#7F77DD":"#374151",fontWeight:k==="_count"?700:400,cursor:groupBy&&k==="_group"?"pointer":"default"}} onClick={()=>{if(groupBy&&k==="_group"&&row[k])onFilter(groupBy,row[k]);}}>
          {k==="_count"?<span style={{color:"#7F77DD",fontWeight:700}}>{row[k]}</span>:String(row[k]??"—").slice(0,60)}
          {groupBy&&k==="_group"&&hov&&<span style={{fontSize:10,color:"#7F77DD",marginLeft:6}}>↗</span>}
        </td>
      ))}
      {groupBy&&<td style={{padding:"9px 10px",textAlign:"right"}}>{row._group&&<button onClick={()=>onFilter(groupBy,row._group)} style={{fontSize:10,color:"#7F77DD",background:"rgba(127,119,221,0.1)",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,padding:"3px 8px",borderRadius:20,opacity:hov?1:0,transition:"opacity 0.1s"}}>View list ↗</button>}</td>}
    </tr>
  );
}

export default function Reports({environment,initialReport}){
  const[objects,setObjects]=useState([]);const[fields,setFields]=useState([]);const[selObject,setSelObject]=useState("");
  const[selCols,setSelCols]=useState([]);const[filters,setFilters]=useState([]);const[groupBy,setGroupBy]=useState("");
  const[sortBy,setSortBy]=useState("");const[sortDir,setSortDir]=useState("desc");const[formulas,setFormulas]=useState([]);
  const[chartType,setChartType]=useState("bar");const[chartX,setChartX]=useState("");const[chartY,setChartY]=useState("");
  const[results,setResults]=useState(null);const[running,setRunning]=useState(false);const[panel,setPanel]=useState("build");
  const[savedList,setSavedList]=useState([]);const[reportName,setReportName]=useState("");const[reportShared,setReportShared]=useState(false);
  const[savingReport,setSavingReport]=useState(false);const[showSaveDialog,setShowSaveDialog]=useState(false);
  const[activeChartFilter,setActiveChartFilter]=useState(null);
  const skipReset=useRef(false);

  useEffect(()=>{if(!environment?.id)return;api.get(`/objects?environment_id=${environment.id}`).then(d=>setObjects(Array.isArray(d)?d:[]));api.get(`/saved-views?environment_id=${environment.id}`).then(d=>setSavedList(Array.isArray(d)?d:[]));}, [environment?.id]);

  useEffect(()=>{
    if(!selObject)return;
    api.get(`/fields?object_id=${selObject}`).then(d=>{
      const f=Array.isArray(d)?d:[];setFields(f);
      if(!skipReset.current){setSelCols(f.filter(x=>x.show_in_list).map(x=>x.id));setGroupBy("");setSortBy("");setFilters([]);setFormulas([]);setChartX("");setChartY("");setResults(null);setActiveChartFilter(null);}
      skipReset.current=false;
    });
  },[selObject]);

  useEffect(()=>{
    if(!initialReport||!objects.length)return;
    const obj=objects.find(o=>o.slug===initialReport.object||o.name?.toLowerCase().includes(initialReport.object));
    if(obj){skipReset.current=true;setSelObject(obj.id);if(initialReport.groupBy)setGroupBy(initialReport.groupBy);if(initialReport.chartType)setChartType(initialReport.chartType);if(initialReport.formulas)setFormulas(initialReport.formulas);if(initialReport.filters)setFilters(initialReport.filters);setPanel("build");setTimeout(()=>runReport(obj.id,initialReport.groupBy),400);}
  },[initialReport,objects]);

  const runReport=useCallback(async(objectId,grpBy)=>{
    const oid=objectId||selObject;if(!oid||!environment?.id)return;setRunning(true);
    try{
      const res=await api.get(`/records?object_id=${oid}&environment_id=${environment.id}&limit=500`);
      const raw=Array.isArray(res?.records)?res.records:[];let rows=raw.map(r=>({_id:r.id,_createdAt:r.created_at,...r.data}));
      const af=filters.filter(f=>f.field&&f.op);
      if(af.length)rows=rows.filter(row=>af.every(f=>{const v=String(row[f.field]||"").toLowerCase(),fv=String(f.value||"").toLowerCase();switch(f.op){case"contains":return v.includes(fv);case"is":return v===fv;case"is not":return v!==fv;case"is empty":return!row[f.field];case"is not empty":return!!row[f.field];case">":return parseFloat(row[f.field])>parseFloat(f.value);case"<":return parseFloat(row[f.field])<parseFloat(f.value);case"≥":return parseFloat(row[f.field])>=parseFloat(f.value);case"≤":return parseFloat(row[f.field])<=parseFloat(f.value);case"=":return parseFloat(row[f.field])===parseFloat(f.value);case"includes":return(Array.isArray(row[f.field])?row[f.field]:[row[f.field]]).some(x=>String(x).toLowerCase()===fv);default:return true;}}));
      const gb=grpBy||groupBy;let grouped=rows;
      if(gb){const groups={};rows.forEach(r=>{const k=String(r[gb]||"Unknown");if(!groups[k])groups[k]=[];groups[k].push(r);});grouped=Object.entries(groups).map(([key,members])=>({_group:key,_count:members.length,...members.reduce((acc,m)=>{Object.keys(m).forEach(k=>{if(typeof m[k]==="number")acc[k]=(acc[k]||0)+m[k];});return acc;},{})}))}
      if(formulas.length)grouped=grouped.map(row=>{const x={};formulas.forEach(f=>{if(f.name&&f.expression)x[f.name]=evalFormula(f.expression,row);});return{...row,...x};});
      if(sortBy)grouped.sort((a,b)=>{const av=a[sortBy],bv=b[sortBy];if(typeof av==="number")return sortDir==="asc"?av-bv:bv-av;return sortDir==="asc"?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av));});
      setResults(grouped);if(!chartX&&gb)setChartX("_group");if(!chartY&&gb)setChartY("_count");setActiveChartFilter(null);
    }catch(e){console.error(e);}finally{setRunning(false);}
  },[selObject,environment?.id,filters,groupBy,sortBy,sortDir,formulas,chartX,chartY]);

  const saveReport=async()=>{if(!reportName||!selObject)return;setSavingReport(true);const cfg={name:reportName,object_id:selObject,environment_id:environment?.id,is_shared:reportShared,filters,group_by:groupBy,sort_by:sortBy,sort_dir:sortDir,formulas,chart_type:chartType,chart_x:chartX,chart_y:chartY,columns:selCols};const d=await api.post("/api/saved-views",cfg);if(d?.id){setSavedList(p=>[...p,d]);setReportName("");setShowSaveDialog(false);}setSavingReport(false);};
  const loadReport=(sv)=>{skipReset.current=true;setSelObject(sv.object_id||selObject);if(sv.filters)setFilters(sv.filters);if(sv.group_by)setGroupBy(sv.group_by);if(sv.sort_by)setSortBy(sv.sort_by);if(sv.sort_dir)setSortDir(sv.sort_dir);if(sv.formulas)setFormulas(sv.formulas);if(sv.chart_type)setChartType(sv.chart_type);if(sv.chart_x)setChartX(sv.chart_x);if(sv.chart_y)setChartY(sv.chart_y);if(sv.columns)setSelCols(sv.columns);};
  const deleteReport=async(id)=>{await api.delete(`/saved-views/${id}`);setSavedList(p=>p.filter(s=>s.id!==id));};
  const addFilter=()=>setFilters(p=>[...p,{id:Date.now(),field:fields[0]?.api_key||"",op:"contains",value:""}]);
  const addFormula=()=>setFormulas(p=>[...p,{id:Date.now(),name:"",expression:""}]);
  const handleChartClick=(data)=>{if(!data?.activePayload?.[0])return;const v=data.activePayload[0].payload?.[chartX]??data.activePayload[0].payload?._group;if(!v)return;setActiveChartFilter(prev=>prev===String(v)?null:String(v));};
  const handlePieClick=(entry)=>{const val=entry?.name||entry?.[chartX];if(!val)return;setActiveChartFilter(prev=>prev===String(val)?null:String(val));};
  const displayedResults=activeChartFilter&&results?results.filter(r=>String(r[chartX]||r._group||"")===activeChartFilter):results;
  const resultCols=results?.length?Object.keys(results[0]).filter(k=>!k.startsWith("_")||k==="_count"||k==="_group"):[];
  const chartData=results?.slice(0,20)||[];
  const goToFiltered=(filterKey,filterValue)=>{const obj=objects.find(o=>o.id===selObject);if(!obj)return;window.dispatchEvent(new CustomEvent("talentos:filter-navigate",{detail:{objectSlug:obj.slug,fieldKey:filterKey,fieldValue:filterValue}}));};
  const exportCSV=()=>{if(!displayedResults)return;const cols=fields.filter(f=>selCols.includes(f.id));const headers=cols.map(f=>f.name).join(",");const rows=displayedResults.map(r=>cols.map(f=>JSON.stringify(r[f.api_key]??"")));const csv=[headers,...rows.map(r=>r.join(","))].join("\n");const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download="report.csv";a.click();};

  return(
    <div style={{background:B.bg,minHeight:"100vh",padding:"28px 32px",fontFamily:"'DM Sans',-apple-system,sans-serif"}}>
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:24}}>
        <div><div style={{fontSize:24,fontWeight:800,color:"#0F0F19",letterSpacing:"-0.03em"}}>Reports</div><div style={{fontSize:13,color:B.gray,marginTop:4}}>Build, save and share reports from any data</div></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setShowSaveDialog(true);setPanel("saved");}} style={{fontSize:11,padding:"6px 14px",borderRadius:20,border:"none",background:B.card,color:B.gray,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>Save report</button>
          <button onClick={()=>runReport()} style={{fontSize:11,padding:"6px 14px",borderRadius:20,border:"none",background:B.purple,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>{running?"Running…":"▶ Run report"}</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"260px minmax(0,1fr)",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",gap:4}}>
            {["build","formulas","saved"].map(p=><Pill key={p} label={p==="build"?"Build":p==="formulas"?"∑ Formulas":"Saved reports"} active={panel===p} onClick={()=>setPanel(p)}/>)}
          </div>
          {panel==="build"&&(
            <div style={{background:B.card,borderRadius:14,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)",display:"flex",flexDirection:"column",gap:14}}>
              <div><SideLabel>Data source</SideLabel><Sel val={selObject} onChange={v=>setSelObject(v)} opts={objects.map(o=>({value:o.id,label:o.plural_name||o.name}))}/></div>
              {fields.length>0&&<div><SideLabel>Columns</SideLabel><div style={{display:"flex",flexDirection:"column",gap:4}}>{fields.map(f=><label key={f.id} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:12,color:B.gray2}}><input type="checkbox" checked={selCols.includes(f.id)} onChange={e=>setSelCols(p=>e.target.checked?[...p,f.id]:p.filter(x=>x!==f.id))} style={{accentColor:B.purple}}/>{f.name}</label>)}</div></div>}
              {fields.length>0&&<div><SideLabel>Group by</SideLabel><Sel val={groupBy} onChange={setGroupBy} opts={fields.map(f=>({value:f.api_key,label:f.name}))}/></div>}
              {fields.length>0&&<div><SideLabel>Sort by</SideLabel><div style={{display:"flex",gap:6}}><div style={{flex:1}}><Sel val={sortBy} onChange={setSortBy} opts={fields.map(f=>({value:f.api_key,label:f.name}))}/></div><select value={sortDir} onChange={e=>setSortDir(e.target.value)} style={{fontSize:12,padding:"6px 8px",borderRadius:8,border:"0.5px solid rgba(0,0,0,0.1)",background:"white",color:"#111827",fontFamily:"inherit"}}><option value="desc">↓</option><option value="asc">↑</option></select></div></div>}
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><SideLabel>Filters</SideLabel><button onClick={addFilter} style={{fontSize:11,color:B.purple,background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>+ Add</button></div>
                {filters.map((f,i)=><div key={f.id} style={{marginBottom:8,background:B.bg,borderRadius:10,padding:10}}><div style={{display:"flex",gap:4,marginBottom:4}}><div style={{flex:1}}><Sel val={f.field} onChange={v=>setFilters(p=>p.map((x,j)=>j===i?{...x,field:v}:x))} opts={fields.map(fi=>({value:fi.api_key,label:fi.name}))}/></div><button onClick={()=>setFilters(p=>p.filter((_,j)=>j!==i))} style={{fontSize:12,color:B.rose,background:"none",border:"none",cursor:"pointer",padding:"0 4px"}}>×</button></div><div style={{display:"flex",gap:4}}><div style={{flex:1}}><Sel val={f.op} onChange={v=>setFilters(p=>p.map((x,j)=>j===i?{...x,op:v}:x))} opts={(OPS[fields.find(fi=>fi.api_key===f.field)?.field_type]||OPS.text).map(o=>({value:o,label:o}))}/></div>{!["is empty","is not empty","is true","is false"].includes(f.op)&&<div style={{flex:1}}><Inp val={f.value} onChange={v=>setFilters(p=>p.map((x,j)=>j===i?{...x,value:v}:x))} placeholder="value…"/></div>}</div></div>)}
              </div>
            </div>
          )}
          {panel==="formulas"&&(
            <div style={{background:B.card,borderRadius:14,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:"#111827"}}>Calculated columns</div><button onClick={addFormula} style={{fontSize:11,color:B.purple,background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>+ Add</button></div>
              {formulas.length===0&&<div style={{fontSize:12,color:B.gray,textAlign:"center",padding:"16px 0"}}>No formulas yet</div>}
              {formulas.map((f,i)=><div key={f.id} style={{marginBottom:10,background:B.bg,borderRadius:10,padding:10}}><div style={{display:"flex",gap:4,marginBottom:4}}><div style={{flex:1}}><Inp val={f.name} onChange={v=>setFormulas(p=>p.map((x,j)=>j===i?{...x,name:v}:x))} placeholder="Column name…"/></div><button onClick={()=>setFormulas(p=>p.filter((_,j)=>j!==i))} style={{fontSize:12,color:B.rose,background:"none",border:"none",cursor:"pointer"}}>×</button></div><Inp val={f.expression} onChange={v=>setFormulas(p=>p.map((x,j)=>j===i?{...x,expression:v}:x))} placeholder="SUM({salary}), COUNT(), …"/></div>)}
              <div style={{marginTop:12,padding:"10px 12px",background:`${B.purple}08`,borderRadius:10,fontSize:11,color:B.gray,lineHeight:1.6}}><strong style={{color:B.purple}}>Formulas:</strong> SUM(field) · AVG(field) · COUNT() · DIFF(a,b) · CONCAT(a,b) · IF(x=y,a,b) · UPPER(field) · ROUND(field,2)</div>
            </div>
          )}
          {panel==="saved"&&(
            <div style={{background:B.card,borderRadius:14,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#111827",marginBottom:12}}>Saved reports</div>
              {showSaveDialog&&<div style={{background:B.bg,borderRadius:10,padding:12,marginBottom:12}}><Inp val={reportName} onChange={setReportName} placeholder="Report name…" style={{marginBottom:8}}/><label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:B.gray,cursor:"pointer",marginBottom:10}}><input type="checkbox" checked={reportShared} onChange={e=>setReportShared(e.target.checked)} style={{accentColor:B.purple}}/>Share with all users</label><div style={{display:"flex",gap:6}}><button onClick={()=>{setShowSaveDialog(false);setReportName("");}} style={{flex:1,fontSize:11,padding:"6px",borderRadius:8,border:"none",background:B.bg,color:B.gray,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button><button onClick={saveReport} disabled={!reportName||savingReport} style={{flex:1,fontSize:11,padding:"6px",borderRadius:8,border:"none",background:B.purple,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>{savingReport?"Saving…":"Save"}</button></div></div>}
              {savedList.length===0&&!showSaveDialog&&<div style={{fontSize:12,color:B.gray,textAlign:"center",padding:"16px 0"}}>No saved reports yet</div>}
              {savedList.map(sv=><div key={sv.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"0.5px solid rgba(0,0,0,0.05)"}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#111827"}}>{sv.name}</div>{sv.is_shared&&<span style={{fontSize:10,color:B.purple,fontWeight:700}}>shared</span>}</div><button onClick={()=>{loadReport(sv);setPanel("build");runReport(sv.object_id);}} style={{fontSize:11,color:B.purple,background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>Load</button><button onClick={()=>deleteReport(sv.id)} style={{fontSize:11,color:B.rose,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Delete</button></div>)}
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {results&&(
            <Panel title="Visualisation" sub={activeChartFilter?`Filtered to: "${activeChartFilter}" — click again to clear`:"Click a bar, segment or point to filter the table below"}>
              <div style={{display:"flex",gap:6,marginBottom:16}}>
                {["bar","area","pie"].map(ct=><Pill key={ct} label={ct.charAt(0).toUpperCase()+ct.slice(1)} active={chartType===ct} onClick={()=>setChartType(ct)}/>)}
                {activeChartFilter&&<button onClick={()=>setActiveChartFilter(null)} style={{fontSize:11,padding:"4px 12px",borderRadius:20,border:"none",background:`${B.rose}15`,color:B.rose,cursor:"pointer",fontFamily:"inherit",fontWeight:700,marginLeft:"auto"}}>Clear filter ×</button>}
              </div>
              {chartType!=="pie"&&<div style={{display:"flex",gap:12,marginBottom:16}}><div style={{flex:1}}><SideLabel>X axis</SideLabel><Sel val={chartX} onChange={setChartX} opts={resultCols.map(k=>({value:k,label:k==="_group"?"Group":k==="_count"?"Count":k}))}/></div><div style={{flex:1}}><SideLabel>Y axis</SideLabel><Sel val={chartY} onChange={setChartY} opts={resultCols.map(k=>({value:k,label:k==="_group"?"Group":k==="_count"?"Count":k}))}/></div></div>}
              {chartType==="pie"&&<div style={{display:"flex",gap:12,marginBottom:16}}><div style={{flex:1}}><SideLabel>Label</SideLabel><Sel val={chartX} onChange={setChartX} opts={resultCols.map(k=>({value:k,label:k==="_group"?"Group":k}))}/></div><div style={{flex:1}}><SideLabel>Value</SideLabel><Sel val={chartY} onChange={setChartY} opts={resultCols.map(k=>({value:k,label:k==="_count"?"Count":k}))}/></div></div>}
              {chartX&&chartY&&chartData.length>0&&(<>
                {chartType==="bar"&&<ResponsiveContainer width="100%" height={240}><BarChart data={chartData} margin={{top:4,right:4,bottom:0,left:-20}} barCategoryGap="30%" onClick={handleChartClick} style={{cursor:"pointer"}}><XAxis dataKey={chartX} tick={{fontSize:10,fill:B.gray}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:B.gray}} axisLine={false} tickLine={false}/><Tooltip content={<DarkTip/>} cursor={{fill:"rgba(127,119,221,0.05)"}}/><Bar dataKey={chartY} radius={[4,4,0,0]} isAnimationActive={false}>{chartData.map((entry,i)=><Cell key={i} fill={activeChartFilter&&String(entry[chartX])===activeChartFilter?B.rose:B.purple}/>)}</Bar></BarChart></ResponsiveContainer>}
                {chartType==="area"&&<ResponsiveContainer width="100%" height={240}><AreaChart data={chartData} margin={{top:4,right:4,bottom:0,left:-20}} onClick={handleChartClick} style={{cursor:"pointer"}}><defs><linearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.purple} stopOpacity={0.18}/><stop offset="95%" stopColor={B.purple} stopOpacity={0}/></linearGradient></defs><XAxis dataKey={chartX} tick={{fontSize:10,fill:B.gray}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:B.gray}} axisLine={false} tickLine={false}/><Tooltip content={<DarkTip/>}/><Area type="monotone" dataKey={chartY} stroke={B.purple} strokeWidth={2} fill="url(#rptGrad)" dot={false}/></AreaChart></ResponsiveContainer>}
                {chartType==="pie"&&<ResponsiveContainer width="100%" height={240}><PieChart><Pie data={chartData} dataKey={chartY} nameKey={chartX} cx="50%" cy="50%" innerRadius="55%" outerRadius="78%" paddingAngle={3} onClick={handlePieClick} style={{cursor:"pointer"}}>{chartData.map((entry,i)=><Cell key={i} fill={activeChartFilter&&String(entry[chartX])===activeChartFilter?B.rose:PALETTE[i%PALETTE.length]} opacity={activeChartFilter&&String(entry[chartX])!==activeChartFilter?0.4:1}/>)}</Pie><Tooltip content={<DarkTip/>}/></PieChart></ResponsiveContainer>}
              </>)}
            </Panel>
          )}
          {results?(
            <Panel title={activeChartFilter?`"${activeChartFilter}" — ${(displayedResults||[]).length} rows`:`Results — ${results.length.toLocaleString()} rows`}
              action={<div style={{display:"flex",gap:8,alignItems:"center"}}>{groupBy&&activeChartFilter&&<button onClick={()=>goToFiltered(groupBy,activeChartFilter)} style={{fontSize:11,color:B.purple,background:`${B.purple}10`,border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit",padding:"4px 10px",borderRadius:20}}>Open in list ↗</button>}<button onClick={exportCSV} style={{fontSize:11,color:B.purple,background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>Export CSV ↓</button></div>}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr>{resultCols.slice(0,8).map(k=><th key={k} onClick={()=>{setSortBy(k==="_group"?groupBy:k);setSortDir(d=>d==="asc"?"desc":"asc");}} style={{textAlign:"left",padding:"8px 10px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:B.gray,borderBottom:"1px solid rgba(0,0,0,0.05)",cursor:"pointer",whiteSpace:"nowrap"}}>{k==="_group"?(groupBy||"Group"):k==="_count"?"Count":k}{sortBy===k&&<span style={{marginLeft:4}}>{sortDir==="asc"?"↑":"↓"}</span>}</th>)}{groupBy&&<th style={{textAlign:"right",padding:"8px 10px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:B.gray,borderBottom:"1px solid rgba(0,0,0,0.05)"}}></th>}</tr></thead>
                  <tbody>{(displayedResults||[]).slice(0,50).map((row,i)=><ResultRow key={i} row={row} cols={resultCols.slice(0,8)} groupBy={groupBy} active={activeChartFilter&&String(row[chartX]||row._group||"")===activeChartFilter} onFilter={(k,v)=>{setActiveChartFilter(v);goToFiltered(k,v);}}/>)}</tbody>
                </table>
                {(displayedResults||[]).length>50&&<div style={{fontSize:11,color:B.gray,textAlign:"center",marginTop:10}}>Showing 50 of {(displayedResults||[]).length} rows. Export CSV for the full set.</div>}
              </div>
            </Panel>
          ):(
            <div style={{background:B.card,borderRadius:14,padding:48,textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <div style={{width:48,height:48,borderRadius:14,background:`${B.purple}12`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={B.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>
              <div style={{fontSize:15,fontWeight:700,color:"#111827",marginBottom:6}}>Configure and run your report</div>
              <div style={{fontSize:13,color:B.gray,marginBottom:20,maxWidth:280,margin:"0 auto 20px"}}>Select a data source, choose columns, add filters, then hit Run report.</div>
              <button onClick={()=>runReport()} style={{fontSize:12,padding:"8px 20px",borderRadius:20,border:"none",background:B.purple,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Run report</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
