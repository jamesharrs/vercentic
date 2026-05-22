// client/src/ABTestPanel.jsx  — A/B Test comparison UI with statistical significance
import { useState, useEffect, useCallback } from "react";
import api from "./apiClient";
const F = "'Space Grotesk','DM Sans',system-ui,sans-serif";
const C = {
  surface:"var(--t-surface,#fff)",s2:"var(--t-surface2,#F8F9FF)",border:"var(--t-border,#E8ECF8)",
  accent:"var(--t-accent,#4361EE)",accentL:"var(--t-accent-light,#EEF0FF)",
  text1:"var(--t-text1,#111827)",text2:"var(--t-text2,#374151)",text3:"var(--t-text3,#9CA3AF)",
  green:"#0ca678",greenL:"#F0FDF4",amber:"#f59f00",amberL:"#FFFBEB",
  red:"#e03131",purple:"#7048e8",purpleL:"#F3F0FF",
};
const VCOLS = [C.accent, C.purple, "#0c8599", C.green, C.amber];
const VLBLS = ["A","B","C","D","E"];
const PATHS = {
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",info:"M12 2a10 10 0 100 20A10 10 0 0012 2zm0 9v4m0-8h.01",
  check:"M20 6L9 17l-5-5",x:"M18 6L6 18M6 6l12 12",chart:"M18 20V10M12 20V4M6 20v-6",
  clock:"M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2",
  trophy:"M6 9H4.5a2.5 2.5 0 000 5H6M18 9h1.5a2.5 2.5 0 010 5H18M8 9h8v5a4 4 0 01-8 0V9zM8 9V5h8v4M12 14v3m-3 3h6",
  flag:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  arrowUp:"M12 19V5M5 12l7-7 7 7",arrowDn:"M12 5v14M19 12l-7 7-7-7",
};
const Ic = ({n,s=16,c="#374151",style={}})=>(
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={PATHS[n]}/></svg>
);

function erfc(x){const t=1/(1+0.3275911*x);return t*(0.254829592+t*(-0.284496736+t*(1.421413741+t*(-1.453152027+t*1.061405429))))*Math.exp(-x*x);}
function zTest(n1,c1,n2,c2){
  if(n1<20||n2<20)return{significant:false,label:"Not enough data"};
  const p1=c1/n1,p2=c2/n2,pool=(c1+c2)/(n1+n2);
  const se=Math.sqrt(pool*(1-pool)*(1/n1+1/n2));
  if(se===0)return{significant:false,label:"No variance"};
  const z=Math.abs((p1-p2)/se),p=0.5*erfc(z/Math.SQRT2);
  return{z:z.toFixed(2),p:p.toFixed(4),significant:p<0.05,label:p<0.01?"99%+ confident":p<0.05?"95%+ confident":"Not yet significant"};
}
function uplift(base,cand){if(!base)return null;return((cand-base)/base*100).toFixed(1);}

export default function ABTestPanel({ portalId, links=[], days=30, onClose }) {
  const [stats,setStats]   = useState(null);
  const [loading,setLoading] = useState(true);
  const [winner,setWinner] = useState(null);
  const [period,setPeriod] = useState(days);

  const load = useCallback(async()=>{
    if(!portalId) return;
    setLoading(true);
    try { const d = await api.get(`/portal-analytics/${portalId}/stats_v2?days=${period}&variant_breakdown=1`); setStats(d); }
    catch { setStats(null); }
    finally { setLoading(false); }
  },[portalId,period]);
  useEffect(()=>{ load(); },[load]);

  // Build variant rows from analytics events + campaign link click stats
  const variantRows = (() => {
    const byKey = {};
    (stats?.by_variant||[]).forEach(v=>{
      const k=(v.variant||"control").toLowerCase();
      byKey[k]={...byKey[k],key:k,views:(byKey[k]?.views||0)+(v.views||0),conversions:(byKey[k]?.conversions||0)+(v.conversions||0)};
    });
    links.forEach((lnk,i)=>{
      const k=(lnk.utm_content||VLBLS[i]||`v${i}`).toLowerCase();
      byKey[k]={...byKey[k],key:byKey[k]?.key||k,clicks:(byKey[k]?.clicks||0)+(lnk.stats?.clicks_30d||0),joins:(byKey[k]?.joins||0)+(lnk.stats?.joins_30d||0),link_name:lnk.name,link_id:lnk.id};
    });
    return Object.values(byKey).sort((a,b)=>a.key.localeCompare(b.key));
  })();

  const prim = r => r.joins!=null?{val:r.joins,total:r.clicks||r.views||0,label:"Joins"}
    :r.conversions!=null?{val:r.conversions,total:r.views||0,label:"Conv"}
    :{val:r.clicks||0,total:r.views||0,label:"Clicks"};
  const rates = variantRows.map(r=>{const m=prim(r);return m.total>0?(m.val/m.total)*100:0;});
  const maxRate = Math.max(...rates,0.1);
  const bestIdx = rates.indexOf(Math.max(...rates));

  return (
    <div style={{fontFamily:F}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,borderRadius:8,background:C.purpleL,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="zap" s={14} c={C.purple}/></div>
          <div><div style={{fontSize:13,fontWeight:700,color:C.text1}}>A/B Test Results</div><div style={{fontSize:11,color:C.text3}}>{variantRows.length} variant{variantRows.length!==1?"s":""} · {period}d window</div></div>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {[7,14,30,90].map(d=><button key={d} onClick={()=>setPeriod(d)} style={{padding:"3px 8px",borderRadius:20,border:`1px solid ${d===period?C.purple:C.border}`,background:d===period?C.purpleL:"none",color:d===period?C.purple:C.text3,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:F}}>{d}d</button>)}
          {onClose&&<button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",marginLeft:4}}><Ic n="x" s={16} c={C.text3}/></button>}
        </div>
      </div>

      {winner&&(
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:10,background:C.greenL,border:`1.5px solid ${C.green}40`,marginBottom:12}}>
          <Ic n="trophy" s={14} c={C.green}/>
          <span style={{fontSize:12,fontWeight:700,color:C.green}}>Winner declared: Variant {winner.toUpperCase()}</span>
          <button onClick={()=>setWinner(null)} style={{background:"none",border:"none",cursor:"pointer",marginLeft:"auto",fontSize:11,color:C.text3,fontFamily:F}}>Clear</button>
        </div>
      )}

      {loading?<div style={{textAlign:"center",padding:32,color:C.text3}}>Loading…</div>
      :variantRows.length===0?(<div style={{padding:"28px 20px",textAlign:"center",background:C.s2,borderRadius:12,border:`1px solid ${C.border}`}}>
          <Ic n="chart" s={28} c={C.text3} style={{marginBottom:8}}/>
          <div style={{fontSize:13,fontWeight:700,color:C.text2,marginBottom:4}}>No variant data yet</div>
          <div style={{fontSize:11,color:C.text3,maxWidth:300,margin:"0 auto"}}>Set <code>utm_content</code> to <code>variant-a</code> / <code>variant-b</code> on your campaign links to start tracking variants.</div>
        </div>)
      :(<>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
            {variantRows.map((row,i)=>{
              const m=prim(row), rate=rates[i], color=VCOLS[i%VCOLS.length], label=VLBLS[i]||row.key;
              const sig=i>0?zTest(prim(variantRows[0]).total,prim(variantRows[0]).val,m.total,m.val):null;
              const up=i>0?uplift(rates[0],rate):null;
              const isBest=i===bestIdx&&variantRows.length>1;
              const isWinner=winner===row.key;
              return (
                <div key={row.key} style={{padding:"12px 14px",background:isWinner?C.greenL:isBest&&!isWinner?`${color}08`:C.surface,borderRadius:12,border:`1.5px solid ${isWinner?C.green:isBest?`${color}40`:C.border}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{width:26,height:26,borderRadius:7,background:`${color}18`,border:`1.5px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color,flexShrink:0}}>{label}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.text1}}>
                        {row.link_name||`Variant ${label}`}
                        {i===0&&<span style={{marginLeft:5,fontSize:9,color:C.text3,fontWeight:400}}>(control)</span>}
                        {isBest&&!isWinner&&i>0&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,color:C.green,background:C.greenL,padding:"1px 5px",borderRadius:99}}>⬆ Leading</span>}
                      </div>
                      <div style={{fontSize:10,color:C.text3}}>{m.total} {m.label.toLowerCase()} · {m.val} converted</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:17,fontWeight:800,color,lineHeight:1}}>{rate.toFixed(1)}%</div>
                      {up!==null&&<div style={{fontSize:10,fontWeight:700,color:parseFloat(up)>0?C.green:parseFloat(up)<0?C.red:C.text3,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:2}}><Ic n={parseFloat(up)>0?"arrowUp":parseFloat(up)<0?"arrowDn":"info"} s={9} c={parseFloat(up)>0?C.green:parseFloat(up)<0?C.red:C.text3}/>{up>0?"+":""}{up}%</div>}
                    </div>
                  </div>
                  <div style={{height:6,background:C.s2,borderRadius:3,overflow:"hidden",marginBottom:8}}>
                    <div style={{height:"100%",width:`${maxRate>0?(rate/maxRate)*100:0}%`,background:color,borderRadius:3,transition:"width .5s"}}/>
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    {sig
                      ? <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700,background:sig.significant?C.greenL:C.amberL,color:sig.significant?C.green:C.amber}}><Ic n={sig.significant?"check":"clock"} s={9} c={sig.significant?C.green:C.amber}/>{sig.label}</span>
                      : <span/>}
                    {!isWinner&&isBest&&sig?.significant&&(
                      <button onClick={()=>setWinner(row.key)} style={{padding:"4px 10px",borderRadius:8,background:C.green,border:"none",color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:4}}>
                        <Ic n="flag" s={10} c="#fff"/>Declare winner
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{padding:"10px 12px",background:C.accentL,borderRadius:10,fontSize:11,color:C.accent,display:"flex",gap:8}}>
            <Ic n="info" s={13} c={C.accent} style={{flexShrink:0,marginTop:1}}/>
            <span>Conversion rate = joins ÷ clicks. Statistical significance uses a two-proportion z-test. Aim for 100+ clicks per variant before deciding.</span>
          </div>
        </>)
      }
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export function ABTestModal({ portalId, links, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2100,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
         onMouseDown={e=>{if(e.target===e.currentTarget)onClose?.();}}>
      <div onMouseDown={e=>e.stopPropagation()} style={{background:"var(--t-surface,#fff)",borderRadius:16,width:"min(680px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.25)"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--t-border,#E8ECF8)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:14,fontWeight:700,color:"var(--t-text1,#111827)"}}>A/B Test Results</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:18}}>
          <ABTestPanel portalId={portalId} links={links||[]}/>
        </div>
      </div>
    </div>
  );
}
