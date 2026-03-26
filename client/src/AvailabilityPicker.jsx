import { useState, useEffect } from "react";

const F = "'Geist', -apple-system, sans-serif";

export default function AvailabilityPicker() {
  const token = window.location.pathname.split("/availability/")[1];
  const [req, setReq]       = useState(null);
  const [selected, setSelected] = useState([]);
  const [status, setStatus]   = useState("loading"); // loading | ready | expired | submitted | error
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage]  = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    fetch(`/api/interview-coordinator/token/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        if (d.status === "responded") { setStatus("already_responded"); return; }
        setReq(d);
        setStatus("ready");
      })
      .catch(code => setStatus(code === 410 ? "expired" : "error"));
  }, [token]);

  const toggleSlot = (slot) =>
    setSelected(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);

  const submit = async () => {
    if (!selected.length) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/interview-coordinator/token/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_slots: selected, message }),
      });
      const d = await r.json();
      if (r.ok) setStatus("submitted");
      else throw new Error(d.error || "Failed");
    } catch(e) { window.__toast?.alert("Something went wrong: " + e.message); }
    setSubmitting(false);
  };

  // Group slots by date
  const grouped = {};
  (req?.proposed_slots || []).forEach(iso => {
    const d = new Date(iso);
    const key = d.toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(iso);
  });

  const fmt = iso => new Date(iso).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });

  if (status === "loading") return <Screen><Spinner/></Screen>;
  if (status === "expired")  return <Screen><StatusCard icon="⏰" title="Link expired" sub="This availability request has expired. Please contact the recruiter." color="#ef4444"/></Screen>;
  if (status === "already_responded") return <Screen><StatusCard icon="✓" title="Already submitted" sub="Your availability has already been recorded. We'll be in touch soon!" color="#0ca678"/></Screen>;
  if (status === "submitted") return <Screen><StatusCard icon="🎉" title="Thank you!" sub="Your availability has been submitted. We'll confirm the interview time shortly." color="#7c3aed"/></Screen>;
  if (status === "error" || !req) return <Screen><StatusCard icon="⚠️" title="Not found" sub="This link is invalid or has already been used." color="#6b7280"/></Screen>;

  const isHM = req.type === "hiring_manager";
  const accent = "#7c3aed";

  return (
    <Screen>
      <div style={{ maxWidth:560, width:"100%", margin:"0 auto", padding:"0 16px" }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:`${accent}18`,
            display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h1 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800, color:"#111827", fontFamily:F }}>
            {isHM ? "Your interview availability" : "Select your availability"}
          </h1>
          <p style={{ margin:0, fontSize:14, color:"#6b7280", lineHeight:1.6, fontFamily:F }}>
            {req.message}
          </p>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginTop:12,
            background:"#f3f4f6", borderRadius:8, padding:"6px 12px" }}>
            <span style={{ fontSize:12, color:"#6b7280", fontFamily:F }}>
              📋 <strong>{req.job_title}</strong>
              {req.duration_minutes ? ` · ${req.duration_minutes} min interview` : ""}
            </span>
          </div>
        </div>

        {/* Slot grid */}
        <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
          {Object.entries(grouped).map(([date, slots]) => (
            <div key={date} style={{ background:"white", borderRadius:14, border:"1px solid #e5e7eb",
              overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
              <div style={{ padding:"10px 16px", background:"#f9fafb", borderBottom:"1px solid #e5e7eb",
                fontSize:13, fontWeight:700, color:"#374151", fontFamily:F }}>
                {date}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, padding:"12px 16px" }}>
                {slots.map(slot => {
                  const on = selected.includes(slot);
                  return (
                    <button key={slot} onClick={() => toggleSlot(slot)}
                      style={{ padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600,
                        border:`2px solid ${on ? accent : "#e5e7eb"}`,
                        background: on ? accent : "white",
                        color: on ? "white" : "#374151",
                        cursor:"pointer", fontFamily:F, transition:"all .12s",
                        display:"flex", alignItems:"center", gap:6 }}>
                      {on && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>}
                      {fmt(slot)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Optional message */}
        <div style={{ marginBottom:20 }}>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Any notes or constraints? (optional)"
            rows={2}
            style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid #e5e7eb",
              fontSize:13, fontFamily:F, color:"#111827", resize:"vertical", outline:"none",
              boxSizing:"border-box", transition:"border-color .12s" }}
            onFocus={e => e.target.style.borderColor=accent}
            onBlur={e => e.target.style.borderColor="#e5e7eb"}/>
        </div>

        {/* Submit */}
        <button onClick={submit} disabled={!selected.length || submitting}
          style={{ width:"100%", padding:"14px", borderRadius:12, border:"none",
            background: selected.length ? accent : "#e5e7eb",
            color: selected.length ? "white" : "#9ca3af",
            fontSize:15, fontWeight:700, cursor: selected.length ? "pointer" : "default",
            fontFamily:F, transition:"all .15s" }}>
          {submitting ? "Submitting…"
            : selected.length ? `Submit ${selected.length} slot${selected.length!==1?"s":""}` 
            : "Select at least one slot"}
        </button>

        <p style={{ textAlign:"center", fontSize:11, color:"#9ca3af", marginTop:12, fontFamily:F }}>
          Powered by Vercentic · Your information is handled securely
        </p>
      </div>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div style={{ minHeight:"100vh", background:"#f4f5f8", display:"flex", alignItems:"center",
      justifyContent:"center", padding:"24px 0", fontFamily:F }}>
      {children}
    </div>
  );
}

function Spinner() {
  return <div style={{ width:32, height:32, border:"3px solid #e5e7eb", borderTopColor:"#7c3aed",
    borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>;
}

function StatusCard({ icon, title, sub, color }) {
  return (
    <div style={{ textAlign:"center", padding:"40px 32px", background:"white", borderRadius:20,
      boxShadow:"0 4px 24px rgba(0,0,0,.08)", maxWidth:400 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>{icon}</div>
      <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"#111827", fontFamily:F }}>{title}</h2>
      <p style={{ margin:0, fontSize:14, color:"#6b7280", lineHeight:1.6, fontFamily:F }}>{sub}</p>
    </div>
  );
}
