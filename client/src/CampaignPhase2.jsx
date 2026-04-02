// Phase 2 additions — imported and re-exported by Campaigns.jsx
// Channel templates, Automation rules, Calendar view
import { useState, useEffect, useCallback } from "react";
import apiClient from "./apiClient.js";

const api = { get: u => apiClient.get(u), post: (u,b) => apiClient.post(u,b),
              patch: (u,b) => apiClient.patch(u,b), del: u => apiClient.delete(u) };
const F = "'Space Grotesk','DM Sans',system-ui,sans-serif";
const C = {
  bg:"var(--t-bg,#F0F2FF)", surface:"var(--t-surface,#fff)", s2:"var(--t-surface2,#F8F9FF)",
  border:"var(--t-border,#E8ECF8)", accent:"var(--t-accent,#4361EE)",
  accentL:"var(--t-accent-light,#EEF0FF)", text1:"var(--t-text1,#111827)",
  text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9CA3AF)",
  green:"#0ca678", greenL:"#F0FDF4", amber:"#f59f00", amberL:"#FFFBEB",
  red:"#e03131", redL:"#FFF0F0", purple:"#7048e8", purpleL:"#F3F0FF",
};
const PATHS = {
  x:"M18 6L6 18M6 6l12 12", plus:"M12 5v14M5 12h14",
  linkedin:"M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z",
  mail:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2l-8 5-8-5",
  whatsapp:"M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2z",
  briefcase:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  check:"M20 6L9 17l-5-5", trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  calendar:"M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
  chevD:"M6 9l6 6 6-6", chevR:"M9 6l6 6-6 6",
  copy:"M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
};
const Ic = ({n,s=16,c="#374151",style={}}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={PATHS[n]||""}/>
  </svg>
);
function Btn({ onClick, children, v="primary", s="sm", icon, disabled, style={} }) {
  const pad = { sm:"7px 14px", md:"9px 18px" };
  const base = { display:"flex",alignItems:"center",gap:6,borderRadius:8,border:"none",
    cursor:disabled?"not-allowed":"pointer",fontFamily:F,fontSize:13,fontWeight:600,
    padding:pad[s]||pad.sm,opacity:disabled?0.5:1,transition:"opacity .15s",...style };
  const vv = {
    primary:   { background:C.accent, color:"#fff" },
    secondary: { background:C.s2, color:C.text2, border:`1px solid ${C.border}` },
    ghost:     { background:"none", color:C.accent },
    danger:    { background:C.redL, color:C.red, border:`1px solid ${C.red}22` },
  };
  return (
    <button onClick={!disabled?onClick:undefined} style={{...base,...vv[v]}}>
      {icon && <Ic n={icon} s={12} c={v==="primary"?"#fff":v==="danger"?C.red:C.accent}/>}
      {children}
    </button>
  );
}

// ── Channel Templates ─────────────────────────────────────────────────────────
export const CHANNEL_TEMPLATES = [
  {
    id: "linkedin_organic",
    label: "LinkedIn Post",
    icon: "linkedin",
    color: "#0077b5",
    bg: "#EBF5FB",
    description: "Organic LinkedIn post with tracking",
    utm_source: "linkedin",
    utm_medium: "social",
    utm_content: "organic-post",
  },
  {
    id: "linkedin_inmail",
    label: "LinkedIn InMail",
    icon: "mail",
    color: "#0077b5",
    bg: "#EBF5FB",
    description: "Direct InMail outreach campaign",
    utm_source: "linkedin",
    utm_medium: "inmail",
    utm_content: "direct-outreach",
  },
  {
    id: "email",
    label: "Email",
    icon: "mail",
    color: "#0ca678",
    bg: "#F0FDF4",
    description: "Email campaign or newsletter",
    utm_source: "email",
    utm_medium: "email",
    utm_content: "campaign",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "whatsapp",
    color: "#25D366",
    bg: "#EDFCF2",
    description: "WhatsApp message broadcast",
    utm_source: "whatsapp",
    utm_medium: "messaging",
    utm_content: "broadcast",
  },
  {
    id: "job_board",
    label: "Job Board",
    icon: "briefcase",
    color: "#7048e8",
    bg: "#F3F0FF",
    description: "Indeed, LinkedIn Jobs, Bayt, etc.",
    utm_source: "job-board",
    utm_medium: "cpc",
    utm_content: "listing",
  },
  {
    id: "referral",
    label: "Employee Referral",
    icon: "users",
    color: "#f59f00",
    bg: "#FFFBEB",
    description: "Internal referral scheme link",
    utm_source: "referral",
    utm_medium: "referral",
    utm_content: "employee",
  },
  {
    id: "event",
    label: "Event / Campus",
    icon: "calendar",
    color: "#0c8599",
    bg: "#E6FCFF",
    description: "Careers fair, campus event, webinar",
    utm_source: "event",
    utm_medium: "offline",
    utm_content: "event",
  },
  {
    id: "direct",
    label: "Direct / Other",
    icon: "zap",
    color: "#9CA3AF",
    bg: "#F3F4F6",
    description: "Custom link with manual UTM params",
    utm_source: "",
    utm_medium: "",
    utm_content: "",
  },
];

export function ChannelTemplatePicker({ onSelect }) {
  return (
    <div>
      <div style={{ fontSize:12,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",
        letterSpacing:".06em",marginBottom:12 }}>Choose a channel</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
        {CHANNEL_TEMPLATES.map(t => (
          <button key={t.id} onClick={() => onSelect(t)} style={{
            display:"flex", alignItems:"center", gap:10, padding:"11px 13px",
            borderRadius:10, border:`1.5px solid ${t.bg}`,
            background:t.bg, cursor:"pointer", textAlign:"left", fontFamily:F,
            transition:"border-color .15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=t.color}
          onMouseLeave={e=>e.currentTarget.style.borderColor=t.bg}>
            <div style={{ width:30,height:30,borderRadius:8,background:`${t.color}22`,
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <Ic n={t.icon} s={14} c={t.color}/>
            </div>
            <div>
              <div style={{ fontSize:12,fontWeight:700,color:"#111827",lineHeight:1.2 }}>{t.label}</div>
              <div style={{ fontSize:10,color:"#9CA3AF",marginTop:1,lineHeight:1.3 }}>{t.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Automation Rules ──────────────────────────────────────────────────────────
const TRIGGER_OPTS = [
  { id:"on_join",          label:"When someone joins via this campaign" },
  { id:"clicks_reach",     label:"When total clicks reach a number" },
  { id:"joins_reach",      label:"When total joins reach a number" },
  { id:"campaign_ends",    label:"When campaign end date passes" },
];
const ACTION_OPTS = [
  { id:"pause_campaign",   label:"Pause this campaign" },
  { id:"notify_user",      label:"Send a notification to me" },
  { id:"enrol_workflow",   label:"Enrol person in a workflow" },
];

export function AutomationRulesPanel({ campaign, workflows=[], onSave }) {
  const [rules, setRules] = useState(campaign.automation_rules || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const addRule = () => setRules(r => [...r, {
    id: Math.random().toString(36).slice(2), trigger:"on_join",
    threshold: null, action:"notify_user", workflow_id: null, enabled: true,
  }]);

  const updateRule = (id, patch) => setRules(r => r.map(rule => rule.id === id ? {...rule,...patch} : rule));
  const removeRule = (id) => setRules(r => r.filter(rule => rule.id !== id));

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/campaigns/${campaign.id}/rules`, { rules });
      onSave(rules);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const inp = { padding:"7px 10px",borderRadius:7,border:`1.5px solid ${C.border}`,
    fontSize:12,fontFamily:F,outline:"none",color:C.text1,background:C.surface };
  const sel = { ...inp, cursor:"pointer" };

  return (
    <div style={{ maxWidth:620 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div>
          <div style={{ fontSize:14,fontWeight:700,color:C.text1 }}>Automation rules</div>
          <div style={{ fontSize:12,color:C.text3,marginTop:2 }}>Trigger actions automatically when conditions are met</div>
        </div>
        <Btn v="secondary" icon="plus" onClick={addRule}>Add rule</Btn>
      </div>

      {rules.length === 0 ? (
        <div style={{ padding:"40px 0",textAlign:"center",color:C.text3 }}>
          <Ic n="zap" s={28} c={C.border} style={{ marginBottom:8 }}/>
          <div style={{ fontSize:13 }}>No automation rules yet. Add one to get started.</div>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {rules.map(rule => (
            <div key={rule.id} style={{ background:C.surface,borderRadius:12,border:`1.5px solid ${C.border}`,
              padding:"14px 16px",display:"flex",flexDirection:"column",gap:10 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:rule.enabled?C.green:C.border,flexShrink:0 }}/>
                  <span style={{ fontSize:12,fontWeight:600,color:rule.enabled?C.green:C.text3 }}>
                    {rule.enabled?"Active":"Disabled"}
                  </span>
                </div>
                <div style={{ display:"flex",gap:6 }}>
                  <Btn v="secondary" s="sm" onClick={()=>updateRule(rule.id,{enabled:!rule.enabled})}>
                    {rule.enabled?"Disable":"Enable"}
                  </Btn>
                  <button onClick={()=>removeRule(rule.id)} style={{ background:"none",border:"none",cursor:"pointer",padding:2 }}>
                    <Ic n="trash" s={13} c={C.text3}/>
                  </button>
                </div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                <span style={{ fontSize:12,color:C.text3,fontWeight:600,flexShrink:0 }}>WHEN</span>
                <select value={rule.trigger} onChange={e=>updateRule(rule.id,{trigger:e.target.value})} style={{...sel,flex:1}}>
                  {TRIGGER_OPTS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                {(rule.trigger==="clicks_reach"||rule.trigger==="joins_reach") && (
                  <input type="number" min={1} value={rule.threshold||""} onChange={e=>updateRule(rule.id,{threshold:parseInt(e.target.value)||null})}
                    placeholder="number" style={{...inp,width:80}} />
                )}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                <span style={{ fontSize:12,color:C.text3,fontWeight:600,flexShrink:0 }}>DO</span>
                <select value={rule.action} onChange={e=>updateRule(rule.id,{action:e.target.value})} style={{...sel,flex:1}}>
                  {ACTION_OPTS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
                {rule.action==="enrol_workflow" && (
                  <select value={rule.workflow_id||""} onChange={e=>updateRule(rule.id,{workflow_id:e.target.value})} style={{...sel,flex:1}}>
                    <option value="">— pick workflow —</option>
                    {workflows.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rules.length > 0 && (
        <div style={{ marginTop:16,display:"flex",justifyContent:"flex-end",gap:8 }}>
          <Btn onClick={save} disabled={saving}>{saving?"Saving…":saved?"✓ Saved":"Save rules"}</Btn>
        </div>
      )}
    </div>
  );
}

// ── Campaign Calendar ─────────────────────────────────────────────────────────
const GOAL_COLORS = {
  applications: "#4361EE", pool_growth: "#7048e8",
  event: "#0c8599", brand_awareness: "#f59f00",
};
const STATUS_COLORS_CAL = {
  draft: "#9CA3AF", active: "#0ca678", paused: "#f59f00", ended: "#e03131",
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function CampaignCalendar({ campaigns, onSelect }) {
  const now     = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Filter campaigns that overlap this month
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59);

  const visible = campaigns.filter(c => {
    const s = c.start_date ? new Date(c.start_date) : null;
    const e = c.end_date   ? new Date(c.end_date)   : null;
    if (!s && !e) return false;
    const cs = s || monthStart;
    const ce = e || monthEnd;
    return cs <= monthEnd && ce >= monthStart;
  });

  // Compute bar position for each campaign
  const bars = visible.map(c => {
    const s  = c.start_date ? new Date(c.start_date) : monthStart;
    const e  = c.end_date   ? new Date(c.end_date)   : monthEnd;
    const cs = s < monthStart ? monthStart : s;
    const ce = e > monthEnd   ? monthEnd   : e;
    const startDay = cs.getDate();
    const endDay   = ce.getDate();
    const left  = ((startDay - 1) / daysInMonth) * 100;
    const width = ((endDay - startDay + 1) / daysInMonth) * 100;
    return { ...c, startDay, endDay, left, width };
  });

  const prevMonth = () => { if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); };

  return (
    <div style={{ fontFamily:F }}>
      {/* Calendar header */}
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
        <button onClick={prevMonth} style={{ background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontFamily:F,fontSize:13 }}>←</button>
        <div style={{ fontSize:16,fontWeight:700,color:C.text1,minWidth:140,textAlign:"center" }}>
          {MONTHS[month]} {year}
        </div>
        <button onClick={nextMonth} style={{ background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontFamily:F,fontSize:13 }}>→</button>
        <div style={{ marginLeft:"auto",fontSize:12,color:C.text3 }}>
          {visible.length} campaign{visible.length!==1?"s":""} this month
        </div>
      </div>

      {/* Day header */}
      <div style={{ position:"relative",marginBottom:4 }}>
        <div style={{ display:"flex" }}>
          <div style={{ width:160,flexShrink:0 }}/> {/* label col */}
          <div style={{ flex:1,display:"flex" }}>
            {days.map(d => {
              const isToday = d===now.getDate()&&month===now.getMonth()&&year===now.getFullYear();
              return (
                <div key={d} style={{ flex:1,textAlign:"center",fontSize:9,color:isToday?C.accent:C.text3,
                  fontWeight:isToday?700:400,paddingBottom:4 }}>
                  {d}
                </div>
              );
            })}
          </div>
        </div>
        {/* Today line */}
        {month===now.getMonth()&&year===now.getFullYear()&&(
          <div style={{ position:"absolute",top:0,bottom:0,left:`calc(160px + ${((now.getDate()-0.5)/daysInMonth)*100}%)`,
            width:1,background:C.accent,opacity:.4,pointerEvents:"none" }}/>
        )}
      </div>

      {/* Weekend shading + campaign bars */}
      <div style={{ position:"relative" }}>
        {/* Weekend columns */}
        {days.map(d => {
          const dow = new Date(year,month,d).getDay();
          if(dow!==0&&dow!==6) return null;
          const left = ((d-1)/daysInMonth)*100;
          const w    = (1/daysInMonth)*100;
          return <div key={d} style={{ position:"absolute",top:0,bottom:0,
            left:`calc(160px + ${left}%)`,width:`${w}%`,background:"#f3f4f6",zIndex:0 }}/>;
        })}

        {bars.length === 0 ? (
          <div style={{ padding:"30px 0",textAlign:"center",color:C.text3,fontSize:13 }}>
            No campaigns with dates set for this month.
          </div>
        ) : (
          bars.map(c => (
            <div key={c.id} onClick={()=>onSelect(c)}
              style={{ display:"flex",alignItems:"center",marginBottom:6,position:"relative",zIndex:1,cursor:"pointer" }}>
              {/* Campaign label */}
              <div style={{ width:156,flexShrink:0,paddingRight:4,overflow:"hidden" }}>
                <div style={{ fontSize:11,fontWeight:600,color:C.text1,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.name}</div>
                <div style={{ fontSize:9,color:STATUS_COLORS_CAL[c.status]||C.text3,fontWeight:700,textTransform:"uppercase" }}>
                  {c.status}
                </div>
              </div>
              {/* Bar area */}
              <div style={{ flex:1,height:28,position:"relative" }}>
                <div style={{ position:"absolute",left:`${c.left}%`,width:`${c.width}%`,
                  height:"100%",borderRadius:6,
                  background:GOAL_COLORS[c.goal]||C.accent,opacity:.85,
                  display:"flex",alignItems:"center",paddingLeft:8,overflow:"hidden",
                  minWidth:4, boxSizing:"border-box",
                }}>
                  <span style={{ fontSize:10,color:"#fff",fontWeight:600,whiteSpace:"nowrap",
                    overflow:"hidden",textOverflow:"ellipsis" }}>{c.name}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div style={{ display:"flex",gap:16,marginTop:20,flexWrap:"wrap" }}>
        {Object.entries(GOAL_COLORS).map(([g,col])=>(
          <div key={g} style={{ display:"flex",alignItems:"center",gap:5 }}>
            <div style={{ width:10,height:10,borderRadius:2,background:col }}/>
            <span style={{ fontSize:10,color:C.text3,textTransform:"capitalize" }}>{g.replace("_"," ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
