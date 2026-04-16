// client/src/GettingStarted.jsx
// Vercentic — Getting Started / Onboarding Dashboard

import { useState, useEffect, useCallback } from "react";

const C = {
  accent: "var(--t-accent, #4361EE)", accentLight: "var(--t-accent-light, #EEF2FF)",
  text1: "var(--t-text1, #0D0D0F)", text2: "var(--t-text2, #374151)",
  text3: "var(--t-text3, #6B7280)", text4: "var(--t-text4, #9CA3AF)",
  border: "var(--t-border, #E5E7EB)", card: "var(--t-card, #FFFFFF)",
  green: "#059669", greenLight: "#ECFDF5",
};
const F  = "'DM Sans', -apple-system, sans-serif";
const FW = "'Space Grotesk', -apple-system, sans-serif";

const PATHS = {
  check: "M20 6L9 17l-5-5",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  database: "M12 2C6.48 2 2 4.24 2 7s4.48 5 10 5 10-2.24 10-5-4.48-5-10-5zM2 17c0 2.76 4.48 5 10 5s10-2.24 10-5M2 12c0 2.76 4.48 5 10 5s10-2.24 10-5",
  "file-text": "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  "user-plus": "M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6",
  "git-branch": "M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9",
  "git-merge": "M18 21a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM6 3a3 3 0 100 6 3 3 0 000-6zM6 9v3a6 6 0 006 6h3",
  calendar: "M3 9h18M16 2v4M8 2v4M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  briefcase: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  monitor: "M20 3H4a1 1 0 00-1 1v13a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1zM8 21h8M12 17v4",
  scan: "M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M5 12h14",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  palette: "M12 22C6.49 22 2 17.52 2 12S6.49 2 12 2c5.52 0 10 4 10 9a5 5 0 01-5 5h-2a1 1 0 00-1 1 1 1 0 001 1 2 2 0 012 2c0 1.1-1.34 2-3 2z",
  workflow: "M22 12h-4l-3 9L9 3l-3 9H2",
  "arrow-right": "M5 12h14M12 5l7 7-7 7",
  x: "M18 6L6 18M6 6l12 12",
  circle: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z",
};
const Ic = ({ n, s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n] || PATHS.circle} />
  </svg>
);

const api = {
  get:   (path)       => fetch(`/api${path}`, { credentials: "include" }).then(r => r.json()),
  post:  (path, body) => fetch(`/api${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
};

// ── Phase bar ─────────────────────────────────────────────────────────────────
function PhaseBar({ phase, navObjects, onNavigate, onTick, tickingId }) {
  const [open, setOpen] = useState(true);
  const allDone = phase.doneCount === phase.total;
  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1.5px solid ${C.border}`, overflow: "hidden", marginBottom: 12 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: allDone ? C.green : phase.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.3s" }}>
          <Ic n={allDone ? "check" : phase.icon} s={15} c="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text1, fontFamily: FW }}>{phase.label}</span>
            {allDone && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: C.greenLight, color: C.green }}>COMPLETE</span>}
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 1 }}>{phase.doneCount} of {phase.total} tasks done</div>
        </div>
        <div style={{ width: 80, height: 4, borderRadius: 99, background: C.border, flexShrink: 0 }}>
          <div style={{ height: 4, borderRadius: 99, background: allDone ? C.green : phase.color, width: `${(phase.doneCount / phase.total) * 100}%`, transition: "width 0.4s ease" }} />
        </div>
        <Ic n="arrow-right" s={14} c={C.text4} />
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {phase.tasks.map((task, i) => (
            <TaskRow key={task.id} task={task} last={i === phase.tasks.length - 1}
              phaseColor={phase.color} navObjects={navObjects} onNavigate={onNavigate}
              onTick={onTick} ticking={tickingId === task.id} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, last, phaseColor, navObjects, onNavigate, onTick, ticking }) {
  const [hovered, setHovered] = useState(false);
  const handleNavigate = () => {
    if (task.navTargetSlug) {
      const obj = navObjects.find(o => o.slug === task.navTargetSlug || o.name?.toLowerCase() === task.navTargetSlug);
      if (obj) { onNavigate(`obj_${obj.id}`); return; }
    }
    if (task.navTarget) {
      if (task.navSection) {
        onNavigate("settings");
        setTimeout(() => window.dispatchEvent(new CustomEvent("vercentic:settings-section", { detail: { section: task.navSection } })), 100);
        return;
      }
      onNavigate(task.navTarget);
    }
  };
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "13px 18px",
        borderBottom: last ? "none" : `1px solid ${C.border}`,
        background: hovered ? `${phaseColor}06` : "transparent", transition: "background 0.15s" }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        {task.done ? (
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ic n="check" s={12} c="white" />
          </div>
        ) : task.type === "manual" ? (
          <button onClick={() => onTick(task.id, !task.done)} disabled={ticking} title="Mark as done"
            style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${hovered ? phaseColor : C.border}`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.15s", flexShrink: 0 }}>
            {ticking && <div style={{ width: 8, height: 8, borderRadius: "50%", background: phaseColor }} />}
          </button>
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px dashed ${C.border}`, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ic n={task.icon || "circle"} s={10} c={C.text4} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: task.done ? 500 : 600, color: task.done ? C.text3 : C.text1, textDecoration: task.done ? "line-through" : "none", fontFamily: F, lineHeight: 1.3 }}>{task.title}</span>
          {task.type === "auto" && !task.done && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: `${phaseColor}18`, color: phaseColor, letterSpacing: "0.04em" }}>AUTO</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.5 }}>{task.desc}</div>
      </div>
      {(task.navTarget || task.navTargetSlug) && !task.done && (
        <button onClick={handleNavigate}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7,
            border: `1.5px solid ${hovered ? phaseColor : C.border}`, background: hovered ? `${phaseColor}10` : "white",
            color: hovered ? phaseColor : C.text3, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F, transition: "all 0.15s", whiteSpace: "nowrap" }}>
          Go <Ic n="arrow-right" s={11} c={hovered ? phaseColor : C.text3} />
        </button>
      )}
    </div>
  );
}

// ── Main GettingStarted component ─────────────────────────────────────────────
export default function GettingStarted({ environment, navObjects, onNavigate }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tickingId, setTickingId] = useState(null);
  const envId = environment?.id;

  const load = useCallback(async () => {
    if (!envId) return;
    setLoading(true);
    try { const res = await api.get(`/onboarding-progress?environment_id=${envId}`); setData(res); }
    catch (e) { console.error("onboarding-progress:", e); }
    setLoading(false);
  }, [envId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const handleTick = async (taskId, done) => {
    setTickingId(taskId);
    const res = await api.post("/onboarding-progress/tick", { environment_id: envId, task_id: taskId, done });
    setData(res); setTickingId(null);
  };

  const handleDismiss = async () => {
    await api.post("/onboarding-progress/dismiss", { environment_id: envId });
    if (onNavigate) onNavigate("dashboard");
  };

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:C.text3, fontFamily:F }}>Loading your setup progress…</div>;
  if (!data) return null;

  const { phases, totalDone, totalTasks, percent } = data;
  const remaining = totalTasks - totalDone;
  const complete  = percent === 100;
  const circ = 2 * Math.PI * 37;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", fontFamily: F }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:24, marginBottom:28,
        background:"linear-gradient(135deg, #4361EE 0%, #7c3aed 100%)",
        borderRadius:18, padding:"28px 32px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-40, top:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.07)", pointerEvents:"none" }} />
        {/* Ring */}
        <div style={{ flexShrink:0, position:"relative", zIndex:1 }}>
          <svg width={88} height={88} style={{ transform:"rotate(-90deg)" }}>
            <circle cx={44} cy={44} r={37} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={7} />
            <circle cx={44} cy={44} r={37} fill="none" stroke="white" strokeWidth={7}
              strokeDasharray={circ} strokeDashoffset={circ * (1 - percent / 100)}
              style={{ transition:"stroke-dashoffset 0.6s ease", strokeLinecap:"round" }} />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:18, fontWeight:800, color:"white", lineHeight:1 }}>{percent}%</span>
            <span style={{ fontSize:9, color:"rgba(255,255,255,0.7)", fontWeight:600, marginTop:1 }}>done</span>
          </div>
        </div>
        {/* Text */}
        <div style={{ flex:1, position:"relative", zIndex:1 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:"white", margin:"0 0 6px", fontFamily:FW, letterSpacing:"-0.3px" }}>
            {complete ? "Setup complete!" : "Getting Started"}
          </h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.6, margin:"0 0 14px" }}>
            {complete ? "Your Vercentic environment is fully configured. Enjoy the platform!"
              : `${remaining} task${remaining !== 1 ? "s" : ""} remaining — complete these to get the most from Vercentic.`}
          </p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <div style={{ padding:"4px 12px", borderRadius:99, background:"rgba(255,255,255,0.15)", fontSize:12, color:"white", fontWeight:600 }}>{totalDone}/{totalTasks} complete</div>
            {phases.filter(p => p.doneCount === p.total).map(p => (
              <div key={p.id} style={{ padding:"4px 12px", borderRadius:99, background:"rgba(5,150,105,0.25)", fontSize:12, color:"#6EE7B7", fontWeight:600 }}>✓ {p.label}</div>
            ))}
          </div>
        </div>
        <button onClick={handleDismiss} title="Hide Getting Started" style={{ position:"absolute", top:14, right:14, background:"rgba(255,255,255,0.15)", border:"none", cursor:"pointer", borderRadius:7, padding:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Ic n="x" s={14} c="white" />
        </button>
      </div>
      {/* Phase cards */}
      <div>
        {phases.map(phase => (
          <PhaseBar key={phase.id} phase={phase} navObjects={navObjects || []}
            onNavigate={onNavigate} onTick={handleTick} tickingId={tickingId} />
        ))}
      </div>
      {/* Footer hint */}
      <div style={{ marginTop:20, padding:"12px 18px", borderRadius:10, background:"var(--t-accent-light,#EEF2FF)", border:"1.5px solid rgba(67,97,238,0.18)", display:"flex", alignItems:"center", gap:10 }}>
        <Ic n="zap" s={14} c="var(--t-accent,#4361EE)" />
        <span style={{ fontSize:12, color:C.text2, lineHeight:1.5 }}>
          <strong style={{ color:"var(--t-accent,#4361EE)" }}>AUTO</strong> tasks complete automatically when you take the action.{" "}
          <strong>Manual</strong> tasks have a checkbox to confirm. You can always return here from the sidebar.
        </span>
      </div>
    </div>
  );
}

// ── Welcome Modal (first-load) ────────────────────────────────────────────────
export function WelcomeModal({ environment, onAccept, onDecline }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  const handleAccept  = () => { setVisible(false); if (onAccept)  onAccept(); };
  const handleDecline = () => { setVisible(false); if (onDecline) onDecline(); };
  const envName = environment?.name || "your workspace";
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(13,13,15,0.55)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"white", borderRadius:22, width:"90%", maxWidth:500, padding:"36px 36px 28px", boxShadow:"0 32px 80px rgba(0,0,0,0.25)", position:"relative", textAlign:"center", fontFamily:F }}>
        <div style={{ width:64, height:64, borderRadius:18, background:"linear-gradient(135deg,#4361EE 0%,#7c3aed 100%)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:"0 8px 24px rgba(67,97,238,0.35)" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, color:"#0D0D0F", margin:"0 0 8px", fontFamily:FW, letterSpacing:"-0.3px" }}>Welcome to Vercentic</h2>
        <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.65, margin:"0 0 28px", maxWidth:380, marginLeft:"auto", marginRight:"auto" }}>
          Your <strong style={{ color:"#374151" }}>{envName}</strong> environment is ready.
          Would you like a guided setup to help you get the most from the platform?
        </p>
        <button onClick={handleAccept} style={{ width:"100%", padding:"13px 24px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#4361EE 0%,#7c3aed 100%)", color:"white", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:F, marginBottom:10, boxShadow:"0 4px 16px rgba(67,97,238,0.35)" }}>
          Take me to Getting Started
        </button>
        <button onClick={handleDecline} style={{ width:"100%", padding:"10px 24px", borderRadius:12, border:"1.5px solid #E5E7EB", background:"transparent", color:"#6B7280", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:F }}>
          I'll explore on my own
        </button>
        <p style={{ fontSize:11, color:"#9CA3AF", marginTop:14, lineHeight:1.5 }}>You can always return to Getting Started from the sidebar.</p>
      </div>
    </div>
  );
}
