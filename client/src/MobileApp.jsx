import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#F8F7FF", card: "#FFFFFF", accent: "#4361EE", accentLight: "#EEF2FF",
  accentDark: "#3451D1", text1: "#0F172A", text2: "#374151", text3: "#6B7280",
  text4: "#9CA3AF", border: "#E8E8F0", success: "#0CAF77", warning: "#F59F00",
  danger: "#EF4444", purple: "#7C3AED", teal: "#0891B2",
};
const F = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";

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
  const m = { active: "#0CAF77", new: "#4361EE", screening: "#0891B2", interview: "#7C3AED",
    offer: "#F59F00", hired: "#0CAF77", declined: "#EF4444", withdrawn: "#EF4444",
    open: "#0CAF77", closed: "#6B7280", "on hold": "#F59F00" };
  return m[s?.toLowerCase()] || "#6B7280";
};

const PATHS = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  briefcase: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  more: "M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z",
  send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  phone: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  spark: "M13 10V3L4 14h7v7l9-11h-7z",
  x: "M6 18L18 6M6 6l12 12",
  chevL: "M15 19l-7-7 7-7",
  chevR: "M9 5l7 7-7 7",
  check: "M5 13l4 4L19 7",
  map: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  note: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  dollar: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
};

const Ic = ({ n, s = 20, c = C.text3, style = {} }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {(PATHS[n] || "").split("M").filter(Boolean).map((d, i) => <path key={i} d={"M" + d} />)}
  </svg>
);

const Avatar = ({ name = "", size = 40, color = C.accent }) => {
  const initials = name.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "white", fontFamily: F, flexShrink: 0 }}>
      {initials || "?"}
    </div>
  );
};

const Badge = ({ label, color }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px",
    borderRadius: 99, fontSize: 11, fontWeight: 700, background: `${color}18`,
    color, fontFamily: F, whiteSpace: "nowrap" }}>{label}</span>
);

const Sheet = ({ open, onClose, title, children, height = "88vh" }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", background: C.card, borderRadius: "20px 20px 0 0",
        maxHeight: height, display: "flex", flexDirection: "column",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
        animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
        </div>
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: C.text1, fontFamily: F }}>{title}</span>
            <button onClick={onClose} style={{ background: C.bg, border: "none", borderRadius: 99,
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Ic n="x" s={16} c={C.text3} />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
};

const Chip = ({ icon, label, onClick, color = C.accent }) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px", borderRadius: 99, border: `1.5px solid ${color}28`,
    background: `${color}10`, color, fontSize: 13, fontWeight: 600, fontFamily: F,
    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
    <Ic n={icon} s={14} c={color} />{label}
  </button>
);

// ── COPILOT SCREEN ─────────────────────────────────────────────────────────
const CopilotScreen = ({ session, environment, onNavigate }) => {
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: `Hi ${session?.first_name || "there"} 👋 I'm your recruiting copilot. What do you need today?`,
    time: new Date()
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
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
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg, time: new Date() }]);
    setLoading(true);
    try {
      const system = `You are a mobile recruiting copilot for Vercentic. Be very concise (2-3 sentences max for mobile). User: ${session?.first_name} ${session?.last_name}. Environment: ${environment?.name}. If user wants to see candidates/interviews/jobs, end your response with [NAVIGATE:candidates], [NAVIGATE:interviews], or [NAVIGATE:jobs].`;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.text })), { role: "user", content: msg }],
          system
        })
      });
      const data = await res.json();
      let reply = data.content?.[0]?.text || data.reply || "I couldn't process that.";
      const nav = reply.match(/\[NAVIGATE:(\w+)\]/);
      if (nav) { reply = reply.replace(/\[NAVIGATE:\w+\]/, "").trim(); setTimeout(() => onNavigate(nav[1]), 400); }
      setMessages(prev => [...prev, { role: "assistant", text: reply, time: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I ran into an issue.", time: new Date() }]);
    }
    setLoading(false);
  };

  const timeStr = d => {
    const s = (new Date() - new Date(d)) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const chips = [
    { icon: "calendar", label: todayCount > 0 ? `Today (${todayCount})` : "Today's interviews", action: () => onNavigate("interviews"), color: C.purple },
    { icon: "users", label: "Candidates", action: () => onNavigate("candidates"), color: C.accent },
    { icon: "briefcase", label: "Jobs", action: () => onNavigate("jobs"), color: C.teal },
    { icon: "search", label: "Search", action: () => { setInput("Find "); inputRef.current?.focus(); }, color: C.text3 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 16 }}>
            {m.role === "assistant" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ic n="spark" s={14} c="white" />
                </div>
                <span style={{ fontSize: 11, color: C.text4, fontFamily: F }}>{timeStr(m.time)}</span>
              </div>
            )}
            <div style={{ maxWidth: "82%", padding: "12px 16px",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
              background: m.role === "user" ? `linear-gradient(135deg,${C.accent},${C.accentDark})` : C.card,
              color: m.role === "user" ? "white" : C.text1, fontSize: 15, lineHeight: 1.55, fontFamily: F,
              boxShadow: m.role === "user" ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
              border: m.role === "user" ? "none" : `1px solid ${C.border}` }}>
              {m.text}
            </div>
            {m.role === "user" && <span style={{ fontSize: 11, color: C.text4, fontFamily: F, marginTop: 4 }}>{timeStr(m.time)}</span>}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic n="spark" s={14} c="white" />
            </div>
            <div style={{ padding: "12px 16px", borderRadius: "4px 18px 18px 18px", background: C.card, border: `1px solid ${C.border}`, display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.text4, animation: `pulse 1.4s ${i * 0.2}s ease-in-out infinite` }} />)}
              <style>{`@keyframes pulse{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {messages.length <= 1 && (
        <div style={{ padding: "0 16px 12px", overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
            {chips.map((c, i) => <Chip key={i} icon={c.icon} label={c.label} onClick={c.action} color={c.color} />)}
          </div>
        </div>
      )}
      <div style={{ padding: "12px 16px 16px", background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", background: C.bg, borderRadius: 24, border: `1.5px solid ${C.border}`, padding: "10px 16px" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask me anything..."
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, color: C.text1, fontFamily: F, outline: "none" }} />
        </div>
        <button onClick={() => send(input)} disabled={!input.trim() || loading}
          style={{ width: 44, height: 44, borderRadius: "50%", border: "none",
            background: input.trim() && !loading ? `linear-gradient(135deg,${C.accent},${C.accentDark})` : C.border,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() && !loading ? "pointer" : "default", transition: "all 0.2s", flexShrink: 0 }}>
          <Ic n="send" s={18} c="white" />
        </button>
      </div>
    </div>
  );
};

// ── CANDIDATE DETAIL ────────────────────────────────────────────────────────
const CandidateDetail = ({ record }) => {
  const d = record.data || {};
  const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || "Unnamed";
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/records/${record.id}/notes`).then(n => setNotes(Array.isArray(n) ? n : [])).catch(() => {});
  }, [record.id]);

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const n = await api.post(`/records/${record.id}/notes`, { content: note });
      setNotes(p => [n, ...p]);
      setNote("");
    } catch {}
    setSaving(false);
  };

  const fields = [
    { l: "Email", v: d.email, i: "mail" },
    { l: "Phone", v: d.phone, i: "phone" },
    { l: "Location", v: d.location, i: "map" },
    { l: "Role", v: d.current_title || d.job_title, i: "briefcase" },
    { l: "Status", v: d.status, i: "layers" },
    { l: "Source", v: d.source, i: "user" },
  ].filter(f => f.v);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: "20px 20px 16px", background: `linear-gradient(135deg,${C.accentLight},#F5F3FF)`, borderBottom: `1px solid ${C.border}`, textAlign: "center" }}>
        <Avatar name={name} size={64} color={C.accent} />
        <div style={{ marginTop: 12, fontSize: 20, fontWeight: 700, color: C.text1, fontFamily: F }}>{name}</div>
        <div style={{ fontSize: 14, color: C.text3, fontFamily: F, marginTop: 2 }}>{d.current_title || d.job_title || d.email || ""}</div>
        {d.status && <div style={{ marginTop: 8 }}><Badge label={d.status} color={statusColor(d.status)} /></div>}
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
        {d.phone && <a href={`tel:${d.phone}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 4, textDecoration: "none", borderRight: `1px solid ${C.border}` }}><Ic n="phone" s={20} c={C.success} /><span style={{ fontSize: 11, color: C.success, fontFamily: F, fontWeight: 600 }}>Call</span></a>}
        {d.email && <a href={`mailto:${d.email}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 4, textDecoration: "none" }}><Ic n="mail" s={20} c={C.accent} /><span style={{ fontSize: 11, color: C.accent, fontFamily: F, fontWeight: 600 }}>Email</span></a>}
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text4, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, fontFamily: F }}>Profile</div>
        {fields.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < fields.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <Ic n={f.i} s={16} c={C.text4} />
            <div>
              <div style={{ fontSize: 11, color: C.text4, fontFamily: F, marginBottom: 1 }}>{f.l}</div>
              <div style={{ fontSize: 14, color: C.text2, fontFamily: F, fontWeight: 500 }}>{f.v}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text4, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12, fontFamily: F }}>Notes</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()}
            placeholder="Add a note..."
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: F, outline: "none", color: C.text1, background: C.bg }} />
          <button onClick={addNote} disabled={!note.trim() || saving}
            style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: note.trim() ? C.accent : C.border, color: "white", fontSize: 13, fontWeight: 600, fontFamily: F, cursor: note.trim() ? "pointer" : "default" }}>
            {saving ? "..." : "Add"}
          </button>
        </div>
        {notes.map((n, i) => (
          <div key={i} style={{ padding: "10px 14px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, marginBottom: 8 }}>
            <div style={{ fontSize: 14, color: C.text2, fontFamily: F, lineHeight: 1.5 }}>{n.content}</div>
            <div style={{ fontSize: 11, color: C.text4, fontFamily: F, marginTop: 4 }}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : "Just now"}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── CANDIDATES SCREEN ───────────────────────────────────────────────────────
const CandidatesScreen = ({ environment }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(null);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`).then(objs => {
      const o = (objs || []).find(o => o.slug === "people" || o.name?.toLowerCase().includes("people"));
      if (o) return api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=50`);
    }).then(d => { setRecords(d?.records || []); setLoading(false); }).catch(() => setLoading(false));
  }, [environment?.id]);

  const getName = r => [r.data?.first_name, r.data?.last_name].filter(Boolean).join(" ") || r.data?.email || "Unnamed";
  const colorFor = n => { const cols = [C.accent, C.purple, C.teal, "#E85D04", C.success]; let h = 0; for (let c of n) h += c.charCodeAt(0); return cols[h % cols.length]; };
  const filtered = records.filter(r => { const n = getName(r).toLowerCase(); const t = (r.data?.current_title || r.data?.job_title || "").toLowerCase(); const q = search.toLowerCase(); return !q || n.includes(q) || t.includes(q); });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "12px 16px", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, borderRadius: 12, padding: "10px 14px", border: `1.5px solid ${C.border}` }}>
          <Ic n="search" s={16} c={C.text4} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates..."
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, fontFamily: F, color: C.text1, outline: "none" }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: C.text4, fontFamily: F }}>Loading...</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: C.text4, fontFamily: F }}>{search ? "No matches" : "No candidates yet"}</div>
          : filtered.map(r => {
            const name = getName(r); const col = colorFor(name); const status = r.data?.status || r.data?.pipeline_stage;
            return (
              <button key={r.id} onClick={() => setSel(r)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "white", fontFamily: F, flexShrink: 0 }}>
                  {name.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: F, marginBottom: 3 }}>{name}</div>
                  <div style={{ fontSize: 13, color: C.text3, fontFamily: F, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.data?.current_title || r.data?.job_title || r.data?.email || "No title"}</div>
                  {status && <Badge label={status} color={statusColor(status)} />}
                </div>
                <Ic n="chevR" s={16} c={C.text4} />
              </button>
            );
          })}
      </div>
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? getName(sel) : ""} height="80vh">
        {sel && <CandidateDetail record={sel} />}
      </Sheet>
    </div>
  );
};

// ── INTERVIEWS SCREEN ───────────────────────────────────────────────────────
const InterviewsScreen = ({ environment }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("today");
  const [sel, setSel] = useState(null);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/interviews?environment_id=${environment.id}&limit=50`).then(d => { setItems(d?.items || []); setLoading(false); }).catch(() => setLoading(false));
  }, [environment?.id]);

  const today = new Date().toDateString();
  const tom = new Date(Date.now() + 86400000).toDateString();
  const filtered = items.filter(i => { const d = new Date(i.date).toDateString(); if (filter === "today") return d === today; if (filter === "tomorrow") return d === tom; if (filter === "upcoming") return new Date(i.date) >= new Date(); return true; });
  const fmtTime = (date, time) => time || new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = date => { const d = new Date(date).toDateString(); if (d === today) return "Today"; if (d === tom) return "Tomorrow"; return new Date(date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); };
  const typeCol = f => ({ video: C.accent, phone: C.success, onsite: C.purple, panel: C.warning }[f?.toLowerCase()] || C.text3);
  const tabs = [{ id: "today", label: "Today" }, { id: "tomorrow", label: "Tomorrow" }, { id: "upcoming", label: "Upcoming" }, { id: "all", label: "All" }];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", gap: 6 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{ padding: "7px 14px", borderRadius: 99, border: "none", background: filter === t.id ? C.accent : C.bg, color: filter === t.id ? "white" : C.text3, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer" }}>
            {t.label}
            {t.id === "today" && items.filter(i => new Date(i.date).toDateString() === today).length > 0 && (
              <span style={{ marginLeft: 5, background: filter === "today" ? "rgba(255,255,255,0.3)" : C.accent, color: "white", borderRadius: 99, padding: "1px 6px", fontSize: 11 }}>
                {items.filter(i => new Date(i.date).toDateString() === today).length}
              </span>
            )}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: C.text4, fontFamily: F }}>Loading...</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: "center" }}><Ic n="calendar" s={40} c={C.border} /><div style={{ marginTop: 12, fontSize: 15, color: C.text4, fontFamily: F }}>No interviews scheduled</div></div>
          : filtered.map((iv, i) => {
            const col = typeCol(iv.format);
            return (
              <button key={iv.id || i} onClick={() => setSel(iv)} style={{ width: "100%", display: "flex", gap: 14, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${C.border}`, alignItems: "flex-start" }}>
                <div style={{ width: 52, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text1, fontFamily: F }}>{fmtTime(iv.date, iv.time)}</div>
                  {iv.duration_minutes && <div style={{ fontSize: 11, color: C.text4, fontFamily: F, marginTop: 2 }}>{iv.duration_minutes}m</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: col }} />
                  <div style={{ width: 2, flex: 1, background: `${col}30`, marginTop: 4 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: F, marginBottom: 2 }}>{iv.candidate_name || "Candidate"}</div>
                  <div style={{ fontSize: 13, color: C.text3, fontFamily: F, marginBottom: 6 }}>{iv.job_title || iv.type_name || "Interview"} · {fmtDate(iv.date)}</div>
                  {iv.format && <Badge label={iv.format} color={col} />}
                </div>
                <Ic n="chevR" s={16} c={C.text4} style={{ marginTop: 4 }} />
              </button>
            );
          })}
      </div>
      <Sheet open={!!sel} onClose={() => setSel(null)} title="Interview Details">
        {sel && (
          <div style={{ padding: "20px 20px 40px" }}>
            <div style={{ background: `${typeCol(sel.format)}10`, border: `1px solid ${typeCol(sel.format)}30`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text1, fontFamily: F, marginBottom: 4 }}>{sel.candidate_name || "Candidate"}</div>
              <div style={{ fontSize: 14, color: C.text3, fontFamily: F }}>{sel.job_title || sel.type_name || "Interview"}</div>
            </div>
            {[{ l: "Date & Time", v: `${fmtDate(sel.date)} at ${fmtTime(sel.date, sel.time)}`, i: "calendar" }, { l: "Duration", v: sel.duration_minutes ? `${sel.duration_minutes} min` : "—", i: "clock" }, { l: "Format", v: sel.format || "—", i: "layers" }, { l: "Location", v: sel.location || sel.video_link || "—", i: "map" }].map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${C.border}`, alignItems: "flex-start" }}>
                <Ic n={row.i} s={16} c={C.text4} style={{ marginTop: 2 }} />
                <div><div style={{ fontSize: 11, color: C.text4, fontFamily: F, marginBottom: 2 }}>{row.l}</div><div style={{ fontSize: 14, color: C.text2, fontFamily: F, fontWeight: 500 }}>{row.v}</div></div>
              </div>
            ))}
            {sel.notes && <div style={{ marginTop: 16, padding: 14, background: C.bg, borderRadius: 10 }}><div style={{ fontSize: 12, color: C.text4, fontFamily: F, marginBottom: 6 }}>Notes</div><div style={{ fontSize: 14, color: C.text2, fontFamily: F, lineHeight: 1.6 }}>{sel.notes}</div></div>}
            <button style={{ width: "100%", marginTop: 20, padding: 14, borderRadius: 12, border: "none", background: `linear-gradient(135deg,${C.accent},${C.accentDark})`, color: "white", fontSize: 15, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>Submit Scorecard</button>
          </div>
        )}
      </Sheet>
    </div>
  );
};

// ── JOBS SCREEN ─────────────────────────────────────────────────────────────
const JobsScreen = ({ environment }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(null);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`).then(objs => {
      const o = (objs || []).find(o => o.slug === "jobs" || o.name?.toLowerCase().includes("job"));
      if (o) return api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=50`);
    }).then(d => { setJobs(d?.records || []); setLoading(false); }).catch(() => setLoading(false));
  }, [environment?.id]);

  const getTitle = j => j.data?.job_title || j.data?.title || "Untitled Role";
  const getStatus = j => j.data?.status || "Open";
  const filtered = jobs.filter(j => { const t = getTitle(j).toLowerCase(); const d = (j.data?.department || "").toLowerCase(); const q = search.toLowerCase(); return !q || t.includes(q) || d.includes(q); });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ padding: "12px 16px", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, borderRadius: 12, padding: "10px 14px", border: `1.5px solid ${C.border}` }}>
          <Ic n="search" s={16} c={C.text4} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..."
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, fontFamily: F, color: C.text1, outline: "none" }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: C.text4, fontFamily: F }}>Loading...</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: C.text4, fontFamily: F }}>No jobs found</div>
          : <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(j => {
              const status = getStatus(j); const col = statusColor(status);
              return (
                <button key={j.id} onClick={() => setSel(j)} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, textAlign: "left", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderLeft: `4px solid ${col}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, fontFamily: F, flex: 1, marginRight: 8 }}>{getTitle(j)}</div>
                    <Badge label={status} color={col} />
                  </div>
                  {j.data?.department && <div style={{ fontSize: 13, color: C.text3, fontFamily: F, marginBottom: 4 }}>{j.data.department}</div>}
                  {j.data?.location && <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Ic n="map" s={12} c={C.text4} /><span style={{ fontSize: 12, color: C.text4, fontFamily: F }}>{j.data.location}</span></div>}
                </button>
              );
            })}
          </div>}
      </div>
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? getTitle(sel) : ""}>
        {sel && (
          <div style={{ padding: "20px 20px 40px" }}>
            {[{ l: "Department", v: sel.data?.department, i: "layers" }, { l: "Location", v: sel.data?.location, i: "map" }, { l: "Status", v: getStatus(sel), i: "check" }, { l: "Type", v: sel.data?.employment_type, i: "briefcase" }].filter(f => f.v).map((row, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "flex-start" }}>
                <Ic n={row.i} s={16} c={C.text4} style={{ marginTop: 2 }} />
                <div><div style={{ fontSize: 11, color: C.text4, fontFamily: F, marginBottom: 2 }}>{row.l}</div><div style={{ fontSize: 14, color: C.text2, fontFamily: F, fontWeight: 500 }}>{row.v}</div></div>
              </div>
            ))}
            {sel.data?.description && <div style={{ marginTop: 16, padding: 14, background: C.bg, borderRadius: 10 }}><div style={{ fontSize: 12, color: C.text4, fontFamily: F, marginBottom: 8 }}>Description</div><div style={{ fontSize: 14, color: C.text2, fontFamily: F, lineHeight: 1.7 }}>{sel.data.description}</div></div>}
          </div>
        )}
      </Sheet>
    </div>
  );
};

// ── MOBILE SHELL ─────────────────────────────────────────────────────────────
export const MobileShell = ({ session, environment, objects }) => {
  const [screen, setScreen] = useState("copilot");
  const nav = [
    { id: "copilot", icon: "spark", label: "Copilot" },
    { id: "candidates", icon: "users", label: "Candidates" },
    { id: "interviews", icon: "calendar", label: "Interviews" },
    { id: "jobs", icon: "briefcase", label: "Jobs" },
    { id: "more", icon: "more", label: "More" },
  ];
  const titles = { copilot: "Vercentic", candidates: "Candidates", interviews: "Interviews", jobs: "Jobs", more: "More" };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: C.bg, fontFamily: F, overscrollBehavior: "none", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 56, position: "sticky", top: 0, zIndex: 10 }}>
        {screen !== "copilot" ? (
          <button onClick={() => setScreen("copilot")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
            <Ic n="chevL" s={20} c={C.accent} />
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic n="spark" s={15} c="white" />
            </div>
          </div>
        )}
        <span style={{ fontSize: 17, fontWeight: 700, color: C.text1 }}>{titles[screen]}</span>
        <Avatar name={[session?.first_name || "", session?.last_name || ""].join(" ").trim() || "U"} size={32} color={C.accent} />
      </div>

      {/* Screen Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {screen === "copilot" && <CopilotScreen session={session} environment={environment} onNavigate={setScreen} />}
        {screen === "candidates" && <CandidatesScreen environment={environment} />}
        {screen === "interviews" && <InterviewsScreen environment={environment} />}
        {screen === "jobs" && <JobsScreen environment={environment} />}
        {screen === "more" && <div style={{ padding: 40, textAlign: "center", color: C.text4, fontFamily: F, marginTop: 40 }}>More features coming soon</div>}
      </div>

      {/* Bottom Nav */}
      <div style={{ background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", position: "sticky", bottom: 0 }}>
        {nav.map(item => {
          const active = screen === item.id;
          return (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 8px", background: "none", border: "none", cursor: "pointer", gap: 3, position: "relative" }}>
              {active && item.id === "copilot" && (
                <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 32, height: 3, borderRadius: "0 0 3px 3px", background: `linear-gradient(90deg,${C.accent},${C.purple})` }} />
              )}
              {item.id === "copilot" && active ? (
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${C.accent}40` }}>
                  <Ic n={item.icon} s={18} c="white" />
                </div>
              ) : <Ic n={item.icon} s={22} c={active ? C.accent : C.text4} />}
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? C.accent : C.text4, fontFamily: F }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── MOBILE DETECTION HOOK ────────────────────────────────────────────────────
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};
