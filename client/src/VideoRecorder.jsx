// client/src/VideoRecorder.jsx
// Public candidate-facing async video interview recorder
// Accessible at /video-interview/:token — no login required
// Uses MediaRecorder API for webcam capture

import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "";  // relative — proxied to backend by Vite / Vercel

const F = "'DM Sans','Space Grotesk',system-ui,sans-serif";
const ACCENT = "#4361EE";

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const api = {
  get:  p     => fetch(`${API_BASE}/api${p}`).then(r => r.json()),
  post: (p,b) => fetch(`${API_BASE}/api${p}`, { method:"POST",
    headers:{"Content-Type":"application/json"}, body:JSON.stringify(b) }).then(r => r.json()),
  postLarge: (p,b) => fetch(`${API_BASE}/api${p}`, { method:"POST",
    headers:{"Content-Type":"application/json"}, body:JSON.stringify(b) }),
};

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Shell / branding ──────────────────────────────────────────────────────────
function Shell({ children, company }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#EEF2FF 0%,#F5F3FF 100%)",
      fontFamily:F, display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white", borderBottom:"1px solid #E5E7EB", padding:"14px 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8,
            background:`linear-gradient(135deg,${ACCENT},#7C3AED)`,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"white", fontSize:13, fontWeight:900 }}>V</span>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:"#1A1A2E" }}>
            {company || "Video Interview"}
          </span>
        </div>
        <span style={{ fontSize:11, color:"#9CA3AF" }}>Powered by Vercentic</span>
      </div>
      <div style={{ flex:1, padding:"32px 24px", maxWidth:720, width:"100%",
        margin:"0 auto", boxSizing:"border-box" }}>
        {children}
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5,
        fontSize:12, color:"#6B7280" }}>
        <span>Question {current} of {total}</span>
        <span>{Math.round((current / total) * 100)}% complete</span>
      </div>
      <div style={{ height:5, background:"#E5E7EB", borderRadius:3 }}>
        <div style={{ height:5, background:ACCENT, borderRadius:3,
          width:`${(current/total)*100}%`, transition:"width .4s ease" }}/>
      </div>
    </div>
  );
}

// ── Countdown circle ──────────────────────────────────────────────────────────
function Countdown({ seconds, maxSeconds, color = ACCENT }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const pct  = maxSeconds > 0 ? seconds / maxSeconds : 0;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} fill="none" stroke="#E5E7EB" strokeWidth={4}/>
      <circle cx={36} cy={36} r={r} fill="none" stroke={pct > 0.33 ? color : "#EF4444"}
        strokeWidth={4} strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)} transform="rotate(-90 36 36)"
        style={{ transition:"stroke-dashoffset .5s, stroke .5s" }}/>
      <text x={36} y={36} textAnchor="middle" dominantBaseline="central"
        fontSize={16} fontWeight={700} fill={pct > 0.33 ? "#111827" : "#EF4444"}
        fontFamily={F}>{seconds}</text>
    </svg>
  );
}

// ── Camera preview with recording indicator ───────────────────────────────────
function CameraPreview({ videoRef, recording, muted = true }) {
  return (
    <div style={{ position:"relative", borderRadius:14, overflow:"hidden",
      background:"#111827", aspectRatio:"16/9" }}>
      <video ref={videoRef} autoPlay muted={muted} playsInline
        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
      {recording && (
        <div style={{ position:"absolute", top:12, left:12, display:"flex",
          alignItems:"center", gap:6, background:"rgba(0,0,0,.5)",
          borderRadius:99, padding:"4px 10px" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#EF4444",
            animation:"pulse 1.2s infinite" }}/>
          <span style={{ color:"white", fontSize:11, fontWeight:700 }}>REC</span>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}

// ── Main recorder component ───────────────────────────────────────────────────
export default function VideoRecorder({ token }) {
  const [phase, setPhase]         = useState("loading");
  // phases: loading | error | welcome | setup | think | recording | review | uploading | done | completed | expired
  const [session, setSession]     = useState(null);
  const [qIndex, setQIndex]       = useState(0);
  const [thinkLeft, setThinkLeft] = useState(0);
  const [recLeft, setRecLeft]     = useState(0);
  const [retakesLeft, setRetakesLeft] = useState(0);
  const [recordings, setRecordings]  = useState({});  // { [qi]: { blob, base64, transcript } }
  const [error, setError]         = useState("");
  const [camReady, setCamReady]   = useState(false);
  const [_uploading, setUploading] = useState(false);
  const [uploadPct, setUploadProgress] = useState(0);
  /* global MediaRecorder */

  const videoRef     = useRef(null);
  const mediaRef     = useRef(null);  // MediaRecorder
  const streamRef    = useRef(null);  // MediaStream
  const chunksRef    = useRef([]);
  const thinkTimer   = useRef(null);
  const recTimer     = useRef(null);

  // ── Load session ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setPhase("error"); setError("No interview token found."); return; }
    api.get(`/video-interviews/take/${token}`)
      .then(data => {
        if (data.error) { setPhase(data.error.includes("expired") ? "expired" : "error"); setError(data.error); return; }
        setSession(data);
        if (data.status === "completed") { setPhase("completed"); return; }
        setRetakesLeft(data.template_snapshot?.retakes_allowed ?? 1);
        setPhase("welcome");
      })
      .catch(() => { setPhase("error"); setError("Could not load your interview. Please check your link."); });
    return () => { clearInterval(thinkTimer.current); clearInterval(recTimer.current); };
  }, [token]);

  // ── Start camera ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamReady(true);
    } catch (e) {
      setError("Camera / microphone access is required. Please allow access and try again.");
    }
  }, []);

  const _stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamReady(false);
  }, []);

  // ── Think phase ─────────────────────────────────────────────────────────────
  const startThinkPhase = useCallback((qi) => {
    const q = session?.template_snapshot?.questions?.[qi];
    const think = q?.think_time || 30;
    setThinkLeft(think);
    setPhase("think");
    thinkTimer.current = setInterval(() => {
      setThinkLeft(prev => {
        if (prev <= 1) { clearInterval(thinkTimer.current); startRecording(qi); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [session]); // eslint-disable-line

  // ── Recording ───────────────────────────────────────────────────────────────
  const startRecording = useCallback((qi) => {
    if (!streamRef.current) return;
    const q = session?.template_snapshot?.questions?.[qi];
    const maxDur = q?.max_duration || 120;
    chunksRef.current = [];

    const mr = new MediaRecorder(streamRef.current,
      { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(200);
    mediaRef.current = mr;
    setRecLeft(maxDur);
    setPhase("recording");

    recTimer.current = setInterval(() => {
      setRecLeft(prev => {
        if (prev <= 1) { clearInterval(recTimer.current); stopRecording(qi, true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [session]); // eslint-disable-line

  const stopRecording = useCallback((qi, _autoStop = false) => {
    clearInterval(recTimer.current);
    if (!mediaRef.current || mediaRef.current.state === "inactive") return;
    mediaRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const base64 = await blobToBase64(blob);
      setRecordings(r => ({ ...r, [qi]: { blob, base64, transcript: "" } }));
      setPhase("review");
    };
    mediaRef.current.stop();
  }, []);

  // ── Upload a single response ─────────────────────────────────────────────────
  const uploadResponse = async (qi) => {
    const rec = recordings[qi];
    if (!rec) return false;
    try {
      await api.postLarge(`/video-interviews/take/${token}/respond`, {
        question_index: qi,
        video_blob:     rec.base64,
        transcript:     rec.transcript || "",
        duration_s:     Math.round((session?.template_snapshot?.questions?.[qi]?.max_duration || 120) - recLeft),
      });
      return true;
    } catch { return false; }
  };

  // ── Proceed to next question / finish ────────────────────────────────────────
  const proceed = async () => {
    const questions = session?.template_snapshot?.questions || [];
    const isLast    = qIndex >= questions.length - 1;

    // Save current progress
    await api.post(`/video-interviews/take/${token}/start`, {});

    if (!isLast) {
      setQIndex(i => {
        const next = i + 1;
        const nextQ = questions[next];
        setRetakesLeft(nextQ?.retakes ?? session?.template_snapshot?.retakes_allowed ?? 1);
        startThinkPhase(next);
        return next;
      });
    } else {
      // All questions done — upload all blobs then complete
      setUploading(true);
      setPhase("uploading");
      const total = Object.keys(recordings).length;
      let done = 0;
      for (const qi of Object.keys(recordings)) {
        await uploadResponse(Number(qi));
        done++;
        setUploadProgress(Math.round((done / total) * 100));
      }
      await api.post(`/video-interviews/take/${token}/complete`, {});
      setUploading(false);
      setPhase("done");
    }
  };

  const retake = () => {
    if (retakesLeft <= 0) return;
    setRetakesLeft(r => r - 1);
    setRecordings(r => { const next = {...r}; delete next[qIndex]; return next; });
    startThinkPhase(qIndex);
  };

  // ── Render helpers ───────────────────────────────────────────────────────────
  const questions = session?.template_snapshot?.questions || [];
  const currentQ  = questions[qIndex];
  const company   = session?.template_snapshot?.job_title || "";

  // ── Phase renders ─────────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <Shell company={company}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", height:300, gap:12, color:"#9CA3AF" }}>
        <div style={{ width:36, height:36, borderRadius:"50%", border:`3px solid #E5E7EB`,
          borderTopColor:ACCENT, animation:"spin 0.8s linear infinite" }}/>
        <div style={{ fontSize:14 }}>Loading your interview…</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </Shell>
  );

  if (phase === "error") return (
    <Shell company={company}>
      <div style={{ textAlign:"center", padding:"48px 0" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔒</div>
        <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", margin:"0 0 10px" }}>Something went wrong</h2>
        <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.7 }}>{error}</p>
      </div>
    </Shell>
  );

  if (phase === "expired") return (
    <Shell company={company}>
      <div style={{ textAlign:"center", padding:"48px 0" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"#FEF3C7",
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h2 style={{ fontSize:20, fontWeight:800, color:"#111827", margin:"0 0 10px" }}>Interview link expired</h2>
        <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.7 }}>
          This interview link has passed its deadline. Please contact your recruiter if you think this is an error.
        </p>
      </div>
    </Shell>
  );

  if (phase === "completed") return (
    <Shell company={company}>
      <div style={{ textAlign:"center", padding:"48px 0" }}>
        <div style={{ width:72, height:72, borderRadius:"50%",
          background:"linear-gradient(135deg,#4361EE,#7C3AED)",
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px",
          boxShadow:"0 8px 24px rgba(67,97,238,.3)" }}>
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontSize:24, fontWeight:800, color:"#111827", margin:"0 0 10px" }}>Already completed</h2>
        <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.7 }}>
          You have already submitted your responses for this interview. We'll be in touch soon.
        </p>
      </div>
    </Shell>
  );

  if (phase === "done") return (
    <Shell company={company}>
      <div style={{ textAlign:"center", padding:"40px 0" }}>
        <div style={{ width:72, height:72, borderRadius:"50%",
          background:"linear-gradient(135deg,#4361EE,#7C3AED)",
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px",
          boxShadow:"0 8px 24px rgba(67,97,238,.3)", fontSize:28, color:"white" }}>✓</div>
        <h2 style={{ fontSize:24, fontWeight:800, color:"#111827", margin:"0 0 12px" }}>
          Interview complete{session?.candidate_name ? `, ${session.candidate_name.split(" ")[0]}` : ""}!
        </h2>
        <p style={{ fontSize:15, color:"#6B7280", lineHeight:1.7, maxWidth:460, margin:"0 auto 24px" }}>
          {session?.template_snapshot?.completion_message || "Thank you for completing the interview. We will review your responses and be in touch shortly."}
        </p>
        <div style={{ background:"#F0F4FF", borderRadius:12, padding:"16px 20px",
          textAlign:"left", border:"1px solid #E0E7FF", maxWidth:460, margin:"0 auto" }}>
          <p style={{ fontSize:13, fontWeight:700, color:ACCENT, margin:"0 0 8px" }}>What happens next</p>
          <ul style={{ margin:0, paddingLeft:18, fontSize:13, color:"#374151", lineHeight:1.9 }}>
            <li>The hiring team will review your responses</li>
            <li>AI analysis is generated automatically</li>
            <li>You'll hear back within the recruiter's stated timeframe</li>
          </ul>
        </div>
      </div>
    </Shell>
  );

  if (phase === "uploading") return (
    <Shell company={company}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", height:300, gap:16 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#111827" }}>Uploading your responses…</div>
        <div style={{ width:240, height:8, background:"#E5E7EB", borderRadius:4 }}>
          <div style={{ height:8, background:ACCENT, borderRadius:4,
            width:`${uploadPct}%`, transition:"width .3s" }}/>
        </div>
        <div style={{ fontSize:13, color:"#6B7280" }}>{uploadPct}% complete</div>
      </div>
    </Shell>
  );

  if (phase === "welcome") return (
    <Shell company={company}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:64, height:64, borderRadius:"50%",
            background:`linear-gradient(135deg,${ACCENT},#7C3AED)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 16px", fontSize:24, color:"white" }}>📹</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#111827", margin:"0 0 8px" }}>
            Hi{session?.candidate_name ? `, ${session.candidate_name.split(" ")[0]}` : ""}!
          </h1>
          <p style={{ fontSize:15, color:"#6B7280", lineHeight:1.7, margin:0 }}>
            {session?.template_snapshot?.welcome_message}
          </p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
          {[
            { icon:"📋", label:"Questions",  value:`${questions.length} recorded questions` },
            { icon:"⏱",  label:"Time limit", value:`${(session?.template_snapshot?.time_limit_per_question||120)}s per answer` },
            { icon:"🔄", label:"Retakes",    value:`${session?.template_snapshot?.retakes_allowed ?? 1} retake${session?.template_snapshot?.retakes_allowed !== 1 ? "s" : ""} per question` },
            { icon:"🕐", label:"Deadline",   value:`${session?.template_snapshot?.deadline_hours || 72} hours from now` },
          ].map(c => (
            <div key={c.label} style={{ background:"white", borderRadius:12, padding:"12px 14px",
              border:"1px solid #E5E7EB" }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{c.icon}</div>
              <div style={{ fontSize:10, color:"#9CA3AF", fontWeight:700,
                textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>{c.label}</div>
              <div style={{ fontSize:13, color:"#111827", fontWeight:600 }}>{c.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background:"#FFFBEB", borderRadius:10, padding:"12px 14px",
          border:"1px solid #FDE68A", marginBottom:20, fontSize:13, color:"#92400E" }}>
          <strong>Before you start:</strong> Make sure you are in a quiet, well-lit space. Allow camera and microphone access when prompted.
        </div>
        <button onClick={() => { setPhase("setup"); startCamera(); }}
          style={{ width:"100%", padding:"14px", borderRadius:12, border:"none",
            background:`linear-gradient(135deg,${ACCENT},#7C3AED)`, color:"white",
            fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:F,
            boxShadow:`0 4px 16px rgba(67,97,238,.3)` }}>
          Begin camera setup →
        </button>
      </div>
    </Shell>
  );

  if (phase === "setup") return (
    <Shell company={company}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:"#111827", margin:"0 0 6px" }}>Camera check</h2>
        <p style={{ fontSize:13, color:"#6B7280", marginBottom:16 }}>
          Make sure you can see yourself clearly before starting.
        </p>
        <CameraPreview videoRef={videoRef} recording={false}/>
        {!camReady && (
          <div style={{ textAlign:"center", marginTop:12, fontSize:13, color:"#6B7280" }}>
            Requesting camera access…
          </div>
        )}
        {error && (
          <div style={{ marginTop:12, padding:"10px 14px", background:"#FEF2F2",
            borderRadius:8, fontSize:13, color:"#DC2626", border:"1px solid #FECACA" }}>
            {error}
          </div>
        )}
        <button onClick={() => { if (camReady) { startThinkPhase(0); } }}
          disabled={!camReady}
          style={{ width:"100%", marginTop:14, padding:"13px", borderRadius:12, border:"none",
            background:camReady?`linear-gradient(135deg,${ACCENT},#7C3AED)`:"#E5E7EB",
            color:camReady?"white":"#9CA3AF", fontSize:14, fontWeight:700,
            cursor:camReady?"pointer":"not-allowed", fontFamily:F }}>
          {camReady ? "I look good — start the interview →" : "Waiting for camera…"}
        </button>
      </div>
    </Shell>
  );

  if (phase === "think") return (
    <Shell company={company}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <ProgressBar current={qIndex+1} total={questions.length}/>
        <div style={{ background:"white", borderRadius:16, padding:"20px 22px",
          border:`1.5px solid ${ACCENT}`, marginBottom:16,
          boxShadow:`0 4px 16px rgba(67,97,238,.1)` }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700,
              background:`${ACCENT}15`, color:ACCENT, textTransform:"uppercase", letterSpacing:"0.04em" }}>
              Think time
            </span>
          </div>
          <p style={{ fontSize:17, fontWeight:700, color:"#111827", lineHeight:1.6, margin:0 }}>
            {currentQ?.text}
          </p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"12px 0" }}>
          <Countdown seconds={thinkLeft} maxSeconds={currentQ?.think_time || 30} color={ACCENT}/>
          <div style={{ fontSize:13, color:"#6B7280" }}>Recording starts automatically</div>
        </div>
        <CameraPreview videoRef={videoRef} recording={false}/>
      </div>
    </Shell>
  );

  if (phase === "recording") return (
    <Shell company={company}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <ProgressBar current={qIndex+1} total={questions.length}/>
        <div style={{ background:"white", borderRadius:16, padding:"18px 22px",
          border:"1.5px solid #EF4444", marginBottom:16,
          boxShadow:"0 4px 16px rgba(239,68,68,.12)" }}>
          <p style={{ fontSize:16, fontWeight:700, color:"#111827", lineHeight:1.6, margin:0 }}>
            {currentQ?.text}
          </p>
        </div>
        <CameraPreview videoRef={videoRef} recording={true}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          marginTop:14, gap:12 }}>
          <Countdown seconds={recLeft} maxSeconds={currentQ?.max_duration || 120} color="#EF4444"/>
          <div style={{ flex:1, textAlign:"center", fontSize:13, color:"#6B7280", lineHeight:1.5 }}>
            Recording your response.<br/>
            <strong style={{ color:"#111827" }}>Speak clearly</strong> — your answer will be transcribed.
          </div>
          <button onClick={() => stopRecording(qIndex)}
            style={{ padding:"10px 18px", borderRadius:10, border:"2px solid #EF4444",
              background:"#FEF2F2", color:"#DC2626", fontSize:13, fontWeight:700,
              cursor:"pointer", fontFamily:F }}>
            Stop recording
          </button>
        </div>
      </div>
    </Shell>
  );

  if (phase === "review") return (
    <Shell company={company}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <ProgressBar current={qIndex+1} total={questions.length}/>
        <div style={{ background:"white", borderRadius:16, padding:"18px 22px",
          border:`1px solid #E5E7EB`, marginBottom:14 }}>
          <p style={{ fontSize:15, fontWeight:600, color:"#111827", lineHeight:1.5, margin:0 }}>
            {currentQ?.text}
          </p>
        </div>

        {/* Playback */}
        {recordings[qIndex]?.blob && (
          <div style={{ borderRadius:12, overflow:"hidden", marginBottom:14, background:"#0F1729" }}>
            <video controls src={URL.createObjectURL(recordings[qIndex].blob)}
              style={{ width:"100%", display:"block" }}/>
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:5, display:"block" }}>
            Add a note / transcript (optional — helps AI scoring)
          </label>
          <textarea
            value={recordings[qIndex]?.transcript || ""}
            onChange={e => setRecordings(r => ({ ...r, [qIndex]: { ...r[qIndex], transcript: e.target.value } }))}
            placeholder="Briefly summarise your answer, or leave blank…"
            rows={3}
            style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px",
              border:"1px solid #E5E7EB", borderRadius:8, fontSize:13, fontFamily:F,
              resize:"none", outline:"none", color:"#111827" }}/>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          {retakesLeft > 0 && (
            <button onClick={retake}
              style={{ flex:1, padding:"11px", borderRadius:10, border:"1.5px solid #E5E7EB",
                background:"white", color:"#374151", fontSize:13, fontWeight:600,
                cursor:"pointer", fontFamily:F }}>
              🔄 Retake ({retakesLeft} left)
            </button>
          )}
          <button onClick={proceed}
            style={{ flex:2, padding:"11px", borderRadius:10, border:"none",
              background:`linear-gradient(135deg,${ACCENT},#7C3AED)`, color:"white",
              fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:F,
              boxShadow:`0 4px 16px rgba(67,97,238,.25)` }}>
            {qIndex >= questions.length - 1 ? "Submit interview →" : "Next question →"}
          </button>
        </div>
      </div>
    </Shell>
  );

  return null;
}
