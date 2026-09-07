// client/src/portals/FormFillPage.jsx
// Public, tokenised form-fill page — a recipient clicks their emailed link
// and lands here, no login required. Same visual conventions as
// ApprovalPortal.jsx: branded via the environment's default brand kit,
// falls back to Vercentic's own look when there isn't one.

import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";
const F = "'Geist','Inter',-apple-system,sans-serif";

const PATHS = {
  check:   "M20 6L9 17l-5-5",
  warning: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};
function Ic({ n, s = 18, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[n]}/></svg>;
}

// ── Field renderer — mirrors Forms.jsx's internal FormField exactly, kept as
// its own standalone copy since this page has zero dependency on the admin
// bundle (same convention as every other public page in this app). ─────────
function FieldInput({ field, value, onChange, primary }) {
  const inp = { width:"100%", boxSizing:"border-box", padding:"10px 12px", borderRadius:9,
    border:`1.5px solid ${field.required && !value ? "#fca5a5" : "#e5e7eb"}`,
    fontSize:14, fontFamily:F, color:"#0f1729", outline:"none" };

  if (field.field_type === "section") return (
    <div style={{ borderBottom:"2px solid #e5e7eb", paddingBottom:6, marginBottom:14, marginTop:20 }}>
      <span style={{ fontSize:14, fontWeight:800, color:"#0f1729" }}>{field.label}</span>
    </div>
  );

  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#475569", marginBottom:6 }}>
        {field.label}{field.required && <span style={{ color:"#dc2626" }}> *</span>}
      </label>
      {field.field_type === "textarea" && (
        <textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={4} placeholder={field.placeholder} style={{...inp, resize:"vertical"}}/>
      )}
      {["text","email","phone","url","number","currency"].includes(field.field_type) && (
        <input type={["number","currency"].includes(field.field_type)?"number":field.field_type==="email"?"email":"text"}
          value={value||""} onChange={e=>onChange(e.target.value)} placeholder={field.placeholder} style={inp}/>
      )}
      {field.field_type === "date" && <input type="date" value={value||""} onChange={e=>onChange(e.target.value)} style={inp}/>}
      {field.field_type === "boolean" && (
        <div style={{ display:"flex", gap:10 }}>
          {["Yes","No"].map(opt=>(
            <button key={opt} type="button" onClick={()=>onChange(opt)}
              style={{ padding:"9px 24px", borderRadius:9, border:`1.5px solid ${value===opt?primary:"#e5e7eb"}`,
                background:value===opt?`${primary}14`:"white", color:value===opt?primary:"#374151",
                fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:F }}>{opt}</button>
          ))}
        </div>
      )}
      {field.field_type === "rating" && (
        <div style={{ display:"flex", gap:5 }}>
          {[1,2,3,4,5].map(n=>(
            <button key={n} type="button" onClick={()=>onChange(n)} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
              <Ic n="star" s={26} c={n<=(value||0)?"#f59e0b":"#d1d5db"}/>
            </button>
          ))}
        </div>
      )}
      {field.field_type === "select" && (
        <select value={value||""} onChange={e=>onChange(e.target.value)} style={inp}>
          <option value="">Select…</option>
          {(field.options||[]).map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {field.field_type === "multi_select" && (
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          {(field.options||[]).map(o=>{
            const sel = (value||[]).includes(o);
            return (
              <button key={o} type="button" onClick={()=>onChange(sel?(value||[]).filter(v=>v!==o):[...(value||[]),o])}
                style={{ padding:"6px 14px", borderRadius:99, border:`1.5px solid ${sel?primary:"#e5e7eb"}`,
                  background:sel?`${primary}14`:"white", color:sel?primary:"#374151",
                  fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F }}>{o}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FormFillPage() {
  const token = window.location.pathname.split("/").filter(Boolean)[1];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError("Invalid form link."); setLoading(false); return; }
    fetch(`${API_BASE}/api/form-sends/token/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
        if (d.send.status === "completed") setDone(true);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    const missing = (data.form.fields||[]).filter(f => f.required && f.field_type!=="section" && !formData[f.api_key]);
    if (missing.length) { window.alert?.(`Please fill in: ${missing.map(f=>f.label).join(", ")}`) || alert(`Please fill in: ${missing.map(f=>f.label).join(", ")}`); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/api/form-sends/token/${token}/submit`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ data: formData }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setDone(true);
    } catch(e) { alert("Something went wrong: " + e.message); }
    setSubmitting(false);
  };

  const page = { minHeight:"100vh", background:"linear-gradient(135deg,#eef2ff 0%,#f5f3ff 50%,#f0f9ff 100%)", fontFamily:F };
  const card = { background:"white", borderRadius:16, border:"1px solid #e8ecf8", padding:"28px 28px 32px", boxShadow:"0 2px 12px rgba(67,97,238,.04)" };

  if (loading) return <div style={page}><div style={{ textAlign:"center", padding:"80px 0", color:"#94a3b8", fontSize:14, fontWeight:600 }}>Loading…</div></div>;

  if (error) return (
    <div style={page}>
      <div style={{ maxWidth:480, margin:"60px auto", padding:"0 20px" }}>
        <div style={card}>
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:"#fee2e2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}><Ic n="warning" s={26} c="#dc2626"/></div>
            <div style={{ fontSize:18, fontWeight:700, color:"#0f1729", marginBottom:8 }}>Can't load this form</div>
            <div style={{ fontSize:14, color:"#64748b", lineHeight:1.6 }}>{error}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const { form, brand, send } = data;
  const primary = brand?.primary_color || "#4361EE";
  const pageFont = brand?.font_family ? `'${brand.font_family.replace(/['"]/g,'').split(',')[0].trim()}', ${F}` : F;

  return (
    <div style={{...page, fontFamily:pageFont}}>
      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid #e8ecf8", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt={brand.company_name||""} style={{ height:28, maxWidth:140, objectFit:"contain" }}/>
          ) : (
            <>
              <div style={{ width:32, height:32, borderRadius:8, background:"#0f1729", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"white" }}>V</div>
              <span style={{ fontSize:16, fontWeight:800, color:"#0f1729", letterSpacing:"-0.3px" }}>Vercentic</span>
            </>
          )}
        </div>
        <div style={{ fontSize:13, color:"#94a3b8" }}>{send.record_name}</div>
      </div>

      <div style={{ maxWidth:640, margin:"0 auto", padding:"32px 20px 64px" }}>
        {done ? (
          <div style={card}>
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ width:64, height:64, borderRadius:"50%", background:"#dcfce7", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}><Ic n="check" s={30} c="#16a34a"/></div>
              <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"#0f1729" }}>Thank you!</h2>
              <p style={{ margin:0, fontSize:14, color:"#64748b", lineHeight:1.6 }}>Your response to <strong>{form.name}</strong> has been submitted. You can close this window.</p>
            </div>
          </div>
        ) : (
          <div style={card}>
            <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
              {send.context_record_title ? `For: ${send.context_record_title}` : "Please complete"}
            </div>
            <h1 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800, color:"#0f1729", letterSpacing:"-0.4px" }}>{form.name}</h1>
            {form.description && <p style={{ margin:"0 0 24px", fontSize:14, color:"#64748b", lineHeight:1.6 }}>{form.description}</p>}

            {(form.fields||[]).map((field,i) => (
              <FieldInput key={field.id||i} field={field} value={formData[field.api_key]}
                onChange={v=>setFormData(prev=>({...prev,[field.api_key]:v}))} primary={primary}/>
            ))}

            <button onClick={handleSubmit} disabled={submitting}
              style={{ width:"100%", marginTop:8, padding:"14px 20px", borderRadius:10, border:"none",
                background:primary, color:"white", fontSize:15, fontWeight:700, cursor:"pointer",
                fontFamily:"inherit", opacity:submitting?0.7:1 }}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
