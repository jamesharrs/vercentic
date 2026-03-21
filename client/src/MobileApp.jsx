import { useState, useEffect, useRef } from "react";

// ─── Vercentic Brand Palette ──────────────────────────────────────────────────
const V = {
  gradientBg: "radial-gradient(ellipse at 10% 20%, #D8D4F0 0%, transparent 55%), radial-gradient(ellipse at 90% 15%, #F0C8C8 0%, transparent 55%), radial-gradient(ellipse at 50% 80%, #F7F4F0 0%, transparent 60%), #F5F2EE",
  ink:    "#0D0D0F",
  inkMid: "#2D2D35",
  muted:  "#8A8A9A",
  faint:  "#C8C4D8",
  card:       "#FFFFFFCC",
  cardSolid:  "#FFFFFF",
  cardBorder: "rgba(0,0,0,0.07)",
  lavender: "#8B7EC8",
  rose:     "#C87E8B",
  lilac:    "#B89ED8",
  sage:     "#7EC8B8",
  success: "#1A7F5A",
  warning: "#B85C1A",
  danger:  "#B81A2D",
};
const F  = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const FD = "'Geist', 'DM Sans', -apple-system, sans-serif";

const api = {
  base: "/api",
  async get(p) { try { const r = await fetch(this.base + p); return r.json(); } catch { return {}; } },
  async post(p, body) {
    try {
      const r = await fetch(this.base + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return r.json();
    } catch { return {}; }
  },
};

const statusColor = (s = "") => {
  const m = { active: V.success, new: V.lavender, screening: V.sage, interview: V.lilac,
    offer: V.warning, hired: V.success, declined: V.danger, withdrawn: V.danger,
    open: V.success, closed: V.muted };
  return m[s?.toLowerCase()] || V.muted;
};

const PATHS = {
  users:     "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  calendar:  "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  briefcase: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  more:      "M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z",
  send:      "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  search:    "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  phone:     "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  mail:      "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  spark:     "M13 10V3L4 14h7v7l9-11h-7z",
  x:         "M6 18L18 6M6 6l12 12",
  chevL:     "M15 19l-7-7 7-7",
  chevR:     "M9 5l7 7-7 7",
  check:     "M5 13l4 4L19 7",
  map:       "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  note:      "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  user:      "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  clock:     "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  layers:    "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  arrowR:    "M5 12h14M12 5l7 7-7 7",
};

const Ic = ({ n, s = 20, c = V.muted, style = {} }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {(PATHS[n] || "").split("M").filter(Boolean).map((d, i) => <path key={i} d={"M" + d} />)}
  </svg>
);

// ─── Vercentic Logo — icon + wordmark, no external font dependency ────────────
const VIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1"  y="17" width="16" height="3.5" rx="1.2" fill="#0D0D0F" opacity="0.18"/>
    <rect x="0"  y="11" width="18" height="4"   rx="1.2" fill="#0D0D0F" opacity="0.42"/>
    <rect x="1"  y="4"  width="16" height="5.5" rx="1.8" fill="#0D0D0F"/>
  </svg>
);

const VLogo = ({ height = 24 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: Math.round(height * 0.35) }}>
    <VIcon size={height} />
    <span style={{
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: height * 0.72, fontWeight: 800, color: "#0D0D0F",
      letterSpacing: "-0.04em", lineHeight: 1, whiteSpace: "nowrap",
    }}>
      Vercentic
    </span>
  </div>
);

const Avatar = ({ name = "", size = 40, color = V.lavender }) => {
  const initials = name.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 700, color: "white", fontFamily: F, flexShrink: 0, letterSpacing: "-0.02em" }}>
      {initials || "?"}
    </div>
  );
};

const Badge = ({ label, color }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px",
    borderRadius: 99, fontSize: 11, fontWeight: 600, background: `${color}18`,
    color, fontFamily: F, whiteSpace: "nowrap", letterSpacing: "0.01em" }}>{label}</span>
);

const Sheet = ({ open, onClose, title, children, height = "88vh" }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(13,13,15,0.4)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: V.cardSolid, borderRadius: "24px 24px 0 0",
        maxHeight: height, display: "flex", flexDirection: "column",
        boxShadow: "0 -12px 48px rgba(0,0,0,0.12)",
        animation: "slideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)" }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.12)" }} />
        </div>
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 22px 16px", borderBottom: `1px solid ${V.cardBorder}` }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.02em" }}>{title}</span>
            <button onClick={onClose} style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 99,
              width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Ic n="x" s={14} c={V.muted} />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>{children}</div>
      </div>
    </div>
  );
};

// ── COPILOT SCREEN ────────────────────────────────────────────────────────────
const CopilotScreen = ({ session, environment, onNavigate }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [started, setStarted] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/interviews?environment_id=${environment.id}&limit=20`).then(d => {
      const today = new Date().toDateString();
      setTodayCount((d.items || []).filter(i => new Date(i.date).toDateString() === today).length);
    }).catch(() => {});
  }, [environment?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    const msg = text.trim();
    if (!msg) return;
    if (!started) setStarted(true);
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg, time: new Date() }]);
    setLoading(true);
    try {
      const system = `You are the Vercentic copilot on mobile. Be very concise (2-3 sentences max). User: ${session?.first_name} ${session?.last_name}. Env: ${environment?.name}. If user wants to navigate, end with [NAVIGATE:candidates], [NAVIGATE:interviews], or [NAVIGATE:jobs].`;
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages.map(m => ({ role: m.role, content: m.text })), { role: "user", content: msg }], system })
      });
      const data = await res.json();
      let reply = data.content?.[0]?.text || data.reply || "I couldn't process that. Try again.";
      const nav = reply.match(/\[NAVIGATE:(\w+)\]/);
      if (nav) { reply = reply.replace(/\[NAVIGATE:\w+\]/, "").trim(); setTimeout(() => onNavigate(nav[1]), 350); }
      setMessages(prev => [...prev, { role: "assistant", text: reply, time: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Please try again.", time: new Date() }]);
    }
    setLoading(false);
  };

  const timeStr = d => { const s = (new Date() - new Date(d)) / 1000; if (s < 60) return "now"; if (s < 3600) return `${Math.floor(s / 60)}m`; return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };

  const quickActions = [
    { label: todayCount > 0 ? `${todayCount} interview${todayCount > 1 ? "s" : ""} today` : "Today's schedule", nav: "interviews", color: V.lavender },
    { label: "Candidates",  nav: "candidates", color: V.rose },
    { label: "Open jobs",   nav: "jobs",       color: V.sage },
    { label: "Find someone", prompt: "Find ",  color: V.lilac },
  ];

  const AiAvatar = () => (
    <div style={{ width: 26, height: 26, borderRadius: 8, background: V.ink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="1"  y="17" width="16" height="3.5" rx="1.2" fill="white" opacity="0.35"/>
        <rect x="0"  y="11" width="18" height="4"   rx="1.2" fill="white" opacity="0.65"/>
        <rect x="1"  y="4"  width="16" height="5.5" rx="1.8" fill="white"/>
      </svg>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: V.gradientBg }}>
      {!started && messages.length === 0 && (
        <div style={{ padding: "32px 22px 0", textAlign: "center", flexShrink: 0 }}>
          <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}><VLogo height={24} /></div>
          <div style={{ fontSize: 26, fontWeight: 800, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.04em", lineHeight: 1.15, marginBottom: 8 }}>
            Good to see you, {session?.first_name || "there"}
          </div>
          <div style={{ fontSize: 15, color: V.muted, fontFamily: F, lineHeight: 1.55 }}>
            What do you need today?
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 26 }}>
            {quickActions.map((qa, i) => (
              <button key={i}
                onClick={() => qa.nav ? onNavigate(qa.nav) : (setInput(qa.prompt || ""), inputRef.current?.focus())}
                style={{ padding: "14px 16px", borderRadius: 18, border: `1.5px solid rgba(0,0,0,0.07)`,
                  background: "rgba(255,255,255,0.78)", backdropFilter: "blur(10px)",
                  cursor: "pointer", textAlign: "left", fontFamily: F,
                  boxShadow: "0 2px 14px rgba(0,0,0,0.05)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: qa.color, marginBottom: 10 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: V.inkMid, lineHeight: 1.3 }}>{qa.label}</div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                  <Ic n="arrowR" s={13} c={V.muted} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", WebkitOverflowScrolling: "touch" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 14 }}>
            {m.role === "assistant" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <AiAvatar />
                <span style={{ fontSize: 10, color: V.muted, fontFamily: F, fontWeight: 500 }}>Vercentic · {timeStr(m.time)}</span>
              </div>
            )}
            <div style={{ maxWidth: "80%", padding: "11px 16px",
              borderRadius: m.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
              background: m.role === "user" ? V.ink : "rgba(255,255,255,0.9)",
              color: m.role === "user" ? "white" : V.inkMid,
              fontSize: 14.5, lineHeight: 1.6, fontFamily: F, fontWeight: 400,
              boxShadow: m.role === "user" ? "0 4px 16px rgba(13,13,15,0.2)" : "0 2px 10px rgba(0,0,0,0.06)",
              border: m.role === "user" ? "none" : `1px solid rgba(0,0,0,0.07)`,
              backdropFilter: m.role !== "user" ? "blur(8px)" : "none" }}>
              {m.text}
            </div>
            {m.role === "user" && <span style={{ fontSize: 10, color: V.muted, fontFamily: F, marginTop: 3 }}>{timeStr(m.time)}</span>}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <AiAvatar />
            <div style={{ padding: "12px 18px", borderRadius: "4px 18px 18px 18px",
              background: "rgba(255,255,255,0.9)", border: `1px solid rgba(0,0,0,0.07)`,
              backdropFilter: "blur(8px)", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: V.muted,
                  animation: `vcDot 1.4s ${i * 0.2}s ease-in-out infinite` }} />
              ))}
              <style>{`@keyframes vcDot{0%,80%,100%{transform:scale(0.55);opacity:0.3}40%{transform:scale(1);opacity:1}}`}</style>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ padding: "10px 14px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center",
          background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)",
          borderRadius: 22, border: `1.5px solid rgba(0,0,0,0.1)`,
          padding: "6px 6px 6px 18px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask me anything…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, color: V.inkMid, fontFamily: F, outline: "none", minWidth: 0 }} />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            style={{ width: 38, height: 38, borderRadius: 16, border: "none", flexShrink: 0,
              background: input.trim() && !loading ? V.ink : "rgba(0,0,0,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !loading ? "pointer" : "default", transition: "background 0.18s" }}>
            <Ic n="send" s={16} c={input.trim() && !loading ? "white" : V.muted} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── CANDIDATE DETAIL ──────────────────────────────────────────────────────────
const CandidateDetail = ({ record }) => {
  const d = record.data || {};
  const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || "Unnamed";
  const [note, setNote] = useState(""); const [notes, setNotes] = useState([]); const [saving, setSaving] = useState(false);
  useEffect(() => { api.get(`/records/${record.id}/notes`).then(n => setNotes(Array.isArray(n) ? n : [])).catch(() => {}); }, [record.id]);
  const addNote = async () => { if (!note.trim()) return; setSaving(true); try { const n = await api.post(`/records/${record.id}/notes`, { content: note }); setNotes(p => [n, ...p]); setNote(""); } catch {} setSaving(false); };
  const fields = [{ l: "Email", v: d.email, i: "mail" }, { l: "Phone", v: d.phone, i: "phone" }, { l: "Location", v: d.location, i: "map" }, { l: "Role", v: d.current_title || d.job_title, i: "briefcase" }, { l: "Status", v: d.status, i: "layers" }, { l: "Source", v: d.source, i: "user" }].filter(f => f.v);
  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: "24px 22px 18px", background: V.gradientBg, textAlign: "center", borderBottom: `1px solid ${V.cardBorder}` }}>
        <Avatar name={name} size={60} color={V.lavender} />
        <div style={{ marginTop: 12, fontSize: 20, fontWeight: 800, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.03em" }}>{name}</div>
        <div style={{ fontSize: 13, color: V.muted, fontFamily: F, marginTop: 2 }}>{d.current_title || d.job_title || d.email || ""}</div>
        {d.status && <div style={{ marginTop: 10 }}><Badge label={d.status} color={statusColor(d.status)} /></div>}
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${V.cardBorder}` }}>
        {d.phone && <a href={`tel:${d.phone}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 5, textDecoration: "none", borderRight: `1px solid ${V.cardBorder}` }}><Ic n="phone" s={20} c={V.success} /><span style={{ fontSize: 10, color: V.success, fontFamily: F, fontWeight: 800, letterSpacing: "0.06em" }}>CALL</span></a>}
        {d.email && <a href={`mailto:${d.email}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 5, textDecoration: "none" }}><Ic n="mail" s={20} c={V.lavender} /><span style={{ fontSize: 10, color: V.lavender, fontFamily: F, fontWeight: 800, letterSpacing: "0.06em" }}>EMAIL</span></a>}
      </div>
      <div style={{ padding: "18px 22px" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: V.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14, fontFamily: F }}>Profile</div>
        {fields.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderBottom: i < fields.length - 1 ? `1px solid ${V.cardBorder}` : "none" }}>
            <Ic n={f.i} s={15} c={V.muted} />
            <div><div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 2, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{f.l}</div><div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, fontWeight: 500 }}>{f.v}</div></div>
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 22px 22px", borderTop: `1px solid ${V.cardBorder}` }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: V.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14, fontFamily: F }}>Notes</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} placeholder="Add a note…"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${V.cardBorder}`, fontSize: 14, fontFamily: F, outline: "none", color: V.inkMid, background: "rgba(0,0,0,0.02)" }} />
          <button onClick={addNote} disabled={!note.trim() || saving}
            style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: note.trim() ? V.ink : "rgba(0,0,0,0.06)", color: "white", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: note.trim() ? "pointer" : "default" }}>
            {saving ? "…" : "Add"}
          </button>
        </div>
        {notes.map((n, i) => (
          <div key={i} style={{ padding: "11px 14px", borderRadius: 12, background: "rgba(0,0,0,0.025)", border: `1px solid ${V.cardBorder}`, marginBottom: 8 }}>
            <div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, lineHeight: 1.55 }}>{n.content}</div>
            <div style={{ fontSize: 11, color: V.muted, fontFamily: F, marginTop: 4 }}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : "Just now"}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── CANDIDATES SCREEN ─────────────────────────────────────────────────────────
const CandidatesScreen = ({ environment }) => {
  const [records, setRecords] = useState([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState(""); const [sel, setSel] = useState(null);
  useEffect(() => { if (!environment?.id) return; api.get(`/objects?environment_id=${environment.id}`).then(objs => { const o = (objs || []).find(o => o.slug === "people" || o.name?.toLowerCase().includes("people")); if (o) return api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=50`); }).then(d => { setRecords(d?.records || []); setLoading(false); }).catch(() => setLoading(false)); }, [environment?.id]);
  const getName = r => [r.data?.first_name, r.data?.last_name].filter(Boolean).join(" ") || r.data?.email || "Unnamed";
  const palette = [V.lavender, V.rose, V.sage, V.lilac, "#C8A87E"];
  const colorFor = n => { let h = 0; for (let c of n) h += c.charCodeAt(0); return palette[h % palette.length]; };
  const filtered = records.filter(r => { const n = getName(r).toLowerCase(); const t = (r.data?.current_title || r.data?.job_title || "").toLowerCase(); const q = search.toLowerCase(); return !q || n.includes(q) || t.includes(q); });
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#F7F5F2" }}>
      <div style={{ padding: "12px 16px", background: V.cardSolid, borderBottom: `1px solid ${V.cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "10px 14px" }}>
          <Ic n="search" s={15} c={V.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, fontFamily: F, color: V.inkMid, outline: "none" }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: V.muted, fontFamily: F }}>Loading…</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: V.muted, fontFamily: F }}>{search ? "No matches" : "No candidates yet"}</div>
          : filtered.map(r => {
            const name = getName(r); const col = colorFor(name); const status = r.data?.status || r.data?.pipeline_stage;
            return (
              <button key={r.id} onClick={() => setSel(r)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${V.cardBorder}` }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "white", fontFamily: F, flexShrink: 0, letterSpacing: "-0.01em" }}>
                  {name.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: V.inkMid, fontFamily: FD, marginBottom: 2, letterSpacing: "-0.02em" }}>{name}</div>
                  <div style={{ fontSize: 13, color: V.muted, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.data?.current_title || r.data?.job_title || r.data?.email || "No title"}</div>
                  {status && <div style={{ marginTop: 5 }}><Badge label={status} color={statusColor(status)} /></div>}
                </div>
                <Ic n="chevR" s={15} c={V.muted} />
              </button>
            );
          })}
      </div>
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? getName(sel) : ""} height="82vh">
        {sel && <CandidateDetail record={sel} />}
      </Sheet>
    </div>
  );
};

// ── INTERVIEWS SCREEN ─────────────────────────────────────────────────────────
const InterviewsScreen = ({ environment }) => {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [filter, setFilter] = useState("today"); const [sel, setSel] = useState(null);
  useEffect(() => { if (!environment?.id) return; api.get(`/interviews?environment_id=${environment.id}&limit=50`).then(d => { setItems(d?.items || []); setLoading(false); }).catch(() => setLoading(false)); }, [environment?.id]);
  const today = new Date().toDateString(); const tom = new Date(Date.now() + 86400000).toDateString();
  const filtered = items.filter(i => { const d = new Date(i.date).toDateString(); if (filter === "today") return d === today; if (filter === "tomorrow") return d === tom; if (filter === "upcoming") return new Date(i.date) >= new Date(); return true; });
  const fmtTime = (dt, t) => t || new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = dt => { const d = new Date(dt).toDateString(); if (d === today) return "Today"; if (d === tom) return "Tomorrow"; return new Date(dt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); };
  const typeCol = f => ({ video: V.lavender, phone: V.success, onsite: V.rose, panel: V.lilac }[f?.toLowerCase()] || V.muted);
  const tabs = [{ id: "today", label: "Today" }, { id: "tomorrow", label: "Tomorrow" }, { id: "upcoming", label: "Upcoming" }, { id: "all", label: "All" }];
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#F7F5F2" }}>
      <div style={{ background: V.cardSolid, borderBottom: `1px solid ${V.cardBorder}`, padding: "12px 16px", display: "flex", gap: 6 }}>
        {tabs.map(t => { const cnt = t.id === "today" ? items.filter(i => new Date(i.date).toDateString() === today).length : 0; return (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{ padding: "7px 14px", borderRadius: 99, border: "none", background: filter === t.id ? V.ink : "rgba(0,0,0,0.05)", color: filter === t.id ? "white" : V.muted, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: "pointer", letterSpacing: "0.01em" }}>
            {t.label}{cnt > 0 && <span style={{ marginLeft: 5, background: filter === t.id ? "rgba(255,255,255,0.25)" : V.lavender, color: "white", borderRadius: 99, padding: "1px 6px", fontSize: 10 }}>{cnt}</span>}
          </button>
        ); })}
      </div>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: V.muted, fontFamily: F }}>Loading…</div>
          : filtered.length === 0 ? <div style={{ padding: 48, textAlign: "center", color: V.muted, fontFamily: F, fontSize: 14 }}>No interviews scheduled</div>
          : filtered.map((iv, i) => { const col = typeCol(iv.format); return (
            <button key={iv.id || i} onClick={() => setSel(iv)} style={{ width: "100%", display: "flex", gap: 14, padding: "16px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${V.cardBorder}`, alignItems: "flex-start" }}>
              <div style={{ width: 48, flexShrink: 0, textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.02em" }}>{fmtTime(iv.date, iv.time)}</div>
                {iv.duration_minutes && <div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginTop: 2, fontWeight: 600 }}>{iv.duration_minutes}m</div>}
              </div>
              <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: col, flexShrink: 0, marginTop: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: V.inkMid, fontFamily: FD, marginBottom: 2, letterSpacing: "-0.02em" }}>{iv.candidate_name || "Candidate"}</div>
                <div style={{ fontSize: 12, color: V.muted, fontFamily: F, marginBottom: 6 }}>{iv.job_title || iv.type_name || "Interview"} · {fmtDate(iv.date)}</div>
                {iv.format && <Badge label={iv.format} color={col} />}
              </div>
              <Ic n="chevR" s={14} c={V.muted} style={{ marginTop: 4 }} />
            </button>
          ); })}
      </div>
      <Sheet open={!!sel} onClose={() => setSel(null)} title="Interview">
        {sel && (
          <div style={{ padding: "20px 22px 40px" }}>
            <div style={{ background: `${typeCol(sel.format)}10`, border: `1px solid ${typeCol(sel.format)}28`, borderRadius: 16, padding: 18, marginBottom: 22 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.03em", marginBottom: 4 }}>{sel.candidate_name || "Candidate"}</div>
              <div style={{ fontSize: 13, color: V.muted, fontFamily: F }}>{sel.job_title || sel.type_name || "Interview"}</div>
            </div>
            {[{ l: "Date & Time", v: `${fmtDate(sel.date)} at ${fmtTime(sel.date, sel.time)}`, i: "calendar" }, { l: "Duration", v: sel.duration_minutes ? `${sel.duration_minutes} min` : "—", i: "clock" }, { l: "Format", v: sel.format || "—", i: "layers" }, { l: "Location", v: sel.location || sel.video_link || "—", i: "map" }].map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${V.cardBorder}`, alignItems: "flex-start" }}>
                <Ic n={row.i} s={15} c={V.muted} style={{ marginTop: 2 }} />
                <div><div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 2, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{row.l}</div><div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, fontWeight: 500 }}>{row.v}</div></div>
              </div>
            ))}
            {sel.notes && <div style={{ marginTop: 18, padding: 14, background: "rgba(0,0,0,0.02)", borderRadius: 12, border: `1px solid ${V.cardBorder}` }}><div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 6, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Notes</div><div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, lineHeight: 1.65 }}>{sel.notes}</div></div>}
            <button style={{ width: "100%", marginTop: 22, padding: "15px", borderRadius: 14, border: "none", background: V.ink, color: "white", fontSize: 15, fontWeight: 700, fontFamily: F, cursor: "pointer", letterSpacing: "-0.01em" }}>→ Submit Scorecard</button>
          </div>
        )}
      </Sheet>
    </div>
  );
};

// ── JOBS SCREEN ───────────────────────────────────────────────────────────────
const JobsScreen = ({ environment }) => {
  const [jobs, setJobs] = useState([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState(""); const [sel, setSel] = useState(null);
  useEffect(() => { if (!environment?.id) return; api.get(`/objects?environment_id=${environment.id}`).then(objs => { const o = (objs || []).find(o => o.slug === "jobs" || o.name?.toLowerCase().includes("job")); if (o) return api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=50`); }).then(d => { setJobs(d?.records || []); setLoading(false); }).catch(() => setLoading(false)); }, [environment?.id]);
  const getTitle = j => j.data?.job_title || j.data?.title || "Untitled Role";
  const getStatus = j => j.data?.status || "Open";
  const filtered = jobs.filter(j => { const t = getTitle(j).toLowerCase(); const dep = (j.data?.department || "").toLowerCase(); const q = search.toLowerCase(); return !q || t.includes(q) || dep.includes(q); });
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#F7F5F2" }}>
      <div style={{ padding: "12px 16px", background: V.cardSolid, borderBottom: `1px solid ${V.cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "10px 14px" }}>
          <Ic n="search" s={15} c={V.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, fontFamily: F, color: V.inkMid, outline: "none" }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: V.muted, fontFamily: F }}>Loading…</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: V.muted, fontFamily: F }}>No jobs found</div>
          : <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>{filtered.map(j => {
            const status = getStatus(j); const col = statusColor(status);
            return (
              <button key={j.id} onClick={() => setSel(j)} style={{ background: V.cardSolid, borderRadius: 18, border: `1px solid ${V.cardBorder}`, padding: 18, textAlign: "left", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", borderLeft: `4px solid ${col}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: V.inkMid, fontFamily: FD, flex: 1, marginRight: 10, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{getTitle(j)}</div>
                  <Badge label={status} color={col} />
                </div>
                {j.data?.department && <div style={{ fontSize: 13, color: V.muted, fontFamily: F, marginBottom: 5 }}>{j.data.department}</div>}
                {j.data?.location && <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Ic n="map" s={11} c={V.muted} /><span style={{ fontSize: 12, color: V.muted, fontFamily: F }}>{j.data.location}</span></div>}
              </button>
            );
          })}</div>}
      </div>
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? getTitle(sel) : ""}>
        {sel && (
          <div style={{ padding: "20px 22px 40px" }}>
            {[{ l: "Department", v: sel.data?.department, i: "layers" }, { l: "Location", v: sel.data?.location, i: "map" }, { l: "Status", v: getStatus(sel), i: "check" }, { l: "Type", v: sel.data?.employment_type, i: "briefcase" }].filter(f => f.v).map((row, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${V.cardBorder}` : "none", alignItems: "flex-start" }}>
                <Ic n={row.i} s={15} c={V.muted} style={{ marginTop: 2 }} />
                <div><div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 2, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{row.l}</div><div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, fontWeight: 500 }}>{row.v}</div></div>
              </div>
            ))}
            {sel.data?.description && <div style={{ marginTop: 18, padding: 14, background: "rgba(0,0,0,0.02)", borderRadius: 12 }}><div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 8, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Description</div><div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, lineHeight: 1.7 }}>{sel.data.description}</div></div>}
          </div>
        )}
      </Sheet>
    </div>
  );
};

// ── MOBILE SHELL ──────────────────────────────────────────────────────────────
export const MobileShell = ({ session, environment, objects }) => {
  const [screen, setScreen] = useState("copilot");
  const nav = [
    { id: "copilot",    icon: "spark",    label: "Copilot" },
    { id: "candidates", icon: "users",    label: "People" },
    { id: "interviews", icon: "calendar", label: "Interviews" },
    { id: "jobs",       icon: "briefcase",label: "Jobs" },
    { id: "more",       icon: "more",     label: "More" },
  ];
  const titles = { copilot: "Vercentic", candidates: "People", interviews: "Interviews", jobs: "Jobs", more: "More" };

  const NavIcon = ({ id, active }) => {
    if (id === "copilot" && active) return (
      <div style={{ width: 32, height: 32, borderRadius: 10, background: V.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="1"  y="17" width="16" height="3.5" rx="1.2" fill="white" opacity="0.35"/>
          <rect x="0"  y="11" width="18" height="4"   rx="1.2" fill="white" opacity="0.65"/>
          <rect x="1"  y="4"  width="16" height="5.5" rx="1.8" fill="white"/>
        </svg>
      </div>
    );
    return <Ic n={id === "copilot" ? "spark" : nav.find(n => n.id === id)?.icon} s={21} c={active ? V.inkMid : V.muted} />;
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#F7F5F2", fontFamily: F, overscrollBehavior: "none", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "rgba(247,245,242,0.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid rgba(0,0,0,0.07)`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 54, flexShrink: 0, zIndex: 10 }}>
        {screen !== "copilot" ? (
          <button onClick={() => setScreen("copilot")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 0" }}>
            <Ic n="chevL" s={18} c={V.inkMid} />
          </button>
        ) : (
          <VLogo height={20} />
        )}
        <span style={{ fontSize: 16, fontWeight: 800, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.03em" }}>{titles[screen]}</span>
        <Avatar name={[session?.first_name || "", session?.last_name || ""].join(" ").trim() || "U"} size={30} color={V.lavender} />
      </div>

      {/* Screen */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
        {screen === "copilot"    && <CopilotScreen session={session} environment={environment} onNavigate={setScreen} />}
        {screen === "candidates" && <CandidatesScreen environment={environment} />}
        {screen === "interviews" && <InterviewsScreen environment={environment} />}
        {screen === "jobs"       && <JobsScreen environment={environment} />}
        {screen === "more"       && <div style={{ padding: 48, textAlign: "center", color: V.muted, fontFamily: F }}>More features coming soon</div>}
      </div>

      {/* Bottom nav */}
      <div style={{ background: "rgba(247,245,242,0.95)", backdropFilter: "blur(16px)", borderTop: `1px solid rgba(0,0,0,0.07)`, display: "flex", flexShrink: 0, zIndex: 10 }}>
        {nav.map(item => {
          const active = screen === item.id;
          return (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 9px", background: "none", border: "none", cursor: "pointer", gap: 4, position: "relative" }}>
              {active && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 2.5, borderRadius: "0 0 2px 2px", background: V.ink }} />}
              <NavIcon id={item.id} active={active} />
              <span style={{ fontSize: 10, fontWeight: active ? 800 : 500, color: active ? V.inkMid : V.muted, fontFamily: F, letterSpacing: "0.01em" }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── MOBILE DETECTION HOOK ─────────────────────────────────────────────────────
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};
