// portal-renderer/src/BotInterview.jsx
// Candidate-facing AI Interview Bot — conversational, token-gated, no login required

import { useState, useEffect, useRef } from "react";

// In the client app, API calls go through Vite proxy (/api → backend)
const API = "";

const TYPE_META = {
  knockout:   { label: "Eligibility",  color: "#dc2626", bg: "#fef2f2" },
  competency: { label: "Competency",   color: "#2563eb", bg: "#eff6ff" },
  technical:  { label: "Technical",    color: "#7c3aed", bg: "#f5f3ff" },
  culture:    { label: "Culture Fit",  color: "#059669", bg: "#ecfdf5" },
};

const ProgressBar = ({ current, total }) => (
  <div style={{ width: "100%", marginBottom: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12, color: "#6b7280" }}>
      <span>Question {current} of {total}</span>
      <span>{Math.round((current / total) * 100)}% complete</span>
    </div>
    <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2 }}>
      <div style={{ height: 4, background: "#4361ee", borderRadius: 2, width: `${(current / total) * 100}%`, transition: "width 0.4s ease" }} />
    </div>
  </div>
);

const TypeBadge = ({ type }) => {
  const m = TYPE_META[type] || { label: type, color: "#6b7280", bg: "#f3f4f6" };
  return <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{m.label}</span>;
};

const BotAvatar = ({ size = 32 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #4361ee, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <span style={{ color: "white", fontSize: size * 0.38, fontWeight: 700 }}>AI</span>
  </div>
);

const InfoCard = ({ icon, label, value }) => (
  <div style={{ background: "white", borderRadius: 10, padding: "12px 14px", border: "1px solid #e5e7eb" }}>
    <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{value}</div>
  </div>
);

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)", fontFamily: "'Geist', -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "white", borderBottom: "1px solid #e5e7eb", padding: "14px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #4361ee, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "white", fontSize: 13, fontWeight: 900 }}>T</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Vercentic Interview</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>Powered by AI</span>
      </div>
      <div style={{ flex: 1, padding: "32px 24px", maxWidth: 720, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

export default function BotInterview({ token }) {
  const [phase, setPhase] = useState("loading");
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 1, total: 1 });
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!token) { setPhase("error"); setError("No session token found."); return; }
    fetch(`${API}/api/bot/sessions/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setPhase("error"); setError(data.error); return; }
        setSession(data);
        setCurrentQuestion(data.next_question);
        setProgress({ current: 1, total: data.total_questions });
        if (data.status === "completed") setPhase("completed");
        else if (data.status === "knocked_out") setPhase("knocked_out");
        else if (data.status === "in_progress") { setPhase("in_progress"); setProgress({ current: data.current_question_index + 1, total: data.total_questions }); }
        else setPhase("welcome");
      })
      .catch(() => { setPhase("error"); setError("Could not load the interview session. Please check your link."); });
  }, [token]);

  useEffect(() => {
    if (phase === "in_progress" && textareaRef.current) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [currentQuestion, phase]);

  const startSession = async () => {
    try { await fetch(`${API}/api/bot/sessions/${token}/start`, { method: "POST" }); setPhase("in_progress"); }
    catch { setError("Failed to start session."); }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    const prevQ = currentQuestion; const prevA = answer.trim();
    setMessages(m => [...m, { type: "question", text: prevQ.text, qtype: prevQ.type }, { type: "answer", text: prevA }]);
    setAnswer("");
    try {
      const res = await fetch(`${API}/api/bot/sessions/${token}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: prevA }) });
      const data = await res.json();
      if (data.status === "knocked_out") setPhase("knocked_out");
      else if (data.status === "completed") setPhase("completed");
      else { setCurrentQuestion(data.next_question); if (data.progress) setProgress({ current: data.progress.current, total: data.progress.total }); }
    } catch { setError("Failed to submit answer. Please try again."); }
    finally { setSubmitting(false); }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitAnswer(); };

  if (phase === "loading") return <Shell><div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 16 }}><div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#4361ee", animation: "spin 0.7s linear infinite" }}/><p style={{ color: "#6b7280", fontSize: 14 }}>Loading your interview session…</p><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div></Shell>;
  if (phase === "error") return <Shell><div style={{ textAlign: "center", padding: "48px 24px" }}><h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Session not found</h2><p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>{error || "This interview link may have expired. Please contact your recruiter."}</p></div></Shell>;

  if (phase === "welcome") return (
    <Shell>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <BotAvatar size={64} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "16px 0 8px", textAlign: "center" }}>Hi{session?.candidate_name ? `, ${session.candidate_name.split(" ")[0]}` : ""}! 👋</h1>
          <p style={{ fontSize: 15, color: "#6b7280", textAlign: "center", lineHeight: 1.6, maxWidth: 440 }}>I'm the Vercentic interview assistant. I'll ask you a few questions to help the hiring team get to know you better.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          <InfoCard icon="⏱" label="Estimated time" value="10–20 minutes" />
          <InfoCard icon="📝" label="Questions" value={`${session?.total_questions || "—"} questions`} />
          <InfoCard icon="💬" label="Format" value="Text responses" />
          <InfoCard icon="🔒" label="Privacy" value="Shared with hiring team only" />
        </div>
        <div style={{ background: "#f0f4ff", borderRadius: 12, padding: "16px 18px", marginBottom: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#4361ee", margin: "0 0 8px" }}>Tips for a great response</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
            <li>Use specific examples where possible</li>
            <li>Be honest and genuine — there are no trick questions</li>
            <li>Take your time; quality matters more than speed</li>
            <li>Press <kbd style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>Ctrl+Enter</kbd> to submit</li>
          </ul>
        </div>
        <button onClick={startSession} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #4361ee, #7c3aed)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(67,97,238,0.35)" }}>Begin Interview →</button>
      </div>
    </Shell>
  );

  if (phase === "knocked_out") return <Shell><div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", padding: "40px 0" }}><div style={{ fontSize: 56, marginBottom: 20 }}>🤝</div><h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Thank you for your time</h2><p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.7 }}>Based on your responses, we aren't able to move forward at this time. We appreciate you taking the time to complete the screening and wish you the very best in your search.</p></div></Shell>;

  if (phase === "completed") return (
    <Shell>
      <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", padding: "40px 0" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #4361ee, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 36, color: "white", boxShadow: "0 8px 24px rgba(67,97,238,0.3)" }}>✓</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Interview Complete!</h2>
        <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.7, marginBottom: 28 }}>Thank you for completing the pre-screen{session?.candidate_name ? `, ${session.candidate_name.split(" ")[0]}` : ""}. Your responses have been submitted to the hiring team.</p>
        <div style={{ background: "#f0f4ff", borderRadius: 12, padding: "16px 18px", textAlign: "left", border: "1px solid #e0e7ff" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#4361ee", margin: "0 0 8px" }}>What happens next</p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#374151", lineHeight: 1.9 }}>
            <li>The hiring team will review your responses</li>
            <li>You'll hear back within the timeframe shared by your recruiter</li>
          </ul>
        </div>
      </div>
    </Shell>
  );

  // in_progress
  return (
    <Shell>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        {session?.config?.show_progress !== false && <ProgressBar current={progress.current} total={progress.total} />}
        {messages.slice(-4).map((m, i) => (
          <div key={i} style={{ marginBottom: 8, padding: "10px 14px", borderRadius: 10, background: m.type === "question" ? "#f8faff" : "#f9fafb", border: m.type === "question" ? "1px solid #e0e7ff" : "1px solid #f3f4f6", fontSize: 13 }}>
            {m.type === "question" && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><BotAvatar size={20} /><TypeBadge type={m.qtype} /></div>}
            <p style={{ margin: 0, color: m.type === "question" ? "#374151" : "#6b7280", lineHeight: 1.5 }}>{m.text}</p>
          </div>
        ))}
        {currentQuestion && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ background: "white", borderRadius: 16, padding: "24px", border: "1.5px solid #e0e7ff", boxShadow: "0 2px 12px rgba(67,97,238,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><BotAvatar size={32} /><TypeBadge type={currentQuestion.type} /></div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", lineHeight: 1.6, margin: 0 }}>{currentQuestion.text}</p>
            </div>
          </div>
        )}
        {currentQuestion?.type === "knockout" && currentQuestion?.options ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {currentQuestion.options.map(opt => (
              <button key={opt} onClick={() => { setAnswer(opt); setTimeout(() => { if (opt) { setSubmitting(true); setMessages(m => [...m, { type: "question", text: currentQuestion.text, qtype: currentQuestion.type }, { type: "answer", text: opt }]); setAnswer(""); fetch(`${API}/api/bot/sessions/${token}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: opt }) }).then(r => r.json()).then(data => { if (data.status === "knocked_out") setPhase("knocked_out"); else if (data.status === "completed") setPhase("completed"); else { setCurrentQuestion(data.next_question); if (data.progress) setProgress({ current: data.progress.current, total: data.progress.total }); } }).finally(() => setSubmitting(false)); } }, 10); }}
                style={{ padding: "12px 24px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "white", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{opt}</button>
            ))}
          </div>
        ) : (
          <div>
            <textarea ref={textareaRef} value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your answer here… be specific and use real examples where possible" rows={5}
              style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "inherit", transition: "border-color 0.15s", boxSizing: "border-box", color: "#111827" }}
              onFocus={e => e.target.style.borderColor = "#4361ee"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{answer.length > 0 ? `${answer.length} chars` : "Ctrl+Enter to submit"}</span>
              <button onClick={submitAnswer} disabled={!answer.trim() || submitting} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: !answer.trim() || submitting ? "#e5e7eb" : "linear-gradient(135deg, #4361ee, #7c3aed)", color: !answer.trim() || submitting ? "#9ca3af" : "white", fontSize: 13, fontWeight: 700, cursor: !answer.trim() || submitting ? "not-allowed" : "pointer" }}>
                {submitting ? "Submitting…" : "Submit Answer →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
