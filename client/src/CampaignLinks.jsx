// client/src/CampaignLinks.jsx  — Smart link builder with UTM tracking + A/B support
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import apiClient from "./apiClient.js";

// Lazy-load ABTestPanel to avoid circular dependency issues and hook count problems
const ABTestPanel = lazy(() => import("./ABTestPanel.jsx"));

const api = {
  get:   u => apiClient.get(u),
  post:  (u,b) => apiClient.post(u,b),
  patch: (u,b) => apiClient.patch(u,b),
  del:   u => apiClient.delete(u),
};
const F = "'Space Grotesk','DM Sans',system-ui,sans-serif";
const C = {
  bg:"var(--t-bg,#F0F2FF)",surface:"var(--t-surface,#fff)",s2:"var(--t-surface2,#F8F9FF)",
  border:"var(--t-border,#E8ECF8)",accent:"var(--t-accent,#4361EE)",
  accentL:"var(--t-accent-light,#EEF0FF)",text1:"var(--t-text1,#111827)",
  text2:"var(--t-text2,#374151)",text3:"var(--t-text3,#9CA3AF)",
  green:"#0ca678",greenL:"#F0FDF4",amber:"#f59f00",amberL:"#FFFBEB",
  red:"#e03131",redL:"#FFF0F0",purple:"#7048e8",purpleL:"#F3F0FF",
};
const PATHS = {
  link:"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  copy:"M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  check:"M20 6L9 17l-5-5",plus:"M12 5v14M5 12h14",trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  x:"M18 6L6 18M6 6l12 12",chart:"M18 20V10M12 20V4M6 20v-6",
  external:"M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  share:"M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  edit:"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",info:"M12 2a10 10 0 100 20A10 10 0 0012 2zm0 9v4m0-8h.01",
  chevD:"M6 9l6 6 6-6",
};
const Ic = ({ n, s=16, c="#374151", style={} }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={PATHS[n]}/>
  </svg>
);

function Btn({ onClick, children, v="primary", s="sm", icon, disabled, style={} }) {
  const pad = { sm:"7px 14px", md:"9px 18px", lg:"11px 22px" };
  const base = { display:"flex",alignItems:"center",gap:6,borderRadius:8,border:"none",
    cursor:disabled?"not-allowed":"pointer",fontFamily:F,fontSize:s==="lg"?14:13,
    fontWeight:600,padding:pad[s],opacity:disabled?0.55:1,transition:"opacity .15s",...style };
  const variants = {
    primary:   { background:C.accent,  color:"#fff" },
    secondary: { background:C.s2,      color:C.text2, border:`1px solid ${C.border}` },
    ghost:     { background:"transparent", color:C.accent },
    danger:    { background:C.redL,    color:C.red,   border:`1px solid ${C.red}22` },
  };
  return (
    <button onClick={!disabled?onClick:undefined} style={{...base,...variants[v]}}>
      {icon && <Ic n={icon} s={12} c={v==="primary"?"#fff":v==="danger"?C.red:C.accent}/>}
      {children}
    </button>
  );
}

function CopyBtn({ text, label="Copy" }) {
  const [done,setDone] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(()=>{ setDone(true); setTimeout(()=>setDone(false),2000); }); };
  return (
    <button onClick={copy} style={{
      display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:6,
      border:`1px solid ${done?C.green:C.border}`,background:done?C.greenL:C.s2,
      color:done?C.green:C.text2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F,transition:"all .15s"
    }}>
      <Ic n={done?"check":"copy"} s={11} c={done?C.green:C.text3}/>
      {done?"Copied!":label}
    </button>
  );
}

const StatPill = ({ label, val, color=C.accent }) => (
  <div style={{textAlign:"center",minWidth:52}}>
    <div style={{fontSize:16,fontWeight:800,color,lineHeight:1}}>{val}</div>
    <div style={{fontSize:9,color:C.text3,marginTop:2}}>{label}</div>
  </div>
);

const UTM_SOURCES = ["linkedin","twitter","facebook","instagram","email","newsletter",
  "whatsapp","slack","referral","direct","events","job-board","website","other"];
const UTM_MEDIUMS = ["social","email","organic","paid","referral","cpc","banner","event","dm","other"];

// ── Link Modal ────────────────────────────────────────────────────────────────
function LinkModal({ environment, portals, pools, existing, defaults, onSave, onClose }) {
  const blank = { name:"",portal_id:"",portal_slug:"",page_slug:"/",pool_id:"",pool_stage:"",
    utm_source:"linkedin",utm_medium:"social",utm_campaign:"",utm_content:"",utm_term:"",notes:"",
    ...(defaults||{}) };  // pre-populate from record context
  const [form,setForm] = useState(existing?{...blank,...existing}:blank);
  const [saving,setSaving] = useState(false);
  const [tab,setTab] = useState("link");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    if(!form.portal_id) return;
    const p = portals.find(p=>p.id===form.portal_id);
    if(p) set("portal_slug", p.slug||"");
  },[form.portal_id]);

  const preview = (() => {
    const base = window.location.origin;
    const slug = (form.portal_slug||"").replace(/^\/+/,"");
    const page = (form.page_slug||"/").replace(/^\/+/,"");
    let url = `${base}/${slug}`;
    if(page&&page!=="/") url+=`/${page}`;
    const p = new URLSearchParams();
    if(form.pool_id)      p.set("_pool",        form.pool_id);
    if(form.utm_source)   p.set("utm_source",   form.utm_source);
    if(form.utm_medium)   p.set("utm_medium",   form.utm_medium);
    if(form.utm_campaign) p.set("utm_campaign", form.utm_campaign);
    if(form.utm_content)  p.set("utm_content",  form.utm_content);
    const qs=p.toString(); return qs?`${url}?${qs}`:url;
  })();

  const handleSave = async () => {
    if(!form.name) return;
    setSaving(true);
    try {
      const payload = { ...form, environment_id: environment.id };
      const result = existing
        ? await api.patch(`/campaign-links/${existing.id}`, payload)
        : await api.post(`/campaign-links`, payload);
      onSave(result);
    } finally { setSaving(false); }
  };

  const inp = { width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,
    fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface,boxSizing:"border-box" };
  const lbl = { fontSize:12,fontWeight:600,color:C.text2,marginBottom:4,display:"block" };
  const row = { marginBottom:16 };

  const TABS = [{id:"link",label:"Link"},{id:"utm",label:"UTM / Tracking"},{id:"preview",label:"Preview"}];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}}
         onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onMouseDown={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:16,width:540,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{padding:"16px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text1}}>{existing?"Edit link":"Create campaign link"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Ic n="x" s={18} c={C.text3}/></button>
        </div>
        <div style={{display:"flex",padding:"10px 20px 0",borderBottom:`1px solid ${C.border}`}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"7px 12px",fontFamily:F,fontSize:12,fontWeight:600,border:"none",background:"none",cursor:"pointer",
              color:tab===t.id?C.accent:C.text3,borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:-1
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{padding:"18px 20px",overflowY:"auto",flex:1}}>
          {tab==="link"&&(<>
            <div style={row}><label style={lbl}>Link name *</label><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. LinkedIn — Engineering Community Q2" style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,...row}}>
              <div><label style={lbl}>Portal</label>
                <select value={form.portal_id} onChange={e=>set("portal_id",e.target.value)} style={inp}>
                  <option value="">— None —</option>
                  {portals.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
              <div><label style={lbl}>Portal slug</label><input value={form.portal_slug} onChange={e=>set("portal_slug",e.target.value)} placeholder="/careers" style={inp}/></div>
            </div>
            <div style={row}><label style={lbl}>Page</label><input value={form.page_slug} onChange={e=>set("page_slug",e.target.value)} placeholder="/ for homepage" style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,...row}}>
              <div><label style={lbl}>Auto-join Talent Pool</label>
                <select value={form.pool_id} onChange={e=>set("pool_id",e.target.value)} style={inp}>
                  <option value="">— None —</option>
                  {pools.map(p=><option key={p.id} value={p.id}>{p.data?.pool_name||p.data?.name||p.id.slice(0,8)}</option>)}
                </select></div>
              <div><label style={lbl}>Pool stage on join</label><input value={form.pool_stage} onChange={e=>set("pool_stage",e.target.value)} placeholder="New Member" style={inp}/></div>
            </div>
            <div style={row}><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} style={{...inp,resize:"vertical"}}/></div>
          </>)}
          {tab==="utm"&&(<>
            <div style={{padding:"10px 14px",background:C.accentL,borderRadius:10,marginBottom:16,fontSize:12,color:C.accent}}>
              Set <strong>utm_content</strong> to <code>variant-a</code> or <code>variant-b</code> to enable A/B testing.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,...row}}>
              <div><label style={lbl}>utm_source</label>
                <select value={form.utm_source} onChange={e=>set("utm_source",e.target.value)} style={inp}>
                  <option value="">—</option>{UTM_SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
                </select></div>
              <div><label style={lbl}>utm_medium</label>
                <select value={form.utm_medium} onChange={e=>set("utm_medium",e.target.value)} style={inp}>
                  <option value="">—</option>{UTM_MEDIUMS.map(m=><option key={m} value={m}>{m}</option>)}
                </select></div>
            </div>
            <div style={row}><label style={lbl}>utm_campaign</label><input value={form.utm_campaign} onChange={e=>set("utm_campaign",e.target.value)} placeholder="e.g. q2-engineering-push" style={inp}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,...row}}>
              <div><label style={lbl}>utm_content <span style={{fontWeight:400,color:C.text3}}>(A/B variant)</span></label><input value={form.utm_content} onChange={e=>set("utm_content",e.target.value)} placeholder="variant-a or variant-b" style={inp}/></div>
              <div><label style={lbl}>utm_term</label><input value={form.utm_term} onChange={e=>set("utm_term",e.target.value)} placeholder="optional keyword" style={inp}/></div>
            </div>
          </>)}
          {tab==="preview"&&(
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.text2,marginBottom:8}}>Destination URL preview</div>
              <div style={{padding:"12px 14px",background:C.s2,borderRadius:10,border:`1px solid ${C.border}`,fontFamily:"monospace",fontSize:11,color:C.text2,wordBreak:"break-all",lineHeight:1.6}}>{preview}</div>
              <div style={{display:"flex",gap:8,marginTop:10}}><CopyBtn text={preview} label="Copy URL"/></div>
              <div style={{marginTop:16,padding:"10px 14px",background:C.amberL,borderRadius:10,fontSize:12,color:"#92400e"}}>Share the <strong>tracked link</strong> (via /api/campaign-links/:code/click), not this URL directly.</div>
            </div>
          )}
        </div>
        <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"flex-end",gap:8}}>
          <Btn v="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving||!form.name}>{saving?"Saving…":existing?"Save changes":"Create link"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Link Card ─────────────────────────────────────────────────────────────────
function LinkCard({ link, onEdit, onDelete, onViewStats }) {
  const [copied,setCopied] = useState(false);
  const copyLink = () => { navigator.clipboard.writeText(link.link_url||link.destination_url); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{background:C.surface,borderRadius:14,border:`1.5px solid ${C.border}`,overflow:"hidden",transition:"box-shadow .15s"}}
         onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.07)"}
         onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
      <div style={{height:3,background:C.accent}}/>
      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text1}}>{link.name}</div>
            <div style={{fontSize:11,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {(link.destination_url||"").replace("https://","").slice(0,60)}
            </div>
          </div>
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            {link.utm_source && <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:C.accentL,color:C.accent}}>{link.utm_source}</span>}
            {link.utm_content && <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:C.purpleL,color:C.purple}}>{link.utm_content}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:0,padding:"10px 0",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,marginBottom:12}}>
          <StatPill label="Total clicks" val={link.stats?.total_clicks??0} color={C.accent}/>
          <div style={{width:1,background:C.border,margin:"0 10px"}}/>
          <StatPill label="30d clicks"   val={link.stats?.clicks_30d??0}   color={C.text2}/>
          <div style={{width:1,background:C.border,margin:"0 10px"}}/>
          <StatPill label="30d joins"    val={link.stats?.joins_30d??0}    color={C.green}/>
          <div style={{width:1,background:C.border,margin:"0 10px"}}/>
          <StatPill label="Join rate"    val={(link.stats?.join_rate??0)+"%"} color={(link.stats?.join_rate||0)>5?C.green:C.amber}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <button onClick={copyLink} style={{
            display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,flex:1,
            border:`1px solid ${copied?C.green:C.border}`,background:copied?C.greenL:C.s2,
            color:copied?C.green:C.text2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F
          }}>
            <Ic n={copied?"check":"copy"} s={11} c={copied?C.green:C.text3}/>
            {copied?"Copied!":"Copy tracked link"}
          </button>
          <Btn v="secondary" icon="chart" onClick={onViewStats}>Stats</Btn>
          <Btn v="secondary" icon="edit"  onClick={onEdit}>Edit</Btn>
          <button onClick={onDelete} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:"6px 8px",color:C.red,display:"flex",alignItems:"center"}}>
            <Ic n="trash" s={13} c={C.red}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats Panel ───────────────────────────────────────────────────────────────
function StatsPanel({ link, onClose }) {
  const [stats,setStats]   = useState(null);
  const [days,setDays]     = useState(30);
  const [tab,setTab]       = useState("overview");
  const [loading,setLoading] = useState(true);

  const load = useCallback(async()=>{
    setLoading(true);
    try { const d = await api.get(`/campaign-links/${link.id}/stats?days=${days}`); setStats(d); }
    finally { setLoading(false); }
  },[link.id,days]);
  useEffect(()=>{ load(); },[load]);

  return (
    <div style={{position:"fixed",top:0,right:0,bottom:0,width:420,background:C.surface,borderLeft:`1.5px solid ${C.border}`,zIndex:1500,display:"flex",flexDirection:"column",boxShadow:"-8px 0 32px rgba(0,0,0,.1)"}}>
      <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={{fontSize:14,fontWeight:700,color:C.text1}}>{link.name}</div><div style={{fontSize:11,color:C.text3}}>Campaign analytics</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Ic n="x" s={18} c={C.text3}/></button>
      </div>
      <div style={{padding:"10px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        {[7,14,30,90].map(d=>(
          <button key={d} onClick={()=>setDays(d)} style={{padding:"3px 9px",borderRadius:20,border:`1px solid ${d===days?C.accent:C.border}`,background:d===days?C.accentL:"none",color:d===days?C.accent:C.text3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>{d}d</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          {[{id:"overview",label:"Overview"},{id:"ab",label:"A/B Test"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"3px 9px",borderRadius:20,border:`1px solid ${t.id===tab?C.purple:C.border}`,background:t.id===tab?C.purpleL:"none",color:t.id===tab?C.purple:C.text3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:F}}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
        {tab==="ab"
          ? <Suspense fallback={<div style={{textAlign:"center",padding:32,color:C.text3}}>Loading…</div>}>
              <ABTestPanel portalId={link.portal_id} links={[link]} days={days}/>
            </Suspense>
          : loading ? <div style={{textAlign:"center",padding:40,color:C.text3}}>Loading…</div>
          : !stats   ? <div style={{textAlign:"center",padding:40,color:C.text3}}>No data yet</div>
          : (<>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20}}>
                {[{label:"Clicks",val:stats.period_clicks,color:C.accent},{label:"Joins",val:stats.period_joins,color:C.green},{label:"Join rate",val:stats.join_rate+"%",color:stats.join_rate>5?C.green:C.amber},{label:"All time",val:stats.total_clicks,color:C.text2}].map(({label,val,color})=>(
                  <div key={label} style={{padding:"14px",background:C.s2,borderRadius:12,border:`1px solid ${C.border}`,textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:800,color,lineHeight:1}}>{val}</div>
                    <div style={{fontSize:11,color:C.text3,marginTop:4}}>{label}</div>
                  </div>
                ))}
              </div>
              {stats.by_source?.length>0&&(
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:10}}>By source</div>
                  {stats.by_source.map(({source,clicks,joins})=>{
                    const pct=stats.period_clicks?Math.round((clicks/stats.period_clicks)*100):0;
                    return (<div key={source} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:600,color:C.text2}}>{source}</span>
                        <span style={{fontSize:12,color:C.text3}}>{clicks} clicks · {joins} joins</span>
                      </div>
                      <div style={{height:6,background:C.s2,borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:C.accent,borderRadius:3}}/>
                      </div>
                    </div>);
                  })}
                </div>
              )}
              {stats.daily?.length>0&&(
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.text2,marginBottom:10}}>Daily clicks</div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80}}>
                    {stats.daily.map(({date,clicks})=>{
                      const max=Math.max(...stats.daily.map(d=>d.clicks),1);
                      const h=Math.max(4,Math.round((clicks/max)*72));
                      return <div key={date} title={`${date}: ${clicks}`} style={{flex:1,height:h,background:C.accent,borderRadius:"2px 2px 0 0",opacity:0.7,minWidth:2}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.7"}/>;
                    })}
                  </div>
                </div>
              )}
            </>)
        }
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CampaignLinks({ environment, portalId, poolId, initialLinkDefaults, compact=false, campaignId=null }) {
  const [links,setLinks]     = useState([]);
  const [portals,setPortals] = useState([]);
  const [pools,setPools]     = useState([]);
  const [loading,setLoading] = useState(true);
  const [creating,setCreating] = useState(false);
  const [editing,setEditing]   = useState(null);
  const [statsLink,setStatsLink] = useState(null);
  const [search,setSearch]   = useState("");

  const load = useCallback(async()=>{
    if(!environment?.id) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ environment_id: environment.id });
      if(portalId)   qs.set("portal_id",   portalId);
      if(poolId)     qs.set("pool_id",     poolId);
      if(campaignId) qs.set("campaign_id", campaignId);

      // Load campaign links + portals + objects in parallel
      // Portals need special handling: response may be array or {portals:[...]} or error object
      const safePortals = async () => {
        try {
          const r = await api.get(`/portals?environment_id=${environment.id}`);
          if (Array.isArray(r)) return r;
          if (r && Array.isArray(r.portals)) return r.portals;
          if (r && Array.isArray(r.data)) return r.data;
          return [];
        } catch { return []; }
      };

      const [lnks, prts, allObjs] = await Promise.all([
        api.get(`/campaign-links?${qs}`).catch(()=>[]),
        safePortals(),
        api.get(`/objects?environment_id=${environment.id}`).catch(()=>[]),
      ]);
      setLinks(Array.isArray(lnks)?lnks:[]);
      setPortals(prts);  // already sanitised by safePortals()
      const poolObj=(Array.isArray(allObjs)?allObjs:[]).find(o=>o.slug==="talent-pools"||o.name?.toLowerCase().includes("pool"));
      if(poolObj){
        const pRecs=await api.get(`/records?object_id=${poolObj.id}&environment_id=${environment.id}&limit=200`).catch(()=>({records:[]}));
        setPools(Array.isArray(pRecs)?pRecs:(pRecs?.records||[]));
      }
    } finally { setLoading(false); }
  },[environment?.id,portalId,poolId]);
  useEffect(()=>{ load(); },[load]);

  const handleSave = async()=>{ setCreating(false); setEditing(null); await load(); };
  const handleDelete = async(id)=>{ if(!window.confirm("Delete this link?")) return; await api.del(`/campaign-links/${id}`); setLinks(l=>l.filter(x=>x.id!==id)); };
  const filtered = links.filter(l=>!search||l.name?.toLowerCase().includes(search.toLowerCase())||l.utm_source?.toLowerCase().includes(search.toLowerCase())||l.utm_campaign?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={compact?{}:{minHeight:"100vh",background:C.bg,padding:"24px 32px",fontFamily:F}}>
      {!compact&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:C.accentL,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="link" s={20} c={C.accent}/></div>
            <div><h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text1}}>Campaign Links</h1><p style={{margin:0,fontSize:13,color:C.text3}}>Tracked links with UTM params, pool auto-join, and A/B testing</p></div>
          </div>
          <Btn icon="plus" onClick={()=>setCreating(true)}>New link</Btn>
        </div>
      )}
      {!compact&&links.length>0&&(
        <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
          {[{label:"Total links",val:links.length,color:C.accent},{label:"Total clicks",val:links.reduce((a,l)=>a+(l.stats?.total_clicks||0),0),color:C.text2},{label:"30d joins",val:links.reduce((a,l)=>a+(l.stats?.joins_30d||0),0),color:C.green}].map(({label,val,color})=>(
            <div key={label} style={{padding:"12px 20px",background:C.surface,borderRadius:12,border:`1.5px solid ${C.border}`,textAlign:"center",minWidth:100}}>
              <div style={{fontSize:22,fontWeight:800,color,lineHeight:1}}>{val}</div>
              <div style={{fontSize:11,color:C.text3,marginTop:3}}>{label}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search links…"
          style={{flex:1,padding:"9px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:13,fontFamily:F,outline:"none",color:C.text1,background:C.surface}}/>
        {compact&&<Btn icon="plus" onClick={()=>setCreating(true)}>New link</Btn>}
      </div>
      {loading?<div style={{textAlign:"center",padding:60,color:C.text3}}>Loading…</div>
      :filtered.length===0?(<div style={{textAlign:"center",padding:"60px 40px",background:C.surface,borderRadius:16,border:`1.5px solid ${C.border}`}}>
          <Ic n="link" s={36} c={C.text3} style={{marginBottom:12}}/>
          <div style={{fontSize:15,fontWeight:700,color:C.text2,marginBottom:6}}>{search?"No links match":"No campaign links yet"}</div>
          <div style={{fontSize:13,color:C.text3,marginBottom:16}}>Create a smart link to track clicks, attribute joins, and run A/B tests.</div>
          {!search&&<Btn icon="plus" onClick={()=>setCreating(true)}>Create first link</Btn>}
        </div>)
      :(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14}}>
          {filtered.map(link=><LinkCard key={link.id} link={link} onEdit={()=>setEditing(link)} onDelete={()=>handleDelete(link.id)} onViewStats={()=>setStatsLink(link)}/>)}
        </div>)}
      {(creating||editing)&&<LinkModal environment={environment} portals={portals} pools={pools} existing={editing} defaults={!editing ? initialLinkDefaults : undefined} onSave={handleSave} onClose={()=>{setCreating(false);setEditing(null);}}/>}
      {statsLink&&<StatsPanel link={statsLink} onClose={()=>setStatsLink(null)}/>}
    </div>
  );
}

// ── Modal wrapper (used from Portals.jsx + Talent Pool records) ───────────────
export function CampaignLinksModal({ environment, portalId, poolId, initialRecord, onClose }) {
  // Build a context-aware title and initial link defaults from the record
  const recordContext = initialRecord?.record;
  const recordName = recordContext?.data?.job_title
    || recordContext?.data?.pool_name
    || recordContext?.data?.name
    || initialRecord?.objectName || "";
  const isPool = initialRecord?.objectName?.toLowerCase().includes("pool");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1800,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
         onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div onMouseDown={e=>e.stopPropagation()} style={{background:C.bg,borderRadius:16,width:"min(920px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.25)"}}>
        <div style={{padding:"14px 18px",background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:9,background:C.accentL,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ic n="link" s={15} c={C.accent}/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.text1}}>Campaign Links</div>
              {recordName && <div style={{fontSize:11,color:C.text3}}>Linked to: {recordName}</div>}
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><Ic n="x" s={18} c={C.text3}/></button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:20}}>
          <CampaignLinks
            environment={environment}
            portalId={portalId}
            poolId={isPool ? (recordContext?.id || poolId) : poolId}
            initialLinkDefaults={recordName ? {
              utm_campaign: recordName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
              notes: `Campaign link for ${recordName}`,
            } : undefined}
            compact
          />
        </div>
      </div>
    </div>
  );
}
