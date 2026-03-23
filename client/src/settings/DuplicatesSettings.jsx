import { useState, useEffect, useCallback } from "react";
const F = "'DM Sans',-apple-system,sans-serif";
const C = { accent:"#4361EE",accentLight:"#EEF2FF",text1:"#111827",text2:"#374151",text3:"#9ca3af",border:"#E5E7EB",surface:"white",bg:"#F9FAFB",green:"#0ca678",red:"#ef4444",amber:"#f59f00" };
const api = {
  get: p => fetch(p,{headers:{'x-user-id':localStorage.getItem('talentos_user_id')||'','x-tenant-slug':localStorage.getItem('talentos_tenant')||''}}).then(r=>r.json()),
  post:(p,b)=>fetch(p,{method:'POST',headers:{'Content-Type':'application/json','x-user-id':localStorage.getItem('talentos_user_id')||'','x-tenant-slug':localStorage.getItem('talentos_tenant')||''},body:JSON.stringify(b)}).then(r=>r.json()),
};
const Ic=({n,s=14,c="currentColor"})=>{
  const P={search:"M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",check:"M20 6L9 17l-5-5",x:"M18 6L6 18M6 6l12 12",shuffle:"M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",loader:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4",merge:"M8 6h13M8 12h8M8 18h13M3 6h.01M3 12h.01M3 18h.01"};
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={P[n]||""}/></svg>;
};
const scoreColor=s=>s>=80?C.red:s>=60?C.amber:"#6b7280";

const RecordCard=({record,label,isKeep})=>{
  const d=record?.data||{};
  const name=`${d.first_name||""} ${d.last_name||""}`.trim()||d.name||d.job_title||record?.id?.slice(0,8);
  return(
    <div style={{flex:1,padding:"10px 14px",borderRadius:10,border:`2px solid ${isKeep?C.accent:C.border}`,background:isKeep?C.accentLight:C.bg}}>
      <div style={{fontSize:10,fontWeight:700,color:isKeep?C.accent:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>{label}</div>
      <div style={{fontSize:14,fontWeight:700,color:C.text1}}>{name}</div>
      {d.current_title&&<div style={{fontSize:12,color:C.text3,marginTop:2}}>{d.current_title}</div>}
      {d.email&&<div style={{fontSize:11,color:C.text3,marginTop:2}}>{d.email}</div>}
      {d.location&&<div style={{fontSize:11,color:C.text3}}>{d.location}</div>}
      <div style={{fontSize:10,color:C.text3,marginTop:6}}>Added {record?.created_at?new Date(record.created_at).toLocaleDateString():"—"}</div>
    </div>
  );
};

const DuplicatePairCard=({pair,onMerge,onDismiss})=>{
  const [expanded,setExpanded]=useState(false);
  const [keepA,setKeepA]=useState(true);
  const [strategy,setStrategy]=useState("fill_missing");
  const [merging,setMerging]=useState(false);
  const [gone,setGone]=useState(false);
  if(gone) return null;
  const keep=keepA?pair.record_a:pair.record_b, discard=keepA?pair.record_b:pair.record_a;
  const da=pair.record_a.data||{}, db=pair.record_b.data||{};
  const nameA=`${da.first_name||""} ${da.last_name||""}`.trim()||"Record A";
  const nameB=`${db.first_name||""} ${db.last_name||""}`.trim()||"Record B";
  return(
    <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",cursor:"pointer",borderBottom:expanded?`1px solid ${C.border}`:"none"}} onClick={()=>setExpanded(e=>!e)}>
        <div style={{width:42,height:42,borderRadius:"50%",background:`${scoreColor(pair.score)}18`,border:`2.5px solid ${scoreColor(pair.score)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:13,fontWeight:800,color:scoreColor(pair.score)}}>{pair.score}</span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nameA} <span style={{color:C.text3,fontWeight:400}}>↔</span> {nameB}</div>
          <div style={{fontSize:11,color:C.text3,marginTop:2}}>{pair.reasons?.join(" · ")}</div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setExpanded(e=>!e)} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${C.border}`,background:expanded?"#f9fafb":"white",color:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>{expanded?"Collapse":"Review"}</button>
          <button onClick={()=>setGone(true)} style={{width:30,height:30,borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="x" s={13} c={C.text3}/></button>
        </div>
      </div>
      {expanded&&(
        <div style={{padding:"16px"}}>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <RecordCard record={pair.record_a} label={`Record A${keepA?" (keep)":""}`} isKeep={keepA}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <button onClick={()=>setKeepA(k=>!k)} title="Swap which to keep" style={{padding:6,borderRadius:7,border:`1px solid ${C.border}`,background:"white",cursor:"pointer"}}><Ic n="shuffle" s={14} c={C.text2}/></button>
            </div>
            <RecordCard record={pair.record_b} label={`Record B${!keepA?" (keep)":""}`} isKeep={!keepA}/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Merge strategy</div>
            <div style={{display:"flex",gap:8}}>
              {[{value:"keep_primary",label:"Keep primary only",desc:"Keep the record you chose"},{value:"fill_missing",label:"Fill missing fields",desc:"Use other record to fill blanks"}].map(opt=>(
                <button key={opt.value} onClick={()=>setStrategy(opt.value)} style={{flex:1,padding:"8px 10px",borderRadius:8,textAlign:"left",border:`2px solid ${strategy===opt.value?C.accent:C.border}`,background:strategy===opt.value?C.accentLight:"white",cursor:"pointer"}}>
                  <div style={{fontSize:12,fontWeight:700,color:strategy===opt.value?C.accent:C.text1}}>{opt.label}</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>{setExpanded(false);setGone(true);}} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Not a duplicate</button>
            <button onClick={async()=>{setMerging(true);try{await onMerge(keep.id,discard.id,strategy);setGone(true);}finally{setMerging(false);}}} disabled={merging}
              style={{padding:"8px 16px",borderRadius:8,border:"none",background:merging?"#9ca3af":C.red,color:"white",fontSize:12,fontWeight:700,cursor:merging?"not-allowed":"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:6}}>
              {merging?<><Ic n="loader" s={12} c="white"/> Merging…</>:<><Ic n="merge" s={12} c="white"/> Merge records</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function DuplicatesSettings({environment}){
  const [objects,setObjects]=useState([]);
  const [selObject,setSelObject]=useState(null);
  const [threshold,setThreshold]=useState(50);
  const [scanning,setScanning]=useState(false);
  const [pairs,setPairs]=useState([]);
  const [scanned,setScanned]=useState(false);
  const [toast,setToast]=useState(null);

  useEffect(()=>{
    if(!environment?.id) return;
    api.get(`/api/objects?environment_id=${environment.id}`).then(d=>{
      const objs=Array.isArray(d)?d:[];
      setObjects(objs);
      const ppl=objs.find(o=>o.slug==="people"||o.name?.toLowerCase()==="person");
      if(ppl) setSelObject(ppl);
    });
  },[environment?.id]);

  const runScan=useCallback(async()=>{
    if(!selObject||!environment?.id) return;
    setScanning(true); setPairs([]); setScanned(false);
    try{
      const result=await api.post('/api/duplicates/scan',{environment_id:environment.id,object_id:selObject.id,threshold});
      setPairs(Array.isArray(result.pairs)?result.pairs:[]); setScanned(true);
    }finally{setScanning(false);}
  },[selObject,environment?.id,threshold]);

  const handleMerge=async(keepId,discardId,strategy)=>{
    await api.post('/api/duplicates/merge',{keep_id:keepId,discard_id:discardId,merge_strategy:strategy});
    setToast("Records merged successfully");
    setTimeout(()=>setToast(null),3000);
  };

  return(
    <div style={{fontFamily:F,maxWidth:900}}>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:20,fontWeight:800,color:C.text1,margin:"0 0 6px"}}>Duplicate Detection</h2>
        <p style={{fontSize:13,color:C.text3,margin:0,lineHeight:1.6}}>Scan for duplicate records based on email, phone, name similarity, and LinkedIn URL. Review and merge in one click.</p>
      </div>
      <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"20px",marginBottom:20,display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180}}>
          <label style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:6}}>Object to scan</label>
          <select value={selObject?.id||""} onChange={e=>setSelObject(objects.find(o=>o.id===e.target.value))}
            style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",background:"white",color:C.text1}}>
            {objects.map(o=><option key={o.id} value={o.id}>{o.plural_name||o.name}</option>)}
          </select>
        </div>
        <div style={{minWidth:160}}>
          <label style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:6}}>Sensitivity</label>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <input type="range" min={30} max={90} step={5} value={threshold} onChange={e=>setThreshold(Number(e.target.value))} style={{flex:1,accentColor:C.accent}}/>
            <span style={{fontSize:12,fontWeight:700,color:C.accent,minWidth:36}}>{threshold}%</span>
          </div>
          <div style={{fontSize:10,color:C.text3,marginTop:3}}>Lower = more matches</div>
        </div>
        <button onClick={runScan} disabled={scanning||!selObject}
          style={{padding:"9px 20px",borderRadius:9,border:"none",background:scanning?"#9ca3af":C.accent,color:"white",fontSize:13,fontWeight:700,cursor:scanning?"not-allowed":"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          {scanning?<><Ic n="loader" s={14} c="white"/> Scanning…</>:<><Ic n="search" s={14} c="white"/> Run scan</>}
        </button>
      </div>
      {scanned&&(
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text1}}>{pairs.length>0?`${pairs.length} possible duplicate pair${pairs.length!==1?"s":""} found`:"No duplicates found"}</div>
            {pairs.length>0&&<span style={{fontSize:11,color:C.text3}}>in {selObject?.plural_name||"records"} above {threshold}% similarity</span>}
          </div>
          {pairs.length===0&&<div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"40px",textAlign:"center",color:C.text3}}><Ic n="check" s={32} c={C.green}/><div style={{fontSize:15,fontWeight:700,color:C.text1,marginTop:12}}>No duplicates detected</div></div>}
          {pairs.map((pair,i)=><DuplicatePairCard key={`${pair.record_a.id}-${pair.record_b.id}`} pair={pair} onMerge={handleMerge} onDismiss={()=>setPairs(p=>p.filter((_,idx)=>idx!==i))}/>)}
        </>
      )}
      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:C.green,color:"white",padding:"10px 18px",borderRadius:10,fontSize:13,fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,.2)",zIndex:9999,display:"flex",alignItems:"center",gap:8}}><Ic n="check" s={14} c="white"/> {toast}</div>}
    </div>
  );
}
