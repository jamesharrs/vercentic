// client/src/settings/AiGovernance.jsx
// EU AI Act compliance — settings section under System Admin
import { useState, useEffect, useCallback } from "react";
import AiBadge, { SparkleIcon } from "../AiBadge.jsx";

const F = "'DM Sans',-apple-system,sans-serif";
const C = {
  accent:"var(--t-accent,#4361EE)", text1:"#111827", text2:"#374151",
  text3:"#6B7280", border:"#E5E7EB", bg:"var(--t-bg,#EEF2FF)",
  green:"#0CA678", amber:"#F08C00", red:"#E03131", purple:"#7048E8",
};

const api = {
  get:(u)=>fetch(u).then(r=>r.json()),
  post:(u,b)=>fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:(u,b)=>fetch(u,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
};

const Ic = ({n,s=16,c=C.text3})=>{
  const p={
    shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    eye:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    check:"M20 6 9 17l-5-5",
    alert:"M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
    download:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
    users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    zap:"M13 2 3 14h9l-1 8 10-12h-9l1-8z",
    file:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    toggle:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 0 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 0-2-2V9m0 0h18",
    info:"M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 16v-4M12 8h.01",
    x:"M18 6 6 18M6 6l12 12",
    chevD:"M6 9l6 6 6-6",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={p[n]||p.shield}/></svg>;
};

// ── COMPLIANCE SCORE CARD ─────────────────────────────────────────────────────
function ComplianceCard({ title, status, description, detail, icon }) {
  const [open, setOpen] = useState(false);
  const colors = { compliant:C.green, partial:C.amber, required:C.red, info:"#6B7280" };
  const labels = { compliant:"Compliant", partial:"Partial", required:"Action required", info:"Informational" };
  const col = colors[status] || C.text3;
  return (
    <div style={{border:`1.5px solid ${col}25`,borderRadius:12,overflow:"hidden",marginBottom:8}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer",background:`${col}06`}}>
        <div style={{width:34,height:34,borderRadius:10,background:`${col}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Ic n={icon||"shield"} s={16} c={col}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{title}</div>
          <div style={{fontSize:11,color:C.text3}}>{description}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,fontWeight:700,color:col,padding:"2px 8px",borderRadius:4,background:`${col}15`}}>{labels[status]}</span>
          <Ic n="chevD" s={13} c={C.text3}/>
        </div>
      </div>
      {open&&detail&&(
        <div style={{padding:"10px 14px 12px",borderTop:`1px solid ${col}20`,background:"white",fontSize:12,color:C.text2,lineHeight:1.7}}>
          {detail}
        </div>
      )}
    </div>
  );
}

// ── POLICY TOGGLE ROW ─────────────────────────────────────────────────────────
function PolicyRow({ label, description, value, onChange }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{label}</div>
        <div style={{fontSize:11,color:C.text3,marginTop:2}}>{description}</div>
      </div>
      <div onClick={()=>onChange(!value)} style={{width:40,height:24,borderRadius:12,background:value?C.green:"#D1D5DB",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
        <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:3,left:value?19:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
      </div>
    </div>
  );
}

// ── AI AUDIT LOG ──────────────────────────────────────────────────────────────
function AiAuditLog({ environmentId }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(()=>{
    api.get(`/api/agents?environment_id=${environmentId||''}`).then(agents=>{
      const agentList = Array.isArray(agents)?agents:[];
      // Fetch all runs for all agents
      Promise.all(agentList.slice(0,20).map(a=>api.get(`/api/agents/${a.id}/runs`)))
        .then(allRuns=>{
          const flat = allRuns.flat().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
          setRuns(flat);
          setLoading(false);
        });
    }).catch(()=>setLoading(false));
  },[environmentId]);

  const filtered = runs.filter(r=>!search||r.agent_name?.toLowerCase().includes(search.toLowerCase())||r.status?.includes(search));

  const exportCsv = () => {
    const rows = [["Agent","Trigger","Status","Record ID","AI Output (preview)","Date"]];
    filtered.forEach(r=>rows.push([r.agent_name||'',r.trigger||'',r.status||'',r.record_id||'',(r.ai_output||'').slice(0,100).replace(/\n/g,' '),r.created_at||'']));
    const csv = rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const a=document.createElement('a'); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download=`ai-audit-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter by agent name or status…"
          style={{flex:1,padding:"8px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:12,fontFamily:F}}/>
        <button onClick={exportCsv} style={{padding:"8px 14px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"white",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6,fontFamily:F}}>
          <Ic n="download" s={13} c={C.text3}/> Export CSV
        </button>
      </div>
      {loading?<div style={{color:C.text3,fontSize:13,padding:"20px 0"}}>Loading…</div>:filtered.length===0?(
        <div style={{color:C.text3,fontSize:13,textAlign:"center",padding:"30px 0"}}>No AI activity logged yet</div>
      ):(
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${C.border}`}}>
                {["Agent","Trigger","Status","Record","AI Output","Date"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"6px 10px",color:C.text3,fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:".04em"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0,50).map(r=>(
                <tr key={r.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"8px 10px",fontWeight:600,color:C.text1}}>{r.agent_name||'—'}</td>
                  <td style={{padding:"8px 10px"}}><span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:`${C.accent}12`,color:C.accent,fontWeight:700}}>{(r.trigger||'').replace(/_/g,' ')}</span></td>
                  <td style={{padding:"8px 10px"}}><span style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:r.status==='completed'?`${C.green}12`:r.status==='pending_approval'?`${C.amber}12`:`${C.red}12`,color:r.status==='completed'?C.green:r.status==='pending_approval'?C.amber:C.red,fontWeight:700}}>{r.status}</span></td>
                  <td style={{padding:"8px 10px",color:C.text3,fontFamily:"monospace",fontSize:11}}>{r.record_id?.slice(0,8)||'—'}</td>
                  <td style={{padding:"8px 10px",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.text2}}>{r.ai_output?.slice(0,80)||'—'}</td>
                  <td style={{padding:"8px 10px",color:C.text3,whiteSpace:"nowrap"}}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length>50&&<div style={{fontSize:11,color:C.text3,padding:"8px 10px"}}>Showing 50 of {filtered.length} entries — export CSV for full log</div>}
        </div>
      )}
    </div>
  );
}

// ── MAIN AI GOVERNANCE PAGE ───────────────────────────────────────────────────
export default function AiGovernance({ environment }) {
  const [tab, setTab] = useState("overview");
  const [policy, setPolicy] = useState({
    require_human_review_for_scoring: true,
    require_human_review_for_emails: true,
    show_ai_badge_on_all_content: true,
    log_all_ai_decisions: true,
    allow_ai_field_updates: false,
    candidate_transparency_notice: true,
    data_minimisation_mode: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setP = (k,v) => setPolicy(p=>({...p,[k]:v}));

  const savePolicy = async () => {
    setSaving(true);
    // Store in server settings (uses security settings store as a catch-all for now)
    await api.patch('/api/security/settings', { ai_governance_policy: policy }).catch(()=>{});
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false), 2000);
  };

  const TABS = [
    {id:"overview", label:"Compliance Overview"},
    {id:"policy",   label:"AI Policy"},
    {id:"audit",    label:"Audit Log"},
    {id:"rights",   label:"Data Subject Rights"},
  ];

  const complianceItems = [
    { title:"AI Output Labelling", status:"compliant", icon:"eye", description:"All AI-generated content is marked with a visible badge",
      detail:"TalentOS displays a ✦ sparkle badge on every note, email, and communication generated by an AI agent. This satisfies Article 52 of the EU AI Act which requires users to be informed when interacting with or receiving AI-generated content." },
    { title:"Human Oversight", status: policy.require_human_review_for_scoring ? "compliant" : "required", icon:"users", description:"Human approval required before AI decisions take effect",
      detail:"The 'Request Approval' action type in agents pauses execution and routes AI outputs to a human reviewer before any action is taken. This satisfies the high-risk AI system requirement under Article 14 for meaningful human oversight. Enable 'Require human review for scoring' in AI Policy to enforce this." },
    { title:"Audit Logging", status: policy.log_all_ai_decisions ? "compliant" : "required", icon:"file", description:"All AI decisions logged with input, output, model, and reviewer",
      detail:"Every agent run is stored in the agent_runs table with: trigger type, record ID, AI prompt context, model output, approval status, and reviewer notes. This satisfies Article 12 (record-keeping for high-risk AI) and Article 17 (quality management). Enable 'Log all AI decisions' in AI Policy." },
    { title:"Candidate Transparency", status: policy.candidate_transparency_notice ? "compliant" : "required", icon:"info", description:"Candidates are notified when AI is used in their assessment",
      detail:"When this policy is enabled, a transparency notice is appended to any candidate-facing communications generated by AI, informing them that AI tools were used in the recruitment process. Required under GDPR Article 22 and EU AI Act Article 52(1)." },
    { title:"Explainability", status:"partial", icon:"zap", description:"AI scoring decisions include reasoning and gap analysis",
      detail:"AI match scores include a reasoning field, strengths, and gaps. However, a formal 'right to explanation' endpoint for data subjects is not yet implemented. This is partially compliant — you can satisfy this manually via the candidate portal or by exporting audit records. Full compliance requires a self-service explanation endpoint." },
    { title:"Bias Monitoring", status:"partial", icon:"toggle", description:"Score distributions should be monitored for demographic patterns",
      detail:"The AI scoring engine does not currently track demographic fields or monitor score distributions for bias. This is a requirement under Article 9 of the EU AI Act for high-risk systems. Recommended action: add a regular audit of match scores segmented by nationality, gender (if collected), and age group to identify systematic bias patterns." },
    { title:"Data Minimisation", status: policy.data_minimisation_mode ? "compliant" : "partial", icon:"shield", description:"AI only processes fields necessary for the task",
      detail:"In standard mode, AI agents process all available record fields. Data minimisation mode restricts agents to only the fields explicitly listed in their conditions, preventing unnecessary personal data processing. Required under GDPR Article 5(1)(c) and EU AI Act Article 10(3)." },
    { title:"Right to Erasure", status:"partial", icon:"x", description:"Deleting a record removes it from AI processing",
      detail:"Records marked as deleted (soft delete) are excluded from agent processing and AI matching. However, data already included in past agent run logs is not purged when a record is deleted. Full compliance requires a hard-delete option that also scrubs agent_runs entries containing that record's data." },
  ];

  const compliantCount = complianceItems.filter(i=>i.status==="compliant").length;
  const score = Math.round((compliantCount / complianceItems.length) * 100);
  const scoreColor = score >= 75 ? C.green : score >= 50 ? C.amber : C.red;

  return (
    <div style={{fontFamily:F}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,padding:"16px",background:"linear-gradient(135deg,#1a1a2e,#3b5bdb)",borderRadius:14,color:"white"}}>
        <div style={{width:48,height:48,borderRadius:14,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ic n="shield" s={24} c="white"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:800}}>AI Governance</div>
          <div style={{fontSize:12,opacity:.75}}>EU AI Act compliance · GDPR Article 22 · High-risk AI system obligations</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:32,fontWeight:900,color:scoreColor=== C.green?"#4ade80":scoreColor===C.amber?"#fbbf24":"#f87171"}}>{score}%</div>
          <div style={{fontSize:11,opacity:.7}}>{compliantCount}/{complianceItems.length} compliant</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:`2px solid ${C.border}`,marginBottom:20}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 18px",border:"none",background:"transparent",cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:tab===t.id?700:500,color:tab===t.id?C.accent:C.text3,borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`,marginBottom:-2}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==="overview"&&(
        <div>
          <div style={{fontSize:12,color:C.text3,marginBottom:16,lineHeight:1.6}}>
            Recruitment AI is classified as <strong>high-risk</strong> under Annex III of the EU AI Act. The requirements below apply to any deployment in the EU or processing of EU residents' data.
            Click any item to see details and recommended actions.
          </div>
          {complianceItems.map((item,i)=><ComplianceCard key={i} {...item}/>)}
        </div>
      )}

      {/* POLICY */}
      {tab==="policy"&&(
        <div>
          <div style={{fontSize:12,color:C.text3,marginBottom:20,lineHeight:1.6,padding:"10px 14px",borderRadius:8,background:`${C.amber}10`,border:`1px solid ${C.amber}30`}}>
            <strong>⚠ Important:</strong> These policies affect how AI agents operate. Changes take effect immediately for new agent runs. Existing runs are unaffected.
          </div>
          <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>Human Oversight</div>
          <PolicyRow label="Require human review before AI scoring is applied" description="Agents with AI Score actions must include a Request Approval step" value={policy.require_human_review_for_scoring} onChange={v=>setP('require_human_review_for_scoring',v)}/>
          <PolicyRow label="Require human review before AI-drafted emails are sent" description="AI draft emails are saved as drafts, not auto-sent" value={policy.require_human_review_for_emails} onChange={v=>setP('require_human_review_for_emails',v)}/>
          <PolicyRow label="Prevent AI from directly updating candidate fields" description="AI can suggest field values but cannot write them without human confirmation" value={!policy.allow_ai_field_updates} onChange={v=>setP('allow_ai_field_updates',!v)}/>
          <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginTop:20,marginBottom:4}}>Transparency</div>
          <PolicyRow label="Show AI badge on all AI-generated content" description="Displays ✦ sparkle badge on notes, emails and communications written by AI" value={policy.show_ai_badge_on_all_content} onChange={v=>setP('show_ai_badge_on_all_content',v)}/>
          <PolicyRow label="Append transparency notice to candidate-facing AI emails" description="Adds a footer: 'This message was drafted with AI assistance'" value={policy.candidate_transparency_notice} onChange={v=>setP('candidate_transparency_notice',v)}/>
          <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:".06em",marginTop:20,marginBottom:4}}>Data & Privacy</div>
          <PolicyRow label="Log all AI decisions" description="Store every agent run, AI output, and human approval decision in the audit log" value={policy.log_all_ai_decisions} onChange={v=>setP('log_all_ai_decisions',v)}/>
          <PolicyRow label="Data minimisation mode" description="Agents only process fields explicitly listed in their conditions" value={policy.data_minimisation_mode} onChange={v=>setP('data_minimisation_mode',v)}/>
          <div style={{marginTop:20,display:"flex",justifyContent:"flex-end"}}>
            <button onClick={savePolicy} disabled={saving} style={{padding:"10px 24px",borderRadius:10,border:"none",background:C.accent,color:"white",fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:F,display:"flex",alignItems:"center",gap:8}}>
              {saved?"✓ Saved":saving?"Saving…":"Save Policy"}
            </button>
          </div>
        </div>
      )}

      {/* AUDIT LOG */}
      {tab==="audit"&&(
        <div>
          <div style={{fontSize:12,color:C.text3,marginBottom:16}}>
            Complete log of all AI agent activity. Required for EU AI Act Article 12 and 17 compliance. Export as CSV for auditors.
          </div>
          <AiAuditLog environmentId={environment?.id}/>
        </div>
      )}

      {/* DATA SUBJECT RIGHTS */}
      {tab==="rights"&&(
        <div>
          <div style={{fontSize:12,color:C.text3,marginBottom:20,lineHeight:1.6}}>
            Under GDPR Article 22 and the EU AI Act, individuals have specific rights regarding automated decision-making in recruitment.
          </div>
          {[
            { right:"Right to Explanation", article:"GDPR Art. 22 / EU AI Act Art. 86", how:"Export the AI decision log for a specific candidate from the Audit Log tab. Filter by record ID. This shows every AI action taken, the input data used, the output, and who reviewed it.", status:"manual" },
            { right:"Right to Human Review", article:"GDPR Art. 22(3)", how:"Any candidate can request that AI-influenced decisions are reviewed by a human. The 'Request Approval' step in agents satisfies this — ensure all high-stakes decisions (scoring, rejection) go through this step.", status:"built-in" },
            { right:"Right to Erasure", article:"GDPR Art. 17", how:"Deleting a candidate record soft-deletes it and excludes it from future AI processing. For full erasure of AI logs, contact your data controller to remove entries from agent_runs where record_id matches.", status:"partial" },
            { right:"Right to Object", article:"GDPR Art. 21", how:"Candidates can object to automated processing. Implement this by adding a field 'AI processing consent' (boolean) to the People object and adding a condition to all agents checking this field is true.", status:"manual" },
            { right:"Transparency Notice", article:"EU AI Act Art. 52", how:"When AI is used to evaluate or communicate with candidates, they must be informed. Enable 'Append transparency notice to candidate-facing AI emails' in AI Policy.", status: policy.candidate_transparency_notice?"built-in":"needs-enabling" },
          ].map((r,i)=>(
            <div key={i} style={{border:`1.5px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text1}}>{r.right}</div>
                  <div style={{fontSize:11,color:C.text3}}>{r.article}</div>
                </div>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,fontWeight:700,flexShrink:0,
                  background:r.status==="built-in"?`${C.green}15`:r.status==="partial"?`${C.amber}15`:`${C.accent}15`,
                  color:r.status==="built-in"?C.green:r.status==="partial"?C.amber:C.accent}}>
                  {r.status==="built-in"?"Built in":r.status==="partial"?"Partial":r.status==="needs-enabling"?"Needs enabling":"Manual process"}
                </span>
              </div>
              <div style={{fontSize:12,color:C.text2,lineHeight:1.6}}>{r.how}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
