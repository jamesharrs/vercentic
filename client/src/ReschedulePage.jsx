import { useState, useEffect } from "react";
const F = "'DM Sans',-apple-system,sans-serif";
export default function ReschedulePage() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const interviewId = parts[1], token = parts[2];
  const role = new URLSearchParams(window.location.search).get("role") || "candidate";
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!interviewId || !token) { setError("Invalid link"); setLoading(false); return; }
    fetch(`/api/interviews/reschedule/${interviewId}/${token}`)
      .then(r => r.json()).then(d => { if (d.error) setError(d.error); else setInterview(d); setLoading(false); })
      .catch(() => { setError("Failed to load interview details"); setLoading(false); });
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    const resp = await fetch(`/api/interviews/reschedule/${interviewId}/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, time: newTime, message }),
    });
    const data = await resp.json();
    if (data.ok) setSubmitted(true); else setError(data.message || "Failed to submit");
    setSubmitting(false);
  };

  const inp = { width:"100%", boxSizing:"border-box", padding:"10px 14px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:14, fontFamily:F, outline:"none", color:"#111827" };

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4ff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F, padding:24 }}>
      <div style={{ width:"100%", maxWidth:480 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"#4361EE", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
            <span style={{ color:"white", fontWeight:900, fontSize:20 }}>V</span>
          </div>
          <div style={{ fontSize:13, color:"#6b7280" }}>Vercentic</div>
        </div>
        <div style={{ background:"white", borderRadius:16, padding:"32px", boxShadow:"0 4px 24px rgba(0,0,0,.08)" }}>
          {loading && <div style={{ textAlign:"center", padding:40, color:"#9ca3af" }}>Loading…</div>}
          {error && !loading && (
            <div style={{ textAlign:"center", padding:40 }}>
              <div style={{ width:56, height:56, borderRadius:16, background:"#fff7ed", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="m10.29 3.86-8.5 14.74A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.71-3.04l-8.5-14.74a2 2 0 0 0-3.42.64z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:"#f59e0b", marginBottom:8 }}>Invalid link</div>
              <div style={{ fontSize:14, color:"#6b7280" }}>{error}</div>
            </div>
          )}
          {submitted && (
            <div style={{ textAlign:"center", padding:40 }}>
              <div style={{ width:56, height:56, borderRadius:16, background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:"#111827", marginBottom:8 }}>Request submitted</div>
              <div style={{ fontSize:14, color:"#6b7280", lineHeight:1.6 }}>The team will confirm your new time shortly.</div>
            </div>
          )}
          {interview && !submitted && (
            <>
              <h2 style={{ margin:"0 0 4px", fontSize:20, fontWeight:700, color:"#111827" }}>Request reschedule</h2>
              <p style={{ margin:"0 0 24px", fontSize:14, color:"#6b7280" }}>Let us know when works better for you.</p>
              <div style={{ padding:"14px 16px", background:"#f9fafb", borderRadius:10, marginBottom:24, fontSize:13 }}>
                <div style={{ fontWeight:700, color:"#111827", marginBottom:8 }}>Current interview</div>
                <div style={{ color:"#374151", display:"grid", gridTemplateColumns:"auto 1fr", gap:"4px 16px" }}>
                  <span style={{ color:"#9ca3af" }}>Candidate</span><span>{interview.candidate_name}</span>
                  {interview.job_name && <><span style={{ color:"#9ca3af" }}>Role</span><span>{interview.job_name}</span></>}
                  <span style={{ color:"#9ca3af" }}>Date</span><span>{interview.date}</span>
                  <span style={{ color:"#9ca3af" }}>Time</span><span>{interview.time}</span>
                  <span style={{ color:"#9ca3af" }}>Format</span><span>{interview.format}</span>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 }}>Preferred date</label>
                    <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} min={new Date().toISOString().slice(0,10)} style={inp}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 }}>Preferred time</label>
                    <input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} style={inp}/>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 }}>Message (optional)</label>
                  <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Let us know why you'd like to reschedule…" rows={3} style={{ ...inp, resize:"vertical" }}/>
                </div>
                <button onClick={handleSubmit} disabled={submitting||!newDate}
                  style={{ padding:"12px 24px", background:submitting||!newDate?"#e5e7eb":"#4361EE", color:submitting||!newDate?"#9ca3af":"white", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:submitting||!newDate?"not-allowed":"pointer", fontFamily:F }}>
                  {submitting ? "Submitting…" : "Submit reschedule request"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
