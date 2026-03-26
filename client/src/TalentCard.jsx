// TalentCard.jsx — Configurable candidate profile card
// Renders a printable one-pager for any People record.
// Layout is configurable per environment (stored in localStorage + server).
// Accessible from the FunctionalityBar on Person records.

import { useState, useEffect, useRef } from "react";

const F = "'DM Sans',-apple-system,sans-serif";
const api = {
  get: p => fetch(p, { headers: { 'x-user-id': localStorage.getItem('talentos_user_id')||'', 'x-tenant-slug': localStorage.getItem('talentos_tenant')||'' } }).then(r => r.json()),
};

// ── Default card layout config ────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  theme: "light",           // light | dark | brand
  accentColor: "#4361EE",
  showAvatar: true,
  showMatchScore: false,
  sections: [
    { id: "header",   label: "Header",         enabled: true,  fields: ["current_title","current_company","location","email","phone"] },
    { id: "summary",  label: "Summary",         enabled: true,  fields: ["summary"] },
    { id: "skills",   label: "Skills",          enabled: true,  fields: ["skills"] },
    { id: "details",  label: "Key Details",     enabled: true,  fields: ["years_experience","employment_type","availability","languages"] },
    { id: "custom",   label: "Additional Info", enabled: false, fields: [] },
  ],
};

// ── Storage key helpers ───────────────────────────────────────────────────────
const configKey = (envId) => `vrc_talent_card_config_${envId}`;
const loadConfig = (envId) => {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(configKey(envId))) }; }
  catch { return DEFAULT_CONFIG; }
};
const saveConfig = (envId, cfg) => localStorage.setItem(configKey(envId), JSON.stringify(cfg));

// ── Pill component ────────────────────────────────────────────────────────────
const Pill = ({ label, color }) => (
  <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:600, background:`${color}18`, color, border:`1px solid ${color}28`, margin:"2px 3px 2px 0", fontFamily:F }}>
    {label}
  </span>
);

// ── Card renderer ─────────────────────────────────────────────────────────────
const CardRenderer = ({ record, fields, config, companyName }) => {
  const d = record?.data || {};
  const accent = config.accentColor || "#4361EE";
  const isDark  = config.theme === "dark";
  const bg      = isDark ? "#0F172A" : "white";
  const text1   = isDark ? "#F1F5F9" : "#111827";
  const text2   = isDark ? "#94A3B8" : "#6B7280";
  const border  = isDark ? "#1E293B" : "#E5E7EB";
  const surface = isDark ? "#1E293B" : "#F9FAFB";

  const name    = `${d.first_name||""} ${d.last_name||""}`.trim() || "Candidate";
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();

  const fieldMeta = (key) => fields.find(f => f.api_key === key);
  const fieldVal  = (key) => d[key];
  const hasVal    = (key) => { const v = fieldVal(key); return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length); };

  const headerSection  = config.sections.find(s => s.id === "header");
  const summarySection = config.sections.find(s => s.id === "summary");
  const skillsSection  = config.sections.find(s => s.id === "skills");
  const detailsSection = config.sections.find(s => s.id === "details");
  const customSection  = config.sections.find(s => s.id === "custom");

  return (
    <div id="talent-card-print" style={{ width:680, minHeight:480, background:bg, borderRadius:16, overflow:"hidden", fontFamily:F, boxShadow:"0 8px 32px rgba(0,0,0,.15)" }}>

      {/* Top accent bar */}
      <div style={{ height:6, background:`linear-gradient(90deg, ${accent}, ${accent}99)` }}/>

      {/* Header */}
      <div style={{ padding:"24px 28px 20px", borderBottom:`1px solid ${border}`, display:"flex", alignItems:"flex-start", gap:16 }}>
        {config.showAvatar && (
          <div style={{ width:64, height:64, borderRadius:16, background:`${accent}20`, color:accent, fontSize:22, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`2px solid ${accent}30` }}>
            {initials}
          </div>
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:22, fontWeight:800, color:text1, lineHeight:1.2, marginBottom:4 }}>{name}</div>
          {headerSection?.enabled && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginTop:6 }}>
              {(headerSection.fields||[]).filter(k => k !== "email" && k !== "phone" && hasVal(k)).map(k => (
                <span key={k} style={{ fontSize:13, color:text2, display:"flex", alignItems:"center", gap:4 }}>
                  {k === "current_title"   && <span style={{ fontWeight:600, color:text1 }}>{fieldVal(k)}</span>}
                  {k === "current_company" && <span>@ {fieldVal(k)}</span>}
                  {k === "location"        && <span>📍 {fieldVal(k)}</span>}
                </span>
              ))}
            </div>
          )}
          {headerSection?.enabled && (
            <div style={{ display:"flex", gap:16, marginTop:8 }}>
              {hasVal("email") && headerSection.fields?.includes("email") && <span style={{ fontSize:12, color:accent }}>✉ {d.email}</span>}
              {hasVal("phone") && headerSection.fields?.includes("phone") && <span style={{ fontSize:12, color:text2 }}>📞 {d.phone}</span>}
            </div>
          )}
        </div>
        {companyName && (
          <div style={{ fontSize:11, fontWeight:700, color:text2, textAlign:"right", flexShrink:0, paddingTop:4 }}>
            <div style={{ color:accent, fontSize:12 }}>{companyName}</div>
            <div style={{ marginTop:2 }}>Talent Profile</div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding:"20px 28px", display:"flex", gap:24 }}>

        {/* Left column */}
        <div style={{ flex:2, minWidth:0 }}>
          {summarySection?.enabled && hasVal("summary") && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>Summary</div>
              <div style={{ fontSize:13, color:text2, lineHeight:1.65 }}>{d.summary}</div>
            </div>
          )}
          {skillsSection?.enabled && hasVal("skills") && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>Skills</div>
              <div>
                {(Array.isArray(d.skills) ? d.skills : String(d.skills).split(",")).map((s,i) => (
                  <Pill key={i} label={String(s?.name||s).trim()} color={accent}/>
                ))}
              </div>
            </div>
          )}
          {customSection?.enabled && (customSection.fields||[]).some(k => hasVal(k)) && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>Additional Information</div>
              {(customSection.fields||[]).filter(hasVal).map(k => {
                const meta = fieldMeta(k);
                return (
                  <div key={k} style={{ display:"flex", gap:8, marginBottom:6, fontSize:13 }}>
                    <span style={{ color:text2, minWidth:120, flexShrink:0 }}>{meta?.name || k}</span>
                    <span style={{ color:text1, fontWeight:500 }}>{String(fieldVal(k))}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column — key details */}
        {detailsSection?.enabled && (
          <div style={{ flex:1, minWidth:160 }}>
            <div style={{ background:surface, borderRadius:12, padding:"14px 16px", border:`1px solid ${border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:"uppercase", letterSpacing:".08em", marginBottom:12 }}>Key Details</div>
              {(detailsSection.fields||[]).filter(hasVal).map(k => {
                const meta = fieldMeta(k);
                const val  = fieldVal(k);
                return (
                  <div key={k} style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:text2, textTransform:"uppercase", letterSpacing:".06em", marginBottom:2 }}>{meta?.name||k}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:text1 }}>
                      {k === "rating" ? "★".repeat(Number(val)) + "☆".repeat(5-Number(val)) : Array.isArray(val) ? val.map(v=>v?.name||v).join(", ") : String(val)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"10px 28px", borderTop:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:10, color:text2 }}>Generated by Vercentic · {new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
        {d.status && <Pill label={d.status} color={accent}/>}
      </div>
    </div>
  );
};

// ── Config editor ─────────────────────────────────────────────────────────────
const CardConfigEditor = ({ config, fields, onChange }) => {
  const accent = config.accentColor || "#4361EE";
  const themeOpts = [
    { id:"light", label:"Light" },
    { id:"dark",  label:"Dark" },
  ];

  const toggleSection = (sectionId) => {
    onChange({ ...config, sections: config.sections.map(s => s.id === sectionId ? { ...s, enabled: !s.enabled } : s) });
  };

  const toggleField = (sectionId, fieldKey) => {
    onChange({ ...config, sections: config.sections.map(s => {
      if (s.id !== sectionId) return s;
      const has = s.fields.includes(fieldKey);
      return { ...s, fields: has ? s.fields.filter(f => f !== fieldKey) : [...s.fields, fieldKey] };
    })});
  };

  const customSection = config.sections.find(s => s.id === "custom");
  const toggleCustomField = (fieldKey) => toggleField("custom", fieldKey);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, padding:"16px", background:"white", borderRadius:12, border:"1px solid #E5E7EB" }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#111827" }}>Card Settings</div>

      {/* Theme */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Theme</div>
        <div style={{ display:"flex", gap:6 }}>
          {themeOpts.map(t => (
            <button key={t.id} onClick={() => onChange({ ...config, theme: t.id })}
              style={{ flex:1, padding:"6px 10px", borderRadius:7, border:`2px solid ${config.theme===t.id?accent:"#E5E7EB"}`, background:config.theme===t.id?`${accent}12`:"white", color:config.theme===t.id?accent:"#374151", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Accent colour</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["#4361EE","#0ca678","#7c3aed","#e67700","#e03131","#0891b2","#111827"].map(c => (
            <button key={c} onClick={() => onChange({ ...config, accentColor: c })}
              style={{ width:24, height:24, borderRadius:"50%", background:c, border:`3px solid ${config.accentColor===c?"#111827":"transparent"}`, cursor:"pointer", padding:0 }}/>
          ))}
          <input type="color" value={config.accentColor||"#4361EE"} onChange={e => onChange({ ...config, accentColor: e.target.value })}
            style={{ width:24, height:24, borderRadius:"50%", border:"1px solid #E5E7EB", cursor:"pointer", padding:0 }}/>
        </div>
      </div>

      {/* Avatar toggle */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, color:"#374151" }}>Show avatar</span>
        <button onClick={() => onChange({ ...config, showAvatar: !config.showAvatar })}
          style={{ width:36, height:20, borderRadius:99, border:"none", cursor:"pointer", background:config.showAvatar?accent:"#E5E7EB", position:"relative", transition:"background .2s" }}>
          <div style={{ width:14, height:14, borderRadius:"50%", background:"white", position:"absolute", top:3, left:config.showAvatar?19:3, transition:"left .2s" }}/>
        </button>
      </div>

      {/* Sections */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Sections</div>
        {config.sections.map(section => (
          <div key={section.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #F3F4F6" }}>
            <span style={{ fontSize:13, color:"#374151" }}>{section.label}</span>
            <button onClick={() => toggleSection(section.id)}
              style={{ width:34, height:18, borderRadius:99, border:"none", cursor:"pointer", background:section.enabled?accent:"#E5E7EB", position:"relative", transition:"background .2s", flexShrink:0 }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:"white", position:"absolute", top:3, left:section.enabled?19:3, transition:"left .2s" }}/>
            </button>
          </div>
        ))}
      </div>

      {/* Custom section fields */}
      {customSection?.enabled && fields.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Additional fields to show</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {fields.filter(f => !["formula","auto_number","unique_id","lookup","rollup"].includes(f.field_type)).map(f => {
              const on = customSection.fields.includes(f.api_key);
              return (
                <button key={f.id} onClick={() => toggleCustomField(f.api_key)}
                  style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:600, border:`1.5px solid ${on?accent:"#E5E7EB"}`, background:on?`${accent}12`:"white", color:on?accent:"#6B7280", cursor:"pointer", fontFamily:F }}>
                  {f.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main TalentCardModal ──────────────────────────────────────────────────────
export default function TalentCardModal({ record, fields, environment, onClose }) {
  const [config, setConfig]         = useState(() => loadConfig(environment?.id));
  const [showEditor, setShowEditor] = useState(false);
  const [printing,  setPrinting]    = useState(false);
  const cardRef = useRef(null);
  const companyName = environment?.name || "Vercentic";

  const handleConfigChange = (next) => {
    setConfig(next);
    saveConfig(environment?.id, next);
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF }       = await import("jspdf");
      const el = document.getElementById("talent-card-print");
      if (!el) return;
      const canvas = await html2canvas(el, { scale:2, backgroundColor:null, useCORS:true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? "landscape" : "portrait", unit:"px", format:[canvas.width/2, canvas.height/2] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width/2, canvas.height/2);
      const name = `${record.data?.first_name||"candidate"}-${record.data?.last_name||""}`.toLowerCase().replace(/\s+/g,"-");
      pdf.save(`talent-card-${name}.pdf`);
    } finally { setPrinting(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,41,.55)", zIndex:1200, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px", overflowY:"auto" }}>
      <div style={{ width:"100%", maxWidth:1080, display:"flex", gap:20, alignItems:"flex-start" }}>

        {/* Card preview */}
        <div style={{ flex:1, minWidth:0 }}>
          <div ref={cardRef}>
            <CardRenderer record={record} fields={fields} config={config} companyName={companyName}/>
          </div>
        </div>

        {/* Controls */}
        <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column", gap:10 }}>
          {/* Toolbar */}
          <div style={{ background:"white", borderRadius:12, border:"1px solid #E5E7EB", padding:"12px", display:"flex", flexDirection:"column", gap:8 }}>
            <button onClick={handlePrint} disabled={printing}
              style={{ padding:"9px 16px", borderRadius:8, border:"none", background: printing ? "#9CA3AF" : "#4361EE", color:"white", fontSize:13, fontWeight:700, cursor:printing?"not-allowed":"pointer", fontFamily:F, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {printing ? "Generating…" : "Download PDF"}
            </button>
            <button onClick={() => setShowEditor(e => !e)}
              style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #E5E7EB", background:"white", color:"#374151", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>
              {showEditor ? "Hide settings" : "⚙ Customise card"}
            </button>
            <button onClick={onClose}
              style={{ padding:"8px 16px", borderRadius:8, border:"1px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:13, cursor:"pointer", fontFamily:F }}>
              Close
            </button>
          </div>

          {/* Config editor */}
          {showEditor && (
            <CardConfigEditor config={config} fields={fields} onChange={handleConfigChange}/>
          )}
        </div>
      </div>
    </div>
  );
}
