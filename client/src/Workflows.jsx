import { useState, useEffect, useCallback, useMemo } from "react";
import { matchCandidateToJob } from "./AI.jsx";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg: "#f5f6fa", surface: "#ffffff", border: "#e5e7eb",
  text1: "#111827", text2: "#374151", text3: "#9ca3af",
  accent: "#3b5bdb", accentLight: "#eef2ff",
  ai: "#7c3aed", aiLight: "#f5f3ff",
  green: "#0ca678", greenLight: "#ecfdf5",
  orange: "#f59f00", orangeLight: "#fffbeb",
  red: "#e03131", redLight: "#fef2f2",
};

const api = {
  get:    (p)    => fetch(`/api${p}`).then(r=>r.json()),
  post:   (p, b) => fetch(`/api${p}`, {method:"POST",   headers:{"Content-Type":"application/json"}, body:JSON.stringify(b)}).then(r=>r.json()),
  patch:  (p, b) => fetch(`/api${p}`, {method:"PATCH",  headers:{"Content-Type":"application/json"}, body:JSON.stringify(b)}).then(r=>r.json()),
  put:    (p, b) => fetch(`/api${p}`, {method:"PUT",    headers:{"Content-Type":"application/json"}, body:JSON.stringify(b)}).then(r=>r.json()),
  delete: (p)    => fetch(`/api${p}`, {method:"DELETE"}).then(r=>r.json()),
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const PATHS = {
  plus:       "M12 5v14M5 12h14",
  x:          "M18 6L6 18M6 6l12 12",
  edit:       "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:      "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  play:       "M5 3l14 9-14 9V3z",
  check:      "M20 6L9 17l-5-5",
  zap:        "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  mail:       "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  webhook:    "M18 16.016l3-5.196M9 4.516L12 6l3-1.5M6 16.016l-3-5.196M12 21v-6M9.268 4.516L3 15m6-3h6m3-8.5l-6 10.5",
  cpu:        "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  layers:     "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  tag:        "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  loader:     "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  chevRight:  "M9 18l6-6-6-6",
  copy:       "M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4h8",
  eye:        "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  workflow:   "M22 12h-4l-3 9L9 3l-3 9H2",
  user:       "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  briefcase:  "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  settings:   "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
};
const Ic = ({ n, s=16, c="currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]||PATHS.settings}/>
  </svg>
);

// ─── Step type definitions ────────────────────────────────────────────────────
const AUTOMATION_TYPES = [
  { type:"ai_prompt",    label:"AI Prompt",       icon:"cpu",     color:"#7c3aed", desc:"Run an AI prompt against this record" },
  { type:"stage_change", label:"Change Stage",    icon:"tag",     color:"#3b5bdb", desc:"Update the record's status/stage field" },
  { type:"update_field", label:"Update Field",    icon:"edit",    color:"#0ca678", desc:"Set a field to a specific value" },
  { type:"send_email",   label:"Send Email",      icon:"mail",    color:"#f59f00", desc:"Send an email to the candidate" },
  { type:"webhook",      label:"Webhook",         icon:"webhook", color:"#e03131", desc:"POST record data to an external URL" },
];

// Keep STEP_TYPES as alias for display in run results etc.
const STEP_TYPES = AUTOMATION_TYPES;

const automationDef = (type) => AUTOMATION_TYPES.find(s => s.type === type);
const stepDef = (type) => automationDef(type) || { type:"placeholder", label:"Stage", icon:"chevRight", color:"#9ca3af", desc:"Process stage" };

// ─── Step Card ────────────────────────────────────────────────────────────────
const StepCard = ({ step, index, total, onChange, onDelete, onMoveUp, onMoveDown, fields }) => {
  const [showAutomationPicker, setShowAutomationPicker] = useState(false);
  const cfg = step.config || {};
  const auto = automationDef(step.automation_type); // may be undefined = placeholder

  const setConfig   = (key, val) => onChange({ ...step, config: { ...cfg, [key]: val } });
  const setName     = (name)     => onChange({ ...step, name });
  const setAuto     = (type)     => { onChange({ ...step, automation_type: type, config: {} }); setShowAutomationPicker(false); };
  const removeAuto  = ()         => onChange({ ...step, automation_type: null, config: {} });

  return (
    <div style={{ background: C.surface, border: `1.5px solid ${auto ? auto.color+"40" : C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: auto ? `${auto.color}06` : "#fafbff" }}>
        {/* Stage icon */}
        <div style={{ width: 28, height: 28, borderRadius: 8, background: auto ? auto.color : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Ic n={auto ? auto.icon : "chevRight"} s={13} c="white"/>
        </div>

        {/* Editable name */}
        <input
          value={step.name || ""}
          onChange={e => setName(e.target.value)}
          placeholder="Stage name…"
          onClick={e => e.stopPropagation()}
          style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontWeight: 700, color: C.text1, background: "transparent", fontFamily: F, minWidth: 0 }}
        />

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: C.text3, background: "#f3f4f6", borderRadius: 99, padding: "2px 8px", fontWeight: 600 }}>Step {index + 1}</span>
          <button onClick={e=>{e.stopPropagation();onMoveUp();}} disabled={index===0}
            style={{ background:"none",border:"none",cursor:index===0?"default":"pointer",opacity:index===0?.3:1,padding:4,display:"flex",transform:"rotate(-90deg)" }}>
            <Ic n="chevRight" s={12} c={C.text3}/>
          </button>
          <button onClick={e=>{e.stopPropagation();onMoveDown();}} disabled={index===total-1}
            style={{ background:"none",border:"none",cursor:index===total-1?"default":"pointer",opacity:index===total-1?.3:1,padding:4,display:"flex",transform:"rotate(90deg)" }}>
            <Ic n="chevRight" s={12} c={C.text3}/>
          </button>
          <button onClick={e=>{e.stopPropagation();onDelete();}} style={{ background:"none",border:"none",cursor:"pointer",padding:4,display:"flex" }}>
            <Ic n="trash" s={13} c={C.red}/>
          </button>
        </div>
      </div>

      {/* Automation section */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${auto ? auto.color+"20" : C.border}`, background: auto ? `${auto.color}04` : "transparent" }}>
        {!auto ? (
          /* No automation — show picker trigger */
          showAutomationPicker ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text3, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>Choose automation</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {AUTOMATION_TYPES.map(t => (
                  <button key={t.type} onClick={() => setAuto(t.type)}
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 11px", borderRadius:8, border:`1.5px solid ${t.color}40`, background:`${t.color}08`, color:t.color, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}
                    onMouseEnter={e=>{e.currentTarget.style.background=`${t.color}18`;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${t.color}08`;}}>
                    <Ic n={t.icon} s={12}/>{t.label}
                  </button>
                ))}
                <button onClick={() => setShowAutomationPicker(false)}
                  style={{ padding:"6px 11px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", color:C.text3, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:F }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAutomationPicker(true)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderRadius:7, border:`1.5px dashed ${C.border}`, background:"transparent", color:C.text3, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:F }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text3;}}>
              <Ic n="zap" s={11}/> + Add automation
            </button>
          )
        ) : (
          /* Automation configured — show its config */
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700, color:auto.color, background:`${auto.color}12`, padding:"3px 9px", borderRadius:99 }}>
                <Ic n={auto.icon} s={10}/> {auto.label}
              </span>
              <button onClick={removeAuto}
                style={{ marginLeft:"auto", fontSize:11, color:C.text3, background:"none", border:"none", cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", gap:3 }}>
                <Ic n="x" s={10}/> Remove
              </button>
            </div>

            {/* Config fields per automation type */}
            {step.automation_type === "stage_change" && (
              <input value={cfg.to_stage||""} onChange={e=>setConfig("to_stage", e.target.value)} placeholder="New stage value e.g. Interview, Offer, Rejected"
                style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:F, outline:"none", color:C.text1 }}/>
            )}

            {step.automation_type === "update_field" && (
              <div style={{ display:"flex", gap:10 }}>
                <select value={cfg.field||""} onChange={e=>setConfig("field", e.target.value)}
                  style={{ flex:1, padding:"8px 10px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:F, outline:"none", background:"white", color:C.text1 }}>
                  <option value="">Select field…</option>
                  {fields.map(f => <option key={f.api_key} value={f.api_key}>{f.name}</option>)}
                </select>
                <input value={cfg.value||""} onChange={e=>setConfig("value", e.target.value)} placeholder="New value"
                  style={{ flex:1, boxSizing:"border-box", padding:"8px 10px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:F, outline:"none", color:C.text1 }}/>
              </div>
            )}

            {step.automation_type === "ai_prompt" && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <textarea value={cfg.prompt||""} onChange={e=>setConfig("prompt", e.target.value)} rows={3}
                  placeholder={`Prompt — use {{first_name}}, {{skills}} etc. to inject record data`}
                  style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, fontFamily:F, outline:"none", resize:"vertical", color:C.text1, lineHeight:1.5 }}/>
                <select value={cfg.output_field||""} onChange={e=>setConfig("output_field", e.target.value)}
                  style={{ padding:"8px 10px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:F, outline:"none", background:"white", color:C.text1 }}>
                  <option value="">Don't save output to a field</option>
                  {fields.map(f => <option key={f.api_key} value={f.api_key}>Save to: {f.name}</option>)}
                </select>
              </div>
            )}

            {step.automation_type === "send_email" && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <input value={cfg.subject||""} onChange={e=>setConfig("subject", e.target.value)} placeholder="Subject — e.g. Update for {{first_name}}"
                  style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:F, outline:"none", color:C.text1 }}/>
                <textarea value={cfg.body||""} onChange={e=>setConfig("body", e.target.value)} rows={3}
                  placeholder="Hi {{first_name}}, we wanted to update you…"
                  style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, fontFamily:F, outline:"none", resize:"vertical", color:C.text1, lineHeight:1.5 }}/>
              </div>
            )}

            {step.automation_type === "webhook" && (
              <input value={cfg.url||""} onChange={e=>setConfig("url", e.target.value)} placeholder="https://hooks.example.com/talentos"
                style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:F, outline:"none", color:C.text1 }}/>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Workflow Editor ──────────────────────────────────────────────────────────
const WorkflowEditor = ({ workflow, objects: parentObjects, environment, onSave, onClose }) => {
  const [name, setName]       = useState(workflow?.name || "");
  const [objectId, setObjectId] = useState(workflow?.object_id || "");
  const [desc, setDesc]       = useState(workflow?.description || "");
  const [wfType, setWfType]   = useState(workflow?.workflow_type || "automation");
  const [steps, setSteps]     = useState(workflow?.steps || []);
  const [saving, setSaving]   = useState(false);
  const [fields, setFields]   = useState([]);
  const [objects, setObjects] = useState(parentObjects || []);

  useEffect(() => {
    if (parentObjects?.length > 0) setObjects(parentObjects);
  }, [parentObjects]);
  useEffect(() => {
    if (objects.length === 0 && environment?.id) {
      api.get(`/objects?environment_id=${environment.id}`)
        .then(objs => setObjects(Array.isArray(objs) ? objs : []));
    }
  }, [environment?.id]);

  useEffect(() => {
    if (!objectId) return;
    api.get(`/fields?object_id=${objectId}`).then(fs => setFields(Array.isArray(fs) ? fs : []));
  }, [objectId]);

  const addStep = () => {
    setSteps(s => [...s, { id: `new_${Date.now()}`, name: "", automation_type: null, config: {} }]);
  };

  const updateStep = (i, updated) => setSteps(s => s.map((st, idx) => idx === i ? updated : st));
  const deleteStep = (i) => setSteps(s => s.filter((_, idx) => idx !== i));
  const moveStep = (i, dir) => {
    setSteps(s => {
      const arr = [...s];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const save = async () => {
    if (!name.trim() || !objectId) return;
    setSaving(true);
    try {
      let wf;
      if (workflow?.id) {
        wf = await api.patch(`/workflows/${workflow.id}`, { name, object_id: objectId, description: desc, workflow_type: wfType });
      } else {
        wf = await api.post("/workflows", { name, object_id: objectId, description: desc, environment_id: environment.id, workflow_type: wfType });
      }
      if (!wf?.id) throw new Error("Server did not return a workflow ID");
      await api.put(`/workflows/${wf.id}/steps`, { steps });
      onSave({ ...wf, steps });
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1000, display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      <div style={{ width: 680, background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "-8px 0 40px rgba(0,0,0,.2)", animation: "slideIn .2s ease" }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.accent},${C.ai})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ic n="workflow" s={18} c="white"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text1 }}>{workflow?.id ? "Edit Workflow" : "New Workflow"}</div>
            <div style={{ fontSize: 12, color: C.text3 }}>{steps.length} step{steps.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", borderRadius: 8 }}><Ic n="x" s={18} c={C.text3}/></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Workflow meta */}
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text2, marginBottom: -4 }}>Workflow Settings</div>
            <div style={{ display: "flex", gap: 14 }}>
              <label style={{ flex: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 6 }}>Name *</div>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Application Review"
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 14, fontFamily: F, outline: "none", color: C.text1, fontWeight: 600 }}/>
              </label>
              <label style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 6 }}>Linked Object *</div>
                <select value={objectId} onChange={e=>setObjectId(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F, outline: "none", background: "white", color: C.text1 }}>
                  <option value="">Select…</option>
                  {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </label>
            </div>
            <label>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 6 }}>Description</div>
              <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What does this workflow do?"
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F, outline: "none", color: C.text1 }}/>
            </label>
            {/* Workflow type */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Workflow Type</div>
              <div style={{ display:"flex", gap:8 }}>
                {[
                  { value:"automation",  label:"⚡ Automation",    desc:"Run automated steps on records" },
                  { value:"pipeline",    label:"📋 Record Pipeline", desc:"Drive a record's status/stage" },
                  { value:"people_link", label:"👥 Linked Person", desc:"Define stages for people linked to this record" },
                ].map(t => (
                  <button key={t.value} onClick={()=>setWfType(t.value)}
                    style={{ flex:1, padding:"10px 12px", borderRadius:10, border:`2px solid ${wfType===t.value?C.accent:C.border}`,
                      background: wfType===t.value ? C.accentLight : "white",
                      cursor:"pointer", fontFamily:F, textAlign:"left" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:wfType===t.value?C.accent:C.text1, marginBottom:3 }}>{t.label}</div>
                    <div style={{ fontSize:11, color:C.text3, lineHeight:1.4 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text2, marginBottom: 12 }}>Steps</div>
            {steps.length === 0 && (
              <div style={{ background: C.surface, border: `2px dashed ${C.border}`, borderRadius: 12, padding: "32px", textAlign: "center", color: C.text3 }}>
                <Ic n="workflow" s={28} c={C.border}/>
                <div style={{ fontSize: 13, marginTop: 10, fontWeight: 600 }}>No steps yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Add steps below to build your workflow</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {steps.map((step, i) => (
                <div key={step.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {/* Connector line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 14, flexShrink: 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: stepDef(step.type).color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white" }}>{i + 1}</div>
                    {i < steps.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 20, background: `${stepDef(step.type).color}30`, marginTop: 4 }}/>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <StepCard step={step} index={i} total={steps.length} fields={fields}
                      onChange={updated => updateStep(i, updated)}
                      onDelete={() => deleteStep(i)}
                      onMoveUp={() => moveStep(i, -1)}
                      onMoveDown={() => moveStep(i, 1)}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add step button */}
          <button onClick={addStep}
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"12px", borderRadius:12, border:`2px dashed ${C.border}`, background:"transparent", color:C.text3, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F, transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent;e.currentTarget.style.background=C.accentLight;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text3;e.currentTarget.style.background="transparent";}}>
            <Ic n="plus" s={15}/> Add Stage
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.text2, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Cancel</button>
          <button onClick={save} disabled={saving || !name.trim() || !objectId || !environment?.id}
            style={{ padding: "9px 24px", borderRadius: 9, border: "none", background: (!name.trim() || !objectId || !environment?.id) ? C.border : `linear-gradient(135deg,${C.accent},${C.ai})`, color: "white", fontSize: 13, fontWeight: 700, cursor: (!name.trim() || !objectId || !environment?.id) ? "not-allowed" : "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 8 }}>
            {saving ? <><Ic n="loader" s={14}/> Saving…</> : <><Ic n="check" s={14}/> Save Workflow</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Run Panel ────────────────────────────────────────────────────────────────
const RunPanel = ({ workflow, environment, objects, onClose }) => {
  const [records, setRecords]     = useState([]);
  const [selected, setSelected]   = useState([]);
  const [running, setRunning]     = useState(false);
  const [results, setResults]     = useState(null);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    if (!workflow?.object_id || !environment?.id) return;
    api.get(`/records?object_id=${workflow.object_id}&environment_id=${environment.id}&limit=200`)
      .then(d => setRecords(d.records || []));
  }, [workflow, environment]);

  const obj = objects.find(o => o.id === workflow.object_id);
  const getLabel = (r) => {
    const d = r.data || {};
    return [d.first_name, d.last_name].filter(Boolean).join(" ") || d.job_title || d.pool_name || d.name || r.id.slice(0, 8);
  };

  const filtered = records.filter(r => {
    const d = r.data || {};
    const label = getLabel(r).toLowerCase();
    return !search || label.includes(search.toLowerCase());
  });

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const selectAll    = () => setSelected(filtered.map(r => r.id));
  const clearAll     = () => setSelected([]);

  const run = async () => {
    if (!selected.length) return;
    setRunning(true);
    setResults(null);
    const allResults = [];
    for (const recordId of selected) {
      const res = await api.post(`/workflows/${workflow.id}/run`, { record_id: recordId });
      allResults.push({ record: records.find(r => r.id === recordId), result: res });
    }
    setResults(allResults);
    setRunning(false);
  };

  const statusColor = (s) => s === "done" ? C.green : s === "error" ? C.red : C.orange;
  const statusBg    = (s) => s === "done" ? C.greenLight : s === "error" ? C.redLight : C.orangeLight;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 700, maxHeight: "88vh", background: C.surface, borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.2)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.accent},${C.ai})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ic n="play" s={16} c="white"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text1 }}>Run: {workflow.name}</div>
            <div style={{ fontSize: 12, color: C.text3 }}>{workflow.steps?.length} step{workflow.steps?.length !== 1 ? "s" : ""} · {obj?.name} records</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 6 }}><Ic n="x" s={18} c={C.text3}/></button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {!results ? (
            <>
              {/* Record selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${obj?.plural_name || "records"}…`}
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 32px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F, outline: "none", color: C.text1 }}/>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.text3 }}><Ic n="eye" s={14}/></span>
                </div>
                <button onClick={selectAll} style={{ fontSize: 12, fontWeight: 600, color: C.accent, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>Select all</button>
                <button onClick={clearAll}  style={{ fontSize: 12, fontWeight: 600, color: C.text3, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>Clear</button>
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", maxHeight: 340, overflowY: "auto" }}>
                {filtered.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: C.text3, fontSize: 13 }}>No records found</div>}
                {filtered.map((r, i) => {
                  const label = getLabel(r);
                  const checked = selected.includes(r.id);
                  return (
                    <div key={r.id} onClick={() => toggleSelect(r.id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", cursor: "pointer", borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none", background: checked ? C.accentLight : "white", transition: "background .1s" }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? C.accent : C.border}`, background: checked ? C.accent : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {checked && <Ic n="check" s={11} c="white"/>}
                      </div>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: obj?.color || C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>{label.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: checked ? 700 : 500, color: C.text1 }}>{label}</div>
                        {r.data?.status && <div style={{ fontSize: 11, color: C.text3 }}>{r.data.status}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: C.text3 }}>{selected.length} record{selected.length !== 1 ? "s" : ""} selected</span>
                <button onClick={run} disabled={!selected.length || running}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 9, border: "none", background: selected.length ? `linear-gradient(135deg,${C.accent},${C.ai})` : C.border, color: "white", fontSize: 13, fontWeight: 700, cursor: selected.length ? "pointer" : "not-allowed", fontFamily: F }}>
                  {running ? <><Ic n="loader" s={14}/> Running…</> : <><Ic n="play" s={14}/> Run on {selected.length} record{selected.length !== 1 ? "s" : ""}</>}
                </button>
              </div>
            </>
          ) : (
            /* Results */
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text1 }}>Run Complete</div>
                <div style={{ fontSize: 12, color: C.green, background: C.greenLight, padding: "3px 10px", borderRadius: 99, fontWeight: 600 }}>
                  {results.filter(r => r.result.steps?.every(s => s.status === "done")).length}/{results.length} succeeded
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {results.map((r, i) => (
                  <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#f9fafb", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: obj?.color || C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>{getLabel(r.record).charAt(0).toUpperCase()}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{getLabel(r.record)}</span>
                    </div>
                    <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                      {r.result.steps?.map((step, j) => (
                        <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", borderRadius: 8, background: statusBg(step.status) }}>
                          <Ic n={step.status === "done" ? "check" : "x"} s={13} c={statusColor(step.status)}/>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{stepDef(step.type).label}</div>
                            {step.output && <div style={{ fontSize: 11, color: C.text2, marginTop: 2, whiteSpace: "pre-wrap" }}>{step.output}</div>}
                            {step.error  && <div style={{ fontSize: 11, color: C.red,   marginTop: 2 }}>Error: {step.error}</div>}
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(step.status), textTransform: "uppercase" }}>{step.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Workflows Page ──────────────────────────────────────────────────────
export default function WorkflowsPage({ environment }) {
  const [workflows, setWorkflows]   = useState([]);
  const [objects, setObjects]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(null);  // null | workflow | {}
  const [running, setRunning]       = useState(null);  // workflow to run
  const [filterObj, setFilterObj]   = useState("");

  const load = useCallback(async () => {
    if (!environment?.id) return;
    const [wfs, objs] = await Promise.all([
      api.get(`/workflows?environment_id=${environment.id}`),
      api.get(`/objects?environment_id=${environment.id}`),
    ]);
    setWorkflows(Array.isArray(wfs) ? wfs : []);
    setObjects(Array.isArray(objs) ? objs : []);
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  const deleteWorkflow = async (id) => {
    if (!confirm("Delete this workflow?")) return;
    await api.delete(`/workflows/${id}`);
    setWorkflows(w => w.filter(x => x.id !== id));
  };

  const toggleActive = async (wf) => {
    const updated = await api.patch(`/workflows/${wf.id}`, { active: !wf.active });
    setWorkflows(ws => ws.map(w => w.id === wf.id ? { ...w, active: !w.active } : w));
  };

  const objName = (id) => objects.find(o => o.id === id)?.name || "—";
  const objColor= (id) => objects.find(o => o.id === id)?.color || C.accent;

  const filtered = filterObj ? workflows.filter(w => w.object_id === filterObj) : workflows;

  return (
    <div style={{ fontFamily: F, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: C.text1 }}>Workflows</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.text3 }}>Automate actions and AI prompts on your records</p>
        </div>
        {/* Filter by object */}
        <select value={filterObj} onChange={e=>setFilterObj(e.target.value)}
          style={{ padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: F, outline: "none", background: "white", color: C.text1 }}>
          <option value="">All objects</option>
          {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button onClick={() => setEditing({})}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, border: "none", background: `linear-gradient(135deg,${C.accent},${C.ai})`, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: F, boxShadow: "0 2px 12px rgba(99,102,241,.3)" }}>
          <Ic n="plus" s={15} c="white"/> New Workflow
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.text3, fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.text3 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Ic n="workflow" s={30} c={C.accent}/>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text2, marginBottom: 6 }}>No workflows yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Create your first workflow to automate actions on records</div>
          <button onClick={() => setEditing({})}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 9, border: "none", background: `linear-gradient(135deg,${C.accent},${C.ai})`, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
            <Ic n="plus" s={14} c="white"/> Create Workflow
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(wf => {
            const color = objColor(wf.object_id);
            return (
              <div key={wf.id} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                {/* Object badge */}
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, border: `1.5px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ic n="workflow" s={20} c={color}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>{wf.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}15`, padding: "2px 8px", borderRadius: 99 }}>{objName(wf.object_id)}</span>
                    {wf.workflow_type === "pipeline"    && <span style={{ fontSize:11, color:"#0ca678", background:"#ecfdf5", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>📋 Pipeline</span>}
                    {wf.workflow_type === "people_link" && <span style={{ fontSize:11, color:"#7c3aed", background:"#f5f3ff", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>👥 Linked Person</span>}
                    {!wf.active && <span style={{ fontSize: 11, color: C.text3, background: "#f3f4f6", padding: "2px 8px", borderRadius: 99 }}>Inactive</span>}
                  </div>
                  {wf.description && <div style={{ fontSize: 12, color: C.text3, marginBottom: 6 }}>{wf.description}</div>}
                  {/* Step pills */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {(wf.steps || []).map((s, i) => {
                      const auto = automationDef(s.automation_type);
                      return (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: auto ? auto.color : C.text3, background: auto ? `${auto.color}12` : "#f3f4f6", padding: "2px 8px", borderRadius: 99 }}>
                          <Ic n={auto ? auto.icon : "chevRight"} s={9}/>{s.name || auto?.label || `Step ${i+1}`}
                        </span>
                      );
                    })}
                    {(wf.steps || []).length === 0 && <span style={{ fontSize: 11, color: C.text3 }}>No steps configured</span>}
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {/* Active toggle */}
                  <div onClick={() => toggleActive(wf)} style={{ width: 38, height: 22, borderRadius: 99, background: wf.active ? C.green : "#e5e7eb", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: wf.active ? 19 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }}/>
                  </div>
                  <button onClick={() => setRunning(wf)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${C.accent}30`, background: C.accentLight, color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}>
                    <Ic n="play" s={12}/> Run
                  </button>
                  <button onClick={() => setEditing(wf)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}>
                    <Ic n="edit" s={12}/> Edit
                  </button>
                  <button onClick={() => deleteWorkflow(wf.id)}
                    style={{ display: "flex", alignItems: "center", padding: "7px 8px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.red, cursor: "pointer" }}>
                    <Ic n="trash" s={13}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor panel */}
      {editing !== null && (
        <WorkflowEditor workflow={editing?.id ? editing : null} objects={objects} environment={environment}
          onClose={() => setEditing(null)}
          onSave={(wf) => {
            setWorkflows(ws => ws.find(w => w.id === wf.id) ? ws.map(w => w.id === wf.id ? wf : w) : [...ws, wf]);
            setEditing(null);
          }}/>
      )}

      {/* Run panel */}
      {running && (
        <RunPanel workflow={running} environment={environment} objects={objects} onClose={() => setRunning(null)}/>
      )}
    </div>
  );
}


// ─── RecordPipelinePanel ──────────────────────────────────────────────────────
// Shown inside the Pipeline panel on any object record.
// Only handles Record Pipeline (drives the record's own status through stages).
// People linking is handled by PeoplePipelineWidget at the top of the record page.
export function RecordPipelinePanel({ record, objectId, environment, objectName, onNavigate }) {
  const [assignments, setAssignments]   = useState([]);
  const [allWorkflows, setAllWorkflows] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [stageSaved, setStageSaved]     = useState(false);

  const pipelineWf = assignments.find(a => a.type === "pipeline")?.workflow;

  const load = async () => {
    if (!record?.id || !environment?.id) return;
    setLoading(true);
    const [asgn, wfs] = await Promise.all([
      api.get(`/workflows/assignments?record_id=${record.id}`),
      api.get(`/workflows?environment_id=${environment.id}`),
    ]);
    setAssignments(Array.isArray(asgn) ? asgn : []);
    setAllWorkflows(Array.isArray(wfs)  ? wfs  : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [record?.id, environment?.id]);

  const assignWorkflow = async (type, workflow_id) => {
    setSaving(true);
    await api.put("/workflows/assignments", { record_id: record.id, workflow_id: workflow_id || null, type });
    await load();
    setSaving(false);
  };

  const setRecordStage = async (stepName) => {
    await api.patch(`/records/${record.id}`, { data: { ...record.data, status: stepName } });
    record.data = { ...record.data, status: stepName };
    setStageSaved(true);
    setTimeout(() => setStageSaved(false), 1800);
  };

  const pipelineOptions = allWorkflows.filter(w => w.workflow_type === "pipeline" && w.object_id === objectId && !w.deleted_at);

  if (loading) return <div style={{ padding:"20px 0", textAlign:"center", color:C.text3, fontSize:13 }}>Loading…</div>;

  const tabStyle = (active) => ({
    padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight: active ? 700 : 500,
    border:`1.5px solid ${active ? C.accent : C.border}`,
    background: active ? C.accentLight : "transparent",
    color: active ? C.accent : C.text2, cursor:"pointer", fontFamily:F, transition:"all .1s",
  });

  return (
    <div style={{ fontFamily:F, display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:12, color:C.text3 }}>Assign a pipeline to drive this record's status through defined stages.</div>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.text2, marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Pipeline Workflow</div>
        <select value={pipelineWf?.id||""} onChange={e=>assignWorkflow("pipeline", e.target.value)} disabled={saving}
          style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:F, outline:"none", background:"white", color:C.text1 }}>
          <option value="">— None —</option>
          {pipelineOptions.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        {pipelineOptions.length === 0 && (
          <div style={{ fontSize:11, color:C.text3, marginTop:6 }}>No pipeline workflows yet — create one in Settings → Workflows with type "Record Pipeline".</div>
        )}
      </div>
      {pipelineWf?.steps?.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.text2, marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>
            Current Stage {stageSaved && <span style={{ color:C.green, fontWeight:600, textTransform:"none", marginLeft:6 }}>✓ Saved</span>}
          </div>
          <div style={{ display:"flex", borderRadius:10, overflow:"hidden", border:`1.5px solid ${C.border}` }}>
            {pipelineWf.steps.map((step, i) => {
              const isCurrent = record.data?.status === step.name;
              const stageIdx  = pipelineWf.steps.findIndex(s => s.name === record.data?.status);
              const isPast    = stageIdx > i;
              return (
                <button key={step.id} onClick={() => setRecordStage(step.name)}
                  style={{ flex:1, padding:"10px 4px", background: isCurrent ? C.accent : isPast ? `${C.accent}22` : "#f9fafb",
                    border:"none", borderRight: i < pipelineWf.steps.length-1 ? `1px solid ${C.border}` : "none",
                    color: isCurrent ? "white" : isPast ? C.accent : C.text3,
                    cursor:"pointer", fontFamily:F, fontSize:11, fontWeight: isCurrent ? 700 : 500,
                    textAlign:"center", transition:"all .12s", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background: isCurrent?"white": isPast?C.accent:C.border }}/>
                  <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%", padding:"0 2px" }}>
                    {step.name||`Stage ${i+1}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PeoplePipelineWidget ─────────────────────────────────────────────────────
// Shown at the TOP of any non-Person object record (e.g. Job).
// Displays the Linked Person workflow stage track with counts; clicking a stage
// expands an inline list of people in that stage. Workflow selector shown if
// multiple Linked Person workflows are available for this object.
export function PeoplePipelineWidget({ record, objectId, environment, onNavigate }) {
  const [assignments, setAssignments]     = useState([]);
  const [allWorkflows, setAllWorkflows]   = useState([]);
  const [peopleLinks, setPeopleLinks]     = useState([]);
  const [personRecords, setPersonRecords] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedStage, setSelectedStage] = useState(null);
  const [addingPerson, setAddingPerson]   = useState(false);
  const [personSearch, setPersonSearch]   = useState("");
  const [saving, setSaving]               = useState(false);

  const peopleLinkWf = assignments.find(a => a.type === "people_link")?.workflow;
  const plSteps      = peopleLinkWf?.steps || [];
  const hasStages    = plSteps.length > 0;

  const load = async () => {
    if (!record?.id || !environment?.id) return;
    setLoading(true);
    const [asgn, wfs, links] = await Promise.all([
      api.get(`/workflows/assignments?record_id=${record.id}`),
      api.get(`/workflows?environment_id=${environment.id}`),
      api.get(`/workflows/people-links?target_record_id=${record.id}`),
    ]);
    setAssignments(Array.isArray(asgn) ? asgn : []);
    setAllWorkflows(Array.isArray(wfs)  ? wfs  : []);
    setPeopleLinks(Array.isArray(links) ? links : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [record?.id, environment?.id]);

  const assignWorkflow = async (workflow_id) => {
    setSaving(true);
    await api.put("/workflows/assignments", { record_id: record.id, workflow_id: workflow_id || null, type: "people_link" });
    await load();
    setSaving(false);
  };

  const loadPersonRecords = async () => {
    const objs = await api.get(`/objects?environment_id=${environment.id}`);
    const personObj = (Array.isArray(objs) ? objs : []).find(o => o.name === "Person");
    if (!personObj) return;
    const recs = await api.get(`/records?object_id=${personObj.id}&environment_id=${environment.id}&limit=500`);
    setPersonRecords(recs.records || []);
  };

  const openAddPerson = async () => {
    if (!hasStages) return;
    await loadPersonRecords();
    setPersonSearch("");
    setAddingPerson(true);
  };

  const linkPerson = async (personRecordId) => {
    const firstStep = plSteps[0];
    if (peopleLinks.find(l => l.person_record_id === personRecordId)) { setAddingPerson(false); return; }
    await api.post("/workflows/people-links", {
      person_record_id: personRecordId,
      target_record_id: record.id,
      target_object_id: objectId,
      stage_id:   firstStep?.id   || null,
      stage_name: firstStep?.name || "New",
      environment_id: environment.id,
    });
    setAddingPerson(false);
    await load();
    setSelectedStage(firstStep?.id || null);
  };

  const moveStage = async (linkId, step) => {
    await api.patch(`/workflows/people-links/${linkId}`, { stage_id: step.id, stage_name: step.name });
    setPeopleLinks(ls => ls.map(l => l.id === linkId ? { ...l, stage_id: step.id, stage_name: step.name } : l));
  };

  const removeLink = async (linkId) => {
    if (!confirm("Remove this person from the pipeline?")) return;
    await api.delete(`/workflows/people-links/${linkId}`);
    setPeopleLinks(ls => ls.filter(l => l.id !== linkId));
    if (peopleLinks.length <= 1) setSelectedStage(null);
  };

  const pLabel = (p) => { const d = p.person_data || {}; return [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || p.person_record_id?.slice(0,8); };
  const pSub   = (p) => { const d = p.person_data || {}; return d.current_title || d.email || ""; };
  const pInit  = (p) => pLabel(p).charAt(0).toUpperCase();

  const countByStage = plSteps.reduce((acc, s) => { acc[s.id] = peopleLinks.filter(l => l.stage_id === s.id).length; return acc; }, {});

  // Compute AI match scores for each person against the linked record (if it's a job-like object)
  const matchScores = useMemo(() => {
    const scores = {};
    peopleLinks.forEach(link => {
      if (link.person_data && record) {
        // person_data is already the flat data object; wrap it so matchCandidateToJob can find .data
        const personRecord = { data: link.person_data };
        const result = matchCandidateToJob(personRecord, record);
        scores[link.id] = result;
      }
    });
    return scores;
  }, [peopleLinks, record]);

  const visiblePeople = useMemo(() => {
    const base = selectedStage === "__all__" ? peopleLinks : selectedStage ? peopleLinks.filter(l => l.stage_id === selectedStage) : [];
    return [...base].sort((a, b) => (matchScores[b.id]?.score || 0) - (matchScores[a.id]?.score || 0));
  }, [selectedStage, peopleLinks, matchScores]);
  const linkedIds = new Set(peopleLinks.map(l => l.person_record_id));
  const filteredPersons = personRecords.filter(r => {
    if (linkedIds.has(r.id)) return false;
    if (!personSearch) return true;
    const d = r.data || {};
    return [d.first_name, d.last_name, d.email].filter(Boolean).join(" ").toLowerCase().includes(personSearch.toLowerCase());
  });

  const peopleLinkOptions = allWorkflows.filter(w => w.workflow_type === "people_link" && w.object_id === objectId && !w.deleted_at);

  // Don't render anything if no Linked Person workflows exist for this object type
  if (!loading && peopleLinkOptions.length === 0) return null;

  if (loading) return (
    <div style={{ padding:"14px 20px", background:"white", fontFamily:F, color:C.text3, fontSize:13 }}>
      Loading…
    </div>
  );

  return (
    <div style={{ fontFamily:F, background:"white" }}>
      {/* Header bar — slim, integrated */}
      <div style={{ padding:"8px 20px", display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#7c3aed", letterSpacing:".02em", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:14 }}>👥</span> Linked People
          {peopleLinks.length > 0 && (
            <span style={{ fontSize:10, fontWeight:700, color:"white", background:"#7c3aed",
              padding:"1px 7px", borderRadius:99, lineHeight:"18px" }}>{peopleLinks.length}</span>
          )}
        </span>
        {/* Workflow selector */}
        <select value={peopleLinkWf?.id||""} onChange={e=>assignWorkflow(e.target.value)} disabled={saving}
          style={{ padding:"4px 8px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12,
            fontFamily:F, outline:"none", background:"white", color:C.text2, maxWidth:200 }}>
          <option value="">— Select workflow —</option>
          {peopleLinkOptions.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <div style={{ flex:1 }}/>
        <button onClick={openAddPerson}
          disabled={!hasStages}
          title={hasStages ? "Add a person" : "Assign a Linked Person workflow with stages first"}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:7,
            border:`1.5px solid ${hasStages ? "#7c3aed" : C.border}`,
            background: hasStages ? "#f5f3ff" : "#f9fafb",
            color: hasStages ? "#7c3aed" : C.text3,
            fontSize:12, fontWeight:700, cursor: hasStages ? "pointer" : "not-allowed", fontFamily:F, whiteSpace:"nowrap" }}>
          <Ic n="plus" s={11}/> Add Person
        </button>
      </div>

      {/* No workflow assigned */}
      {!peopleLinkWf && (
        <div style={{ padding:"14px 20px", color:C.text3, fontSize:12 }}>
          Select a Linked Person workflow above to start tracking people through stages on this record.
        </div>
      )}

      {/* Workflow assigned but no stages */}
      {peopleLinkWf && !hasStages && (
        <div style={{ padding:"14px 20px", color:C.text3, fontSize:12 }}>
          The workflow <strong style={{ color:C.text2 }}>{peopleLinkWf.name}</strong> has no stages yet — add stages in Settings → Workflows to start linking people.
        </div>
      )}

      {/* Stage track */}
      {hasStages && (
        <div>
          <div style={{ display:"flex", borderTop:`1px solid #f3f0ff` }}>
            {plSteps.map((step, i) => {
              const count    = countByStage[step.id] || 0;
              const isActive = selectedStage === step.id;
              return (
                <button key={step.id}
                  onClick={() => setSelectedStage(isActive ? null : step.id)}
                  style={{ flex:1, padding:"10px 4px 8px",
                    background: isActive ? "#7c3aed" : "transparent",
                    border:"none",
                    borderRight: i < plSteps.length-1 ? `1px solid ${isActive ? "#9d5aff" : "#ede9fe"}` : "none",
                    cursor:"pointer", fontFamily:F, transition:"background .12s",
                    display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <span style={{ fontSize:17, fontWeight:800, color: isActive ? "white" : "#7c3aed", lineHeight:1 }}>{count}</span>
                  <span style={{ fontSize:10, fontWeight: isActive ? 600 : 400,
                    color: isActive ? "rgba(255,255,255,.85)" : "#a78bfa",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%", padding:"0 4px" }}>
                    {step.name || `Stage ${i+1}`}
                  </span>
                </button>
              );
            })}
            {/* All */}
            <button onClick={() => setSelectedStage(selectedStage==="__all__" ? null : "__all__")}
              style={{ padding:"10px 16px 8px",
                background: selectedStage==="__all__" ? "#374151" : "transparent",
                border:"none", borderLeft:`1px solid #ede9fe`,
                cursor:"pointer", fontFamily:F, transition:"background .12s",
                display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <span style={{ fontSize:17, fontWeight:800, color: selectedStage==="__all__" ? "white" : C.text3, lineHeight:1 }}>{peopleLinks.length}</span>
              <span style={{ fontSize:10, color: selectedStage==="__all__" ? "rgba(255,255,255,.75)" : C.text3 }}>All</span>
            </button>
          </div>

          {/* Inline expanded people list */}
          {selectedStage && (
            <div style={{ padding:"12px 14px 10px", display:"flex", flexDirection:"column", gap:8, background:"white" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#7c3aed", flex:1 }}>
                  {selectedStage === "__all__"
                    ? `All — ${visiblePeople.length} ${visiblePeople.length===1?"person":"people"}`
                    : `${plSteps.find(s=>s.id===selectedStage)?.name} — ${visiblePeople.length} ${visiblePeople.length===1?"person":"people"}`}
                </span>
                <button onClick={openAddPerson}
                  style={{ fontSize:11, color:"#7c3aed", background:"none", border:"none", cursor:"pointer", fontWeight:700, padding:"2px 6px" }}>
                  + Add
                </button>
              </div>
              {visiblePeople.length === 0 && (
                <div style={{ textAlign:"center", padding:"14px 0", color:"#c4b5fd", fontSize:12 }}>No people in this stage yet.</div>
              )}
              {visiblePeople.map(link => (
                <PipelinePersonRow key={link.id} link={link} steps={plSteps}
                  label={pLabel(link)} subtitle={pSub(link)} initial={pInit(link)}
                  matchScore={matchScores[link.id]}
                  personData={link.person_data}
                  onMove={moveStage} onRemove={removeLink} onNavigate={onNavigate}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add person modal */}
      {addingPerson && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:2000,
          display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setAddingPerson(false)}>
          <div style={{ background:C.surface, borderRadius:16, width:440, maxHeight:"72vh",
            display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center" }}>
              <span style={{ fontWeight:800, fontSize:14, color:C.text1, flex:1 }}>Add Person to Pipeline</span>
              <button onClick={()=>setAddingPerson(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><Ic n="x" s={16} c={C.text3}/></button>
            </div>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
              <input autoFocus value={personSearch} onChange={e=>setPersonSearch(e.target.value)}
                placeholder="Search by name or email…"
                style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", border:`1.5px solid ${C.border}`,
                  borderRadius:9, fontSize:13, fontFamily:F, outline:"none", color:C.text1 }}/>
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              {filteredPersons.length === 0 && (
                <div style={{ padding:"24px", textAlign:"center", color:C.text3, fontSize:13 }}>
                  {personSearch ? "No matching people" : "All people are already linked"}
                </div>
              )}
              {filteredPersons.map((r, i) => {
                const d = r.data||{};
                const label = [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || r.id.slice(0,8);
                return (
                  <div key={r.id} onClick={()=>linkPerson(r.id)}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px",
                      cursor:"pointer", borderBottom: i < filteredPersons.length-1 ? `1px solid ${C.border}` : "none" }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ width:34, height:34, borderRadius:"50%", background:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ color:"white", fontSize:13, fontWeight:700 }}>{label.charAt(0).toUpperCase()}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{label}</div>
                      {d.current_title && <div style={{ fontSize:11, color:C.text3 }}>{d.current_title}</div>}
                    </div>
                    <span style={{ fontSize:11, color:"#7c3aed", fontWeight:600 }}>+ Add</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── PipelinePersonRow ────────────────────────────────────────────────────────
function PipelinePersonRow({ link, steps, label, subtitle, initial, matchScore, personData, onMove, onRemove, onNavigate }) {
  const currentIdx  = steps.findIndex(s => s.id === link.stage_id);
  const currentStep = steps[currentIdx] || steps[0];
  const prevStep    = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep    = currentIdx >= 0 && currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  const score = matchScore?.score ?? null;
  const location = personData?.location || null;

  // Score colour
  const scoreColor = score === null ? "#9ca3af"
    : score >= 75 ? "#059669"
    : score >= 50 ? "#d97706"
    : "#dc2626";
  const scoreBg = score === null ? "#f3f4f6"
    : score >= 75 ? "#ecfdf5"
    : score >= 50 ? "#fffbeb"
    : "#fef2f2";

  return (
    <div style={{ background:"#faf5ff", border:`1px solid #e9d5ff`, borderRadius:10,
      padding:"9px 12px", display:"flex", alignItems:"center", gap:10 }}>
      {/* Avatar */}
      <div style={{ width:30, height:30, borderRadius:"50%", background:"#7c3aed",
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ color:"white", fontSize:11, fontWeight:700 }}>{initial}</span>
      </div>

      {/* Match score badge */}
      {score !== null && (
        <div title={matchScore?.reasons?.join(" · ")||"Match score"}
          style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0,
            background:scoreBg, border:`1px solid ${scoreColor}22`, borderRadius:8,
            padding:"3px 7px", minWidth:38, cursor:"default" }}>
          <span style={{ fontSize:13, fontWeight:800, color:scoreColor, lineHeight:1 }}>{score}%</span>
          <span style={{ fontSize:9, color:scoreColor, fontWeight:600, opacity:0.8, lineHeight:1, marginTop:1 }}>match</span>
        </div>
      )}

      {/* Name + location */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</div>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:1, flexWrap:"wrap" }}>
          {subtitle && <span style={{ fontSize:11, color:C.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{subtitle}</span>}
          {location && (
            <span style={{ fontSize:10, color:"#7c3aed", background:"#ede9fe", borderRadius:20, padding:"1px 6px", fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
              📍 {location}
            </span>
          )}
        </div>
      </div>
      {/* Stage controls */}
      {steps.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
          {/* Back */}
          <button onClick={() => prevStep && onMove(link.id, prevStep)}
            disabled={!prevStep}
            title={prevStep ? `← ${prevStep.name}` : "First stage"}
            style={{ width:22, height:22, borderRadius:6, background: prevStep ? "#ede9fe" : "#f3f4f6",
              border:`1px solid ${prevStep ? "#c4b5fd" : "#e5e7eb"}`,
              color: prevStep ? "#7c3aed" : "#d1d5db", cursor: prevStep ? "pointer" : "default",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, padding:0 }}>
            ‹
          </button>
          {/* Current stage dropdown */}
          <select value={link.stage_id || steps[0]?.id || ""}
            onChange={e => { const s = steps.find(st => st.id === e.target.value); if(s) onMove(link.id, s); }}
            style={{ padding:"4px 8px", borderRadius:20, fontSize:11, fontWeight:700,
              border:`1.5px solid #c4b5fd`, background:"#ede9fe", color:"#6d28d9",
              cursor:"pointer", fontFamily:F, outline:"none", maxWidth:110, textOverflow:"ellipsis" }}>
            {steps.map(step => (
              <option key={step.id} value={step.id}>{step.name || "Stage"}</option>
            ))}
          </select>
          {/* Forward */}
          <button onClick={() => nextStep && onMove(link.id, nextStep)}
            disabled={!nextStep}
            title={nextStep ? `${nextStep.name} →` : "Last stage"}
            style={{ width:22, height:22, borderRadius:6, background: nextStep ? "#7c3aed" : "#f3f4f6",
              border:`1px solid ${nextStep ? "#6d28d9" : "#e5e7eb"}`,
              color: nextStep ? "white" : "#d1d5db", cursor: nextStep ? "pointer" : "default",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, padding:0 }}>
            ›
          </button>
        </div>
      )}
      {steps.length === 0 && link.stage_name && (
        <span style={{ fontSize:11, color:C.text3, fontStyle:"italic" }}>{link.stage_name}</span>
      )}
      {/* Navigate to person */}
      {onNavigate && link.person_record_id && (
        <button onClick={() => onNavigate(link.person_record_id, null)}
          title="Open person record"
          style={{ background:"none", border:"none", cursor:"pointer", padding:4, flexShrink:0, opacity:0.45 }}
          onMouseEnter={e=>e.currentTarget.style.opacity=1}
          onMouseLeave={e=>e.currentTarget.style.opacity=0.45}>
          <Ic n="arrowRight" s={13} c={C.accent}/>
        </button>
      )}
      {/* Remove */}
      <button onClick={() => onRemove(link.id)}
        style={{ background:"none", border:"none", cursor:"pointer", padding:4, flexShrink:0, opacity:0.35 }}
        title="Remove from pipeline"
        onMouseEnter={e=>e.currentTarget.style.opacity=1}
        onMouseLeave={e=>e.currentTarget.style.opacity=0.35}>
        <Ic n="x" s={12} c={C.red}/>
      </button>
    </div>
  );
}

// ─── LinkedRecordsPanel ───────────────────────────────────────────────────────
// Shown on a Person record. Shows all objects this person is linked to across
// all pipelines, with stage dropdown and ability to link to new records.
export function LinkedRecordsPanel({ record, environment, onNavigate }) {
  const [links, setLinks]             = useState([]);
  const [allObjects, setAllObjects]   = useState([]);
  const [allRecords, setAllRecords]   = useState([]);       // for link-to-new modal
  const [loading, setLoading]         = useState(true);
  const [filterType, setFilterType]   = useState("all");    // object id or "all"
  const [addingLink, setAddingLink]   = useState(false);
  const [addSearch, setAddSearch]     = useState("");
  const [addObjFilter, setAddObjFilter] = useState("");

  const load = async () => {
    if (!record?.id || !environment?.id) return;
    setLoading(true);
    const [lks, objs] = await Promise.all([
      api.get(`/workflows/people-links?person_record_id=${record.id}`),
      api.get(`/objects?environment_id=${environment.id}`),
    ]);
    setLinks(Array.isArray(lks) ? lks : []);
    setAllObjects(Array.isArray(objs) ? objs : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [record?.id, environment?.id]);

  const loadRecordsForLinking = async () => {
    const nonPersonObjs = allObjects.filter(o => o.name !== "Person");
    const results = [];
    for (const obj of nonPersonObjs) {
      const recs = await api.get(`/records?object_id=${obj.id}&environment_id=${environment.id}&limit=200`);
      (recs.records || []).forEach(r => results.push({ ...r, object_name: obj.name, object_color: obj.color }));
    }
    setAllRecords(results);
  };

  const openAddLink = async () => {
    await loadRecordsForLinking();
    setAddSearch(""); setAddObjFilter("");
    setAddingLink(true);
  };

  const linkToRecord = async (targetRecord) => {
    const existing = links.find(l => l.target_record_id === targetRecord.id);
    if (existing) { setAddingLink(false); return; }
    // Require the target to have a Linked Person workflow with at least one stage
    const assignments = await api.get(`/workflows/assignments?record_id=${targetRecord.id}`);
    const plAssignment = (Array.isArray(assignments) ? assignments : []).find(a => a.type === "people_link");
    const wfSteps = plAssignment?.workflow?.steps || [];
    if (!plAssignment || wfSteps.length === 0) {
      alert(`"${recLabel(targetRecord)}" doesn't have a Linked Person workflow with stages assigned. Set one up in that record's Pipeline panel first.`);
      return;
    }
    const firstStep = wfSteps[0];
    await api.post("/workflows/people-links", {
      person_record_id: record.id,
      target_record_id: targetRecord.id,
      target_object_id: targetRecord.object_id,
      stage_id:   firstStep?.id   || null,
      stage_name: firstStep?.name || "Linked",
      environment_id: environment.id,
    });
    setAddingLink(false);
    await load();
  };

  const moveStage = async (linkId, step) => {
    await api.patch(`/workflows/people-links/${linkId}`, { stage_id: step.id, stage_name: step.name });
    setLinks(ls => ls.map(l => l.id === linkId ? { ...l, stage_id: step.id, stage_name: step.name } : l));
  };

  const removeLink = async (linkId) => {
    if (!confirm("Remove this link?")) return;
    await api.delete(`/workflows/people-links/${linkId}`);
    setLinks(ls => ls.filter(l => l.id !== linkId));
  };

  // Distinct object types in current links for filter pills
  const linkedObjectTypes = [...new Set(links.map(l => l.target_object_name).filter(Boolean))];

  const filteredLinks = filterType === "all" ? links : links.filter(l => l.target_object_name === filterType);

  // Records available to link (exclude already linked)
  const linkedTargetIds = new Set(links.map(l => l.target_record_id));
  const nonPersonObjs = allObjects.filter(o => o.name !== "Person");
  const filteredAddRecords = allRecords.filter(r => {
    if (linkedTargetIds.has(r.id)) return false;
    if (addObjFilter && r.object_id !== addObjFilter) return false;
    if (!addSearch) return true;
    const d = r.data || {};
    const label = [d.job_title, d.pool_name, d.name, d.first_name].filter(Boolean).join(" ").toLowerCase();
    return label.includes(addSearch.toLowerCase());
  });

  const recLabel = (r) => {
    const d = r.data || {};
    return d.job_title || d.pool_name || d.name || d.first_name || r.id.slice(0,8);
  };

  if (loading) return <div style={{ padding:"20px 0", textAlign:"center", color:C.text3, fontSize:13 }}>Loading…</div>;

  return (
    <div style={{ fontFamily:F, display:"flex", flexDirection:"column", gap:12 }}>

      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ flex:1, fontSize:12, color:C.text3 }}>
          {links.length === 0 ? "Not linked to any records yet." : `Linked to ${links.length} record${links.length!==1?"s":""}.`}
        </div>
        <button onClick={openAddLink}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 13px", borderRadius:9,
            border:`1.5px solid ${C.accent}`, background:C.accentLight, color:C.accent,
            fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:F }}>
          <Ic n="plus" s={12}/> Link to Record
        </button>
      </div>

      {/* Object type filter pills */}
      {linkedObjectTypes.length > 1 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["all", ...linkedObjectTypes].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight: filterType===t ? 700 : 500,
                border:`1.5px solid ${filterType===t ? C.accent : C.border}`,
                background: filterType===t ? C.accentLight : "transparent",
                color: filterType===t ? C.accent : C.text2, cursor:"pointer", fontFamily:F }}>
              {t === "all" ? `All (${links.length})` : t}
            </button>
          ))}
        </div>
      )}

      {/* Links list */}
      {filteredLinks.length === 0 && links.length > 0 && (
        <div style={{ textAlign:"center", padding:"12px", color:C.text3, fontSize:12 }}>No records of this type.</div>
      )}
      {filteredLinks.length === 0 && links.length === 0 && (
        <div style={{ textAlign:"center", padding:"28px 0", color:C.text3, fontSize:13 }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🔗</div>
          <div style={{ fontWeight:600, marginBottom:4 }}>No linked records</div>
          <div style={{ fontSize:12 }}>Link this person to a job, talent pool, or any other record.</div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filteredLinks.map(link => {
          const steps = link.workflow_steps || [];
          const currentStep = steps.find(s => s.id === link.stage_id);
          const objColor = link.target_object_color || C.accent;
          return (
            <div key={link.id} style={{ background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
              {/* Object type colour dot */}
              <div style={{ width:36, height:36, borderRadius:10, background:`${objColor}18`,
                border:`1.5px solid ${objColor}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontSize:14, fontWeight:800, color:objColor }}>{link.target_object_name?.charAt(0)||"?"}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {link.target_title || "Record"}
                </div>
                <div style={{ fontSize:11, color:C.text3 }}>{link.target_object_name}</div>
              </div>
              {/* Stage dropdown */}
              {steps.length > 0 ? (
                <select value={link.stage_id || steps[0]?.id || ""}
                  onChange={e => { const s = steps.find(st => st.id === e.target.value); if(s) moveStage(link.id, s); }}
                  style={{ padding:"5px 10px", borderRadius:20, fontSize:11, fontWeight:600,
                    border:`1.5px solid #e9d5ff`, background:"#f5f3ff", color:"#7c3aed",
                    cursor:"pointer", fontFamily:F, outline:"none" }}>
                  {steps.map(step => (
                    <option key={step.id} value={step.id}>{step.name || "Stage"}</option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize:11, color:C.text3, padding:"4px 10px",
                  border:`1px solid ${C.border}`, borderRadius:20, whiteSpace:"nowrap" }}>
                  {link.stage_name || "Linked"}
                </span>
              )}
              {/* Navigate to target record */}
              {onNavigate && link.target_record_id && (
                <button onClick={() => onNavigate(link.target_record_id, null)}
                  title={`Open ${link.target_object_name} record`}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:4, flexShrink:0, opacity:0.5 }}
                  onMouseEnter={e=>e.currentTarget.style.opacity=1}
                  onMouseLeave={e=>e.currentTarget.style.opacity=0.5}>
                  <Ic n="arrowRight" s={13} c={C.accent}/>
                </button>
              )}
              {/* Remove */}
              <button onClick={() => removeLink(link.id)}
                style={{ background:"none", border:"none", cursor:"pointer", padding:4, flexShrink:0, opacity:0.4 }}
                onMouseEnter={e=>e.currentTarget.style.opacity=1}
                onMouseLeave={e=>e.currentTarget.style.opacity=0.4}>
                <Ic n="x" s={12} c={C.red}/>
              </button>
            </div>
          );
        })}
      </div>

      {/* Link to record modal */}
      {addingLink && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:2000,
          display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setAddingLink(false)}>
          <div style={{ background:C.surface, borderRadius:16, width:480, maxHeight:"75vh",
            display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center" }}>
              <span style={{ fontWeight:800, fontSize:14, color:C.text1, flex:1 }}>Link to a Record</span>
              <button onClick={()=>setAddingLink(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><Ic n="x" s={16} c={C.text3}/></button>
            </div>
            <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:8 }}>
              <input autoFocus value={addSearch} onChange={e=>setAddSearch(e.target.value)}
                placeholder="Search records…"
                style={{ flex:1, padding:"8px 12px", border:`1.5px solid ${C.border}`,
                  borderRadius:9, fontSize:13, fontFamily:F, outline:"none", color:C.text1 }}/>
              <select value={addObjFilter} onChange={e=>setAddObjFilter(e.target.value)}
                style={{ padding:"8px 10px", border:`1.5px solid ${C.border}`, borderRadius:9,
                  fontSize:12, fontFamily:F, outline:"none", background:"white", color:C.text2 }}>
                <option value="">All types</option>
                {nonPersonObjs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              {filteredAddRecords.length === 0 && (
                <div style={{ padding:"24px", textAlign:"center", color:C.text3, fontSize:13 }}>
                  {addSearch ? "No matching records" : "No records available to link"}
                </div>
              )}
              {filteredAddRecords.map((r, i) => {
                const label = recLabel(r);
                const col   = r.object_color || C.accent;
                return (
                  <div key={r.id} onClick={() => linkToRecord(r)}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px",
                      cursor:"pointer", borderBottom: i < filteredAddRecords.length-1 ? `1px solid ${C.border}` : "none" }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.accentLight}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ width:34, height:34, borderRadius:9, background:`${col}18`, border:`1.5px solid ${col}30`,
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:13, fontWeight:800, color:col }}>{label.charAt(0).toUpperCase()}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{label}</div>
                      <div style={{ fontSize:11, color:C.text3 }}>{r.object_name}</div>
                    </div>
                    <span style={{ fontSize:11, color:C.accent, fontWeight:600 }}>+ Link</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
