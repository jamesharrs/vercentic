// client/src/SharingFraud.jsx
// SharingPanel — job records: share links with source tracking
// FraudPanel   — people records: AI verification / fraud analysis
//
// Feature flags:
//   SharingPanel → 'record_share_job'
//   FraudPanel   → 'record_fraud_analysis'
//
// Register in Records.jsx PANEL_META:
//   share: { icon:"share",  label:"Share & Promote", defaultOpen:false, jobOnly:true,    flag:"record_share_job" },
//   fraud: { icon:"shield", label:"AI Verification", defaultOpen:false, personOnly:true, flag:"record_fraud_analysis" },
//
// Wire in PanelContent:
//   if (id==="share") return <SharingPanel record={record} object={object} environment={environment} canRecord={canRecord}/>;
//   if (id==="fraud") return <FraudPanel   record={record} fields={fields}  environment={environment} canRecord={canRecord}/>;

import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";

const C = {
  accent:"var(--t-accent,#4361EE)", accentLight:"var(--t-accentLight,#EEF2FF)",
  text1:"var(--t-text1,#111827)",   text2:"var(--t-text2,#374151)",
  text3:"var(--t-text3,#6B7280)",   border:"var(--t-border,#E5E7EB)",
  bg:"var(--t-bg,#F9FAFB)",         white:"#FFFFFF",
  green:"#0CAF77", greenLight:"#F0FDF4",
  amber:"#D97706", amberLight:"#FFFBEB",
  red:"#DC2626",   redLight:"#FEF2F2",
  purple:"#7C3AED",purpleLight:"#F5F3FF",
};
const F="'DM Sans',-apple-system,sans-serif";

const PATHS={
  linkedin:"M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  twitter:"M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.7 5.3 4.3 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z",
  whatsapp:"M17.5 14.4c-.3-.1-1.8-.9-2-.97-.3-.1-.5-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z M11 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  facebook:"M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  link:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  copy:"M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  check:"M20 6L9 17l-5-5",
  share:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  alert:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  info:"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 16v-4 M12 8h.01",
  refresh:"M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  trash:"M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  lock:"M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M17 11V7a5 5 0 0 0-10 0v4",
  users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
};
const Ic=({n,s=16,c="currentColor"})=>(
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {(PATHS[n]||"").split(" M").map((d,i)=><path key={i} d={i===0?d:"M"+d}/>)}
  </svg>
);

const Btn=({onClick,disabled,style,children})=>(
  <button onClick={onClick} disabled={disabled}
    style={{border:"none",cursor:disabled?"default":"pointer",fontFamily:F,
      fontSize:12,fontWeight:600,borderRadius:8,padding:"6px 12px",
      opacity:disabled?0.5:1,transition:"opacity .15s",...style}}>
    {children}
  </button>
);

// Shown when the feature flag is disabled for this user's role
const FeatureDisabled=({label})=>(
  <div style={{textAlign:"center",padding:"28px 16px"}}>
    <div style={{width:44,height:44,borderRadius:11,background:"#F3F4F6",
      display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
      <Ic n="lock" s={20} c="#9CA3AF"/>
    </div>
    <div style={{fontSize:13,fontWeight:700,color:"#6B7280",marginBottom:5}}>{label} is disabled</div>
    <div style={{fontSize:12,color:"#9CA3AF",lineHeight:1.5}}>
      This feature is not enabled for your role.<br/>Contact an administrator to request access.
    </div>
  </div>
);

// ─── Channel config ──────────────────────────────────────────────────────────
const CHANNELS=[
  {key:"linkedin", label:"LinkedIn",    color:"#0A66C2",icon:"linkedin", bg:"#E8F1FB"},
  {key:"twitter",  label:"X / Twitter", color:"#000000",icon:"twitter",  bg:"#F0F0F0"},
  {key:"whatsapp", label:"WhatsApp",    color:"#25D366",icon:"whatsapp", bg:"#E9F9EF"},
  {key:"facebook", label:"Facebook",    color:"#1877F2",icon:"facebook", bg:"#E7F0FD"},
  {key:"email",    label:"Email",       color:"#D97706",icon:"mail",     bg:"#FEF3C7"},
  {key:"direct",   label:"Direct link", color:"#6B7280",icon:"link",     bg:"#F3F4F6"},
];

function buildShareUrl(token,jobTitle,applyUrl){
  const tracked=`${applyUrl}?ref=${token.token}`;
  const enc=encodeURIComponent(tracked);
  const title=encodeURIComponent(`${jobTitle} – apply here!`);
  const summary=encodeURIComponent(`We're hiring: ${jobTitle}`);
  switch(token.channel){
    case"linkedin": return`https://www.linkedin.com/sharing/share-offsite/?url=${enc}&title=${title}&summary=${summary}`;
    case"twitter":  return`https://twitter.com/intent/tweet?url=${enc}&text=${title}`;
    case"whatsapp": return`https://api.whatsapp.com/send?text=${title}%20${enc}`;
    case"facebook": return`https://www.facebook.com/sharer/sharer.php?u=${enc}`;
    case"email":    return`mailto:?subject=${title}&body=${summary}%20${enc}`;
    default:        return tracked;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SHARING PANEL
// ════════════════════════════════════════════════════════════════════════════
export function SharingPanel({record,object,environment,canRecord=()=>true}){
  if(!canRecord("record_share_job")) return <FeatureDisabled label="Share & Promote"/>;

  const [tokens,   setTokens]   =useState([]);
  const [analytics,setAnalytics]=useState(null);
  const [loading,  setLoading]  =useState(true);
  const [copied,   setCopied]   =useState(null);
  const [view,     setView]     =useState("share");

  const jobTitle =record?.data?.job_title||record?.data?.title||"This role";
  const applyBase=environment?.career_site_url||window.location.origin+"/careers";
  const applyUrl =`${applyBase}?job=${record?.id?.slice(0,8)||"job"}`;

  const load=useCallback(async()=>{
    if(!record?.id)return;
    setLoading(true);
    try{
      const[t,a]=await Promise.all([
        api.get(`/sharing/tokens/${record.id}`),
        api.get(`/sharing/analytics/${record.id}`),
      ]);
      setTokens(Array.isArray(t)?t:[]);
      setAnalytics(a?.totals?a:null);
    }catch{}
    setLoading(false);
  },[record?.id]);

  const handleGenerate=async()=>{
    setLoading(true);
    await api.post("/sharing/tokens",{record_id:record.id,environment_id:environment?.id});
    await load();
  };
  const handleCopy=(text,key)=>{
    navigator.clipboard.writeText(text).catch(()=>{});
    setCopied(key);setTimeout(()=>setCopied(null),2000);
  };
  useEffect(()=>{load();},[load]);

  if(loading) return <div style={{padding:"24px 0",textAlign:"center",color:C.text3,fontSize:13}}>Loading sharing…</div>;

  if(!tokens.length) return(
    <div style={{textAlign:"center",padding:"28px 16px"}}>
      <div style={{width:48,height:48,borderRadius:12,background:C.accentLight,
        display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
        <Ic n="share" s={22} c={C.accent}/>
      </div>
      <div style={{fontSize:14,fontWeight:700,color:C.text1,marginBottom:6}}>Share this role</div>
      <div style={{fontSize:12,color:C.text3,marginBottom:16,lineHeight:1.5}}>
        Generate tracked share links for each channel.<br/>Every click and application is attributed to its source.
      </div>
      <Btn onClick={handleGenerate} style={{background:C.accent,color:C.white,padding:"8px 18px",fontSize:13}}>
        Generate share links
      </Btn>
    </div>
  );

  return(
    <div>
      {/* Tab bar */}
      <div style={{display:"flex",gap:4,marginBottom:14}}>
        {[["share","Share links"],["analytics","Analytics"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)}
            style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",
              fontFamily:F,fontSize:12,fontWeight:600,
              background:view===k?C.accent:C.bg,color:view===k?C.white:C.text3}}>
            {l}
          </button>
        ))}
        <button onClick={load} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer"}}>
          <Ic n="refresh" s={13} c={C.text3}/>
        </button>
      </div>

      {view==="share"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {CHANNELS.map(ch=>{
            const tk=tokens.find(t=>t.channel===ch.key);
            if(!tk)return null;
            const shareUrl=buildShareUrl(tk,jobTitle,applyUrl);
            const directUrl=`${applyUrl}?ref=${tk.token}`;
            return(
              <div key={ch.key} style={{display:"flex",alignItems:"center",gap:10,
                padding:"10px 12px",borderRadius:10,border:`1px solid ${C.border}`,background:C.white}}>
                <div style={{width:32,height:32,borderRadius:8,background:ch.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Ic n={ch.icon} s={15} c={ch.color}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{ch.label}</div>
                  <div style={{fontSize:11,color:C.text3}}>
                    {tk.clicks} click{tk.clicks!==1?"s":""} · {tk.applications} application{tk.applications!==1?"s":""}
                  </div>
                </div>
                <button onClick={()=>handleCopy(directUrl,ch.key+"_copy")} title="Copy tracked link"
                  style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,
                    padding:"4px 8px",cursor:"pointer",display:"flex",alignItems:"center",
                    gap:4,fontSize:11,color:C.text3,fontFamily:F}}>
                  <Ic n={copied===ch.key+"_copy"?"check":"copy"} s={12}
                    c={copied===ch.key+"_copy"?C.green:C.text3}/>
                  {copied===ch.key+"_copy"?"Copied!":"Copy"}
                </button>
                {ch.key!=="direct"&&(
                  <a href={shareUrl} target="_blank" rel="noreferrer"
                    style={{padding:"5px 10px",borderRadius:7,background:ch.bg,
                      color:ch.color,fontSize:11,fontWeight:700,textDecoration:"none",
                      border:`1px solid ${ch.color}22`,whiteSpace:"nowrap"}}>
                    Share
                  </a>
                )}
              </div>
            );
          })}
          <button onClick={handleGenerate}
            style={{marginTop:4,background:"none",border:`1px dashed ${C.border}`,
              borderRadius:8,padding:"7px",cursor:"pointer",fontSize:11,
              color:C.text3,fontFamily:F,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <Ic n="refresh" s={12} c={C.text3}/> Regenerate all tokens
          </button>
        </div>
      )}

      {view==="analytics"&&analytics&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {[
              {label:"Total clicks",  value:analytics.totals?.clicks??0,       color:C.accent},
              {label:"Applications",  value:analytics.totals?.applications??0,  color:C.green},
              {label:"Conversion %",  value:(analytics.totals?.conversion_rate??0)+"%",color:C.purple},
            ].map(s=>(
              <div key={s.label} style={{padding:"10px 12px",borderRadius:10,background:C.bg,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:18,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:10,color:C.text3,fontWeight:600,marginTop:1}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:8,
            textTransform:"uppercase",letterSpacing:"0.06em"}}>By channel</div>
          {tokens.map(tk=>{
            const ch=CHANNELS.find(c=>c.key===tk.channel);
            if(!ch)return null;
            const maxClicks=Math.max(...tokens.map(t=>t.clicks),1);
            return(
              <div key={tk.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:22,height:22,borderRadius:6,background:ch.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Ic n={ch.icon} s={12} c={ch.color}/>
                </div>
                <div style={{width:68,fontSize:11,color:C.text2,fontWeight:600}}>{ch.label}</div>
                <div style={{flex:1,height:6,borderRadius:3,background:C.bg,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:3,background:ch.color,
                    width:`${(tk.clicks/maxClicks)*100}%`,transition:"width .3s"}}/>
                </div>
                <div style={{width:32,textAlign:"right",fontSize:11,color:C.text3}}>{tk.clicks}</div>
                <div style={{width:24,textAlign:"right",fontSize:11,fontWeight:700,color:C.green}}>{tk.applications}</div>
              </div>
            );
          })}
          {analytics.totals?.clicks===0&&(
            <div style={{textAlign:"center",padding:"12px 0",fontSize:12,color:C.text3}}>
              No clicks tracked yet. Share the role to start collecting data.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FRAUD / VERIFICATION PANEL
// ════════════════════════════════════════════════════════════════════════════
const RISK_CFG={
  low:   {label:"Low risk",    color:C.green,  bg:C.greenLight,  border:"#BBF7D0"},
  medium:{label:"Medium risk", color:C.amber,  bg:C.amberLight,  border:"#FDE68A"},
  high:  {label:"High risk",   color:C.red,    bg:C.redLight,    border:"#FECACA"},
};
const SEV_DOT={
  low:   {bg:"#BBF7D0",color:C.green},
  medium:{bg:"#FDE68A",color:C.amber},
  high:  {bg:"#FECACA",color:C.red},
};
const REC_CFG={
  approve:    {label:"Proceed",     color:C.green, icon:"check"},
  review:     {label:"Review",      color:C.amber, icon:"alert"},
  investigate:{label:"Investigate", color:C.red,   icon:"alert"},
};

export function FraudPanel({record,fields,environment,canRecord=()=>true}){
  if(!canRecord("record_fraud_analysis")) return <FeatureDisabled label="AI Verification"/>;

  const [analysis, setAnalysis] =useState(null);
  const [loading,  setLoading]  =useState(true);
  const [analysing,setAnalysing]=useState(false);
  const [expanded, setExpanded] =useState(null);
  const [error,    setError]    =useState(null);

  const load=useCallback(async()=>{
    if(!record?.id){setLoading(false);return;}
    setLoading(true);
    try{
      const data=await api.get(`/sharing/fraud/${record.id}`);
      if(!data.error) setAnalysis(data);
    }catch{}
    setLoading(false);
  },[record?.id]);

  useEffect(()=>{load();},[load]);

  const handleAnalyse=async()=>{
    setAnalysing(true);setError(null);
    try{
      const fieldsCtx={};
      (fields||[]).forEach(f=>{
        const val=record?.data?.[f.api_key];
        if(val!==undefined&&val!==null&&val!=="") fieldsCtx[f.name]=val;
      });
      const result=await api.post("/sharing/fraud/analyse",{
        record_id:record.id, environment_id:environment?.id,
        record_data:record.data||{}, fields_context:fieldsCtx,
      });
      if(result.error) setError(result.error);
      else setAnalysis(result);
    }catch(e){setError(e.message||"Analysis failed");}
    setAnalysing(false);
  };

  const handleClear=async()=>{
    await api.del(`/sharing/fraud/${record.id}`);
    setAnalysis(null);
  };

  const name=[record?.data?.first_name,record?.data?.last_name].filter(Boolean).join(" ")||"this person";

  if(loading) return <div style={{padding:"20px 0",textAlign:"center",color:C.text3,fontSize:13}}>Loading…</div>;

  if(!analysis) return(
    <div style={{textAlign:"center",padding:"24px 16px"}}>
      <div style={{width:48,height:48,borderRadius:12,background:C.purpleLight,
        display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
        <Ic n="shield" s={22} c={C.purple}/>
      </div>
      <div style={{fontSize:14,fontWeight:700,color:C.text1,marginBottom:6}}>AI Verification</div>
      <div style={{fontSize:12,color:C.text3,marginBottom:16,lineHeight:1.5}}>
        Run an AI analysis on {name}'s record to identify inconsistencies,
        potential misrepresentations, and things worth verifying.
      </div>
      {error&&(
        <div style={{fontSize:12,color:C.red,marginBottom:12,padding:"8px 12px",
          background:C.redLight,borderRadius:8,textAlign:"left"}}>{error}</div>
      )}
      <Btn onClick={handleAnalyse} disabled={analysing}
        style={{background:C.purple,color:C.white,padding:"8px 18px",fontSize:13}}>
        {analysing?"Analysing…":"Run verification check"}
      </Btn>
      <div style={{fontSize:11,color:C.text3,marginTop:10}}>AI powered · Results are advisory only</div>
    </div>
  );

  const a=analysis.analysis||{};
  const rCfg=RISK_CFG[a.risk_level]||RISK_CFG.low;
  const recCfg=REC_CFG[a.overall_recommendation]||REC_CFG.review;
  const flags=a.flags||[];
  const similars=a.similar_candidates||[];
  const positives=a.positive_indicators||[];

  return(
    <div>
      {/* Risk header */}
      <div style={{borderRadius:12,border:`1.5px solid ${rCfg.border}`,
        background:rCfg.bg,padding:"14px 16px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{position:"relative",flexShrink:0,width:52,height:52}}>
            <svg width="52" height="52" style={{transform:"rotate(-90deg)"}}>
              <circle cx="26" cy="26" r="20" fill="none" stroke={C.border} strokeWidth="4"/>
              <circle cx="26" cy="26" r="20" fill="none" stroke={rCfg.color} strokeWidth="4"
                strokeDasharray={`${(a.risk_score||0)*1.257} 125.7`} strokeLinecap="round"/>
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:12,fontWeight:800,color:rCfg.color}}>
              {a.risk_score??"?"}
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:13,fontWeight:800,color:rCfg.color}}>{rCfg.label}</span>
              <span style={{padding:"2px 8px",borderRadius:20,background:recCfg.color+"20",
                color:recCfg.color,fontSize:10,fontWeight:700}}>{recCfg.label}</span>
            </div>
            <div style={{fontSize:12,color:C.text2,lineHeight:1.5}}>{a.summary}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10,
          paddingTop:10,borderTop:`1px solid ${rCfg.border}`}}>
          <span style={{fontSize:11,color:C.text3}}>
            Analysed {analysis.analysed_at?new Date(analysis.analysed_at).toLocaleDateString():"recently"}
          </span>
          <button onClick={handleAnalyse} disabled={analysing}
            style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",
              fontSize:11,color:C.text3,fontFamily:F,display:"flex",alignItems:"center",gap:4}}>
            <Ic n="refresh" s={11} c={C.text3}/>{analysing?"Analysing…":"Re-analyse"}
          </button>
          <button onClick={handleClear}
            style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center"}}>
            <Ic n="trash" s={12} c={C.text3}/>
          </button>
        </div>
      </div>

      {/* Flags */}
      {flags.length>0&&(
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:8,
            textTransform:"uppercase",letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:6}}>
            <Ic n="alert" s={12} c={C.text3}/>{flags.length} flag{flags.length!==1?"s":""} to review
          </div>
          {flags.map((flag,i)=>{
            const sev=SEV_DOT[flag.severity]||SEV_DOT.low;
            const isOpen=expanded===i;
            return(
              <div key={i} style={{borderRadius:8,border:`1px solid ${C.border}`,
                background:C.white,marginBottom:6,overflow:"hidden"}}>
                <button onClick={()=>setExpanded(isOpen?null:i)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,
                    padding:"10px 12px",background:"none",border:"none",cursor:"pointer",
                    textAlign:"left",fontFamily:F}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:sev.bg,
                    border:`2px solid ${sev.color}`,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text1}}>{flag.flag}</div>
                    <div style={{fontSize:11,color:C.text3}}>{flag.category}</div>
                  </div>
                  <div style={{fontSize:10,padding:"2px 6px",borderRadius:4,
                    background:sev.bg,color:sev.color,fontWeight:700,textTransform:"uppercase"}}>
                    {flag.severity}
                  </div>
                  <div style={{fontSize:12,color:C.text3,transform:isOpen?"rotate(90deg)":"none",transition:"transform .15s"}}>›</div>
                </button>
                {isOpen&&(
                  <div style={{padding:"0 12px 12px",borderTop:`1px solid ${C.border}`}}>
                    <div style={{fontSize:12,color:C.text2,lineHeight:1.6,paddingTop:10,marginBottom:8}}>{flag.detail}</div>
                    {flag.recommendation&&(
                      <div style={{padding:"8px 10px",borderRadius:7,background:"#F0F9FF",
                        border:"1px solid #BAE6FD",fontSize:11,color:"#0369A1",lineHeight:1.5}}>
                        <strong>Recommended action:</strong> {flag.recommendation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Similar candidates */}
      {similars.length>0&&(
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:8,
            textTransform:"uppercase",letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:6}}>
            <Ic n="users" s={12} c={C.text3}/>{similars.length} similar candidate{similars.length!==1?"s":""}
          </div>
          {similars.map((s,i)=>{
            const sev=SEV_DOT[s.severity]||SEV_DOT.medium;
            return(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,
                padding:"10px 12px",borderRadius:8,border:`1px solid ${sev.bg}`,
                background:sev.bg+"80",marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:sev.bg,
                  border:`2px solid ${sev.color}`,flexShrink:0,marginTop:3}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text1,marginBottom:2}}>{s.name}</div>
                  <div style={{fontSize:11,color:C.text2,lineHeight:1.5}}>{s.similarity}</div>
                </div>
                <div style={{fontSize:10,padding:"2px 6px",borderRadius:4,
                  background:sev.bg,color:sev.color,fontWeight:700,textTransform:"uppercase",flexShrink:0}}>
                  {s.severity}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Positive indicators */}
      {positives.length>0&&(
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:8,
            textTransform:"uppercase",letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:6}}>
            <Ic n="check" s={12} c={C.text3}/>{positives.length} positive indicator{positives.length!==1?"s":""}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {positives.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:12,color:C.text2,lineHeight:1.5}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:C.greenLight,
                  border:`1.5px solid ${C.green}`,display:"flex",alignItems:"center",
                  justifyContent:"center",flexShrink:0,marginTop:1}}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                    stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                {p}
              </div>
            ))}
          </div>
        </div>
      )}

      {flags.length===0&&positives.length===0&&(
        <div style={{textAlign:"center",padding:"12px 0",fontSize:12,color:C.text3}}>No specific flags or indicators found.</div>
      )}

      {/* Disclaimer */}
      <div style={{marginTop:14,padding:"8px 12px",borderRadius:8,background:C.bg,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:10,color:C.text3,lineHeight:1.5}}>
          <Ic n="info" s={11} c={C.text3}/> This analysis is AI-generated and advisory only.
          It highlights patterns worth investigating — not conclusions.
          Always apply human judgement before acting on any flag.
        </div>
      </div>
    </div>
  );
}
