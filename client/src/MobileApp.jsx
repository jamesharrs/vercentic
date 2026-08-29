import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import _apiClient from "./apiClient.js";
import { useToast } from "./Toast.jsx";

function _sessionKey() {
  try {
    const host = window.location.hostname;
    const parts = host.split('.');
    const reserved = ['www','app','api','admin','localhost','client','portal'];
    const isSubdomain = parts.length >= 3 && !reserved.includes(parts[0]) &&
      !['vercel','railway','up','netlify','localhost'].some(r => host.includes(r));
    return isSubdomain ? `vercentic_session_${parts[0]}` : 'vercentic_session_default';
  } catch { return 'vercentic_session_default'; }
}

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

// ─── API helper — surfaces real errors instead of swallowing ──────────────────
const api = {
  async get(p) {
    try {
      const d = await _apiClient.get(p);
      if (d && typeof d === 'object' && d.error && !Array.isArray(d)) {
        return { ok: false, error: d.error, data: null };
      }
      return { ok: true, data: d, error: null };
    } catch (err) {
      return { ok: false, error: err?.message || 'Network error', data: null };
    }
  },
  async post(p, b) {
    try {
      const d = await _apiClient.post(p, b);
      if (d && typeof d === 'object' && d.error) {
        return { ok: false, error: d.error, data: null };
      }
      return { ok: true, data: d, error: null };
    } catch (err) {
      return { ok: false, error: err?.message || 'Network error', data: null };
    }
  },
  async patch(p, b) {
    try {
      const d = await _apiClient.patch(p, b);
      if (d && typeof d === 'object' && d.error) {
        return { ok: false, error: d.error, data: null };
      }
      return { ok: true, data: d, error: null };
    } catch (err) {
      return { ok: false, error: err?.message || 'Network error', data: null };
    }
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
  plus:      "M12 4v16m-8-8h16",
  mic:       "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8",
  refresh:   "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  trash:     "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  alert:     "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  wifi:      "M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01",
  inbox:     "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
  monitor:   "M2 4a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2zM8 22h8M12 18v4",
};

const Ic = ({ n, s = 20, c = V.muted, style = {} }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    {(PATHS[n] || "").split("M").filter(Boolean).map((d, i) => <path key={i} d={"M" + d} />)}
  </svg>
);

const VIcon = ({ size = 24, color = "#0D0D0F" }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
    <path d="M8 52 L40 36 L72 52 L40 68 Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
    <path d="M8 52 L8 62 L40 78 L40 68 Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
    <path d="M72 52 L72 62 L40 78 L40 68 Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.3"/>
    <path d="M20 34 L40 24 L60 34 L40 44 Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
    <path d="M20 34 L20 42 L40 52 L40 44 Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
    <path d="M60 34 L60 42 L40 52 L40 44 Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.3"/>
    <path d="M28 18 L40 12 L52 18 L40 24 Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
    <path d="M28 18 L28 24 L40 30 L40 24 Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none"/>
    <path d="M52 18 L52 24 L40 30 L40 24 Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.3"/>
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

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const Skeleton = ({ count = 6, type = "row" }) => {
  const items = Array.from({ length: count });
  return (
    <div>
      <style>{`@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}.skel{background:linear-gradient(90deg,rgba(0,0,0,0.04) 0%,rgba(0,0,0,0.08) 50%,rgba(0,0,0,0.04) 100%);background-size:400px 100%;animation:shimmer 1.4s ease-in-out infinite}`}</style>
      {items.map((_, i) => (
        type === "card" ? (
          <div key={i} style={{ padding: 14, margin: 14, background: V.cardSolid, borderRadius: 18, border: `1px solid ${V.cardBorder}` }}>
            <div className="skel" style={{ height: 16, borderRadius: 6, marginBottom: 10, width: "70%" }} />
            <div className="skel" style={{ height: 12, borderRadius: 6, width: "50%" }} />
          </div>
        ) : (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: `1px solid ${V.cardBorder}` }}>
            <div className="skel" style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="skel" style={{ height: 14, borderRadius: 6, marginBottom: 8, width: "60%" }} />
              <div className="skel" style={{ height: 12, borderRadius: 6, width: "40%" }} />
            </div>
          </div>
        )
      ))}
    </div>
  );
};

const EmptyState = ({ icon = "inbox", title, body, action }) => (
  <div style={{ padding: "60px 32px", textAlign: "center", color: V.muted, fontFamily: F }}>
    <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(0,0,0,0.04)",
      display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
      <Ic n={icon} s={24} c={V.muted} />
    </div>
    <div style={{ fontSize: 16, fontWeight: 700, color: V.inkMid, fontFamily: FD, marginBottom: 6, letterSpacing: "-0.02em" }}>{title}</div>
    {body && <div style={{ fontSize: 13, lineHeight: 1.55, maxWidth: 280, margin: "0 auto 16px" }}>{body}</div>}
    {action}
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div style={{ padding: "60px 32px", textAlign: "center", color: V.muted, fontFamily: F }}>
    <div style={{ width: 56, height: 56, borderRadius: 18, background: `${V.danger}15`,
      display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
      <Ic n="alert" s={24} c={V.danger} />
    </div>
    <div style={{ fontSize: 16, fontWeight: 700, color: V.inkMid, fontFamily: FD, marginBottom: 6, letterSpacing: "-0.02em" }}>Couldn't load data</div>
    <div style={{ fontSize: 13, lineHeight: 1.55, maxWidth: 280, margin: "0 auto 16px" }}>{message || "Something went wrong"}</div>
    {onRetry && (
      <button onClick={onRetry} style={{ padding: "10px 22px", borderRadius: 12, border: "none",
        background: V.ink, color: "white", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Ic n="refresh" s={14} c="white" /> Try again
      </button>
    )}
  </div>
);

// ─── Pull-to-refresh ──────────────────────────────────────────────────────────
const PullToRefresh = ({ onRefresh, children, disabled = false }) => {
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollRef = useRef(null);
  const THRESHOLD = 70;

  const onTouchStart = (e) => {
    if (disabled || refreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (disabled || refreshing || !startY.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPullDist(Math.min(dy * 0.5, 100));
  };
  const onTouchEnd = async () => {
    if (disabled || refreshing) { startY.current = 0; return; }
    if (pullDist >= THRESHOLD) {
      setRefreshing(true);
      setPullDist(50);
      try { await onRefresh(); } catch {}
      setRefreshing(false);
    }
    setPullDist(0);
    startY.current = 0;
  };

  const progress = Math.min(pullDist / THRESHOLD, 1);

  return (
    <div ref={scrollRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", position: "relative", touchAction: "pan-y" }}>
      <div style={{
        height: pullDist, display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingBottom: pullDist > 8 ? 8 : 0, transition: refreshing ? "none" : "height 0.2s",
        overflow: "hidden",
      }}>
        {pullDist > 8 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, color: V.muted,
            transform: `rotate(${refreshing ? 0 : progress * 360}deg)`,
            animation: refreshing ? "spin 0.8s linear infinite" : "none",
          }}>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            <Ic n="refresh" s={16} c={progress >= 1 ? V.ink : V.muted} />
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

const FAB = ({ icon = "plus", onClick, label, color = V.ink }) => (
  <button onClick={onClick}
    style={{
      position: "absolute", bottom: 20, right: 20, zIndex: 50,
      width: 56, height: 56, borderRadius: 18, border: "none",
      background: color, color: "white", boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      transition: "transform 0.15s",
    }}
    onTouchStart={e => { e.currentTarget.style.transform = "scale(0.94)"; }}
    onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
    aria-label={label}>
    <Ic n={icon} s={24} c="white" />
  </button>
);

// ─── SwipeRow ────────────────────────────────────────────────────────────────
const SwipeRow = ({ children, onCall, onEmail, hasPhone, hasEmail }) => {
  const [x, setX] = useState(0);
  const [startX, setStartX] = useState(null);
  const [animating, setAnimating] = useState(false);
  const ACTION_WIDTH = 84;

  const onTouchStart = (e) => { setStartX(e.touches[0].clientX); setAnimating(false); };
  const onTouchMove = (e) => {
    if (startX === null) return;
    const dx = e.touches[0].clientX - startX;
    const clamped = Math.max(-ACTION_WIDTH * 1.2, Math.min(ACTION_WIDTH * 1.2, dx));
    setX(clamped);
  };
  const onTouchEnd = () => {
    setStartX(null);
    setAnimating(true);
    if (x > ACTION_WIDTH * 0.6 && onCall && hasPhone) { onCall(); setX(0); }
    else if (x < -ACTION_WIDTH * 0.6 && onEmail && hasEmail) { onEmail(); setX(0); }
    else setX(0);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden", background: V.cardSolid }}>
      {hasPhone && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: ACTION_WIDTH,
          background: V.success, display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", flexDirection: "column", gap: 4,
        }}>
          <Ic n="phone" s={20} c="white" />
          <span style={{ fontSize: 11, fontFamily: F, fontWeight: 700 }}>Call</span>
        </div>
      )}
      {hasEmail && (
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: ACTION_WIDTH,
          background: V.lavender, display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", flexDirection: "column", gap: 4,
        }}>
          <Ic n="mail" s={20} c="white" />
          <span style={{ fontSize: 11, fontFamily: F, fontWeight: 700 }}>Email</span>
        </div>
      )}
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${x}px)`,
          transition: animating ? "transform 0.22s cubic-bezier(0.34,1.2,0.64,1)" : "none",
          background: V.cardSolid, position: "relative", zIndex: 1,
        }}>
        {children}
      </div>
    </div>
  );
};

// ─── COPILOT SCREEN ───────────────────────────────────────────────────────────
const CopilotScreen = ({ session, environment, onNavigate }) => {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const recogRef = useRef(null);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/interviews?environment_id=${environment.id}&limit=20`).then(res => {
      if (res.ok) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        const today = new Date().toDateString();
        setTodayCount(items.filter(i => new Date(i.date).toDateString() === today).length);
      }
    });
  }, [environment?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const speechSupported = typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleVoice = () => {
    if (!speechSupported) {
      toast?.warning?.("Voice input is not supported on this browser");
      return;
    }
    if (listening) { recogRef.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = navigator.language || "en-GB";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const txt = Array.from(e.results).map(res => res[0].transcript).join("");
      setInput(txt);
    };
    r.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast?.error?.("Microphone permission denied");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        toast?.error?.("Voice input error: " + e.error);
      }
    };
    r.onend = () => setListening(false);
    recogRef.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); }
  };

  const send = async (text) => {
    const msg = text.trim();
    if (!msg) return;
    if (!started) setStarted(true);
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg, time: new Date() }]);
    setLoading(true);
    try {
      const system = `You are the Vercentic copilot on mobile. Be very concise (2-3 sentences max). User: ${session?.first_name} ${session?.last_name}. Env: ${environment?.name}. If user wants to navigate, end with [NAVIGATE:candidates], [NAVIGATE:interviews], or [NAVIGATE:jobs].`;
      const res = await _apiClient.post("/ai/chat", {
        messages: [...messages.map(m => ({ role: m.role, content: m.text })), { role: "user", content: msg }],
        system,
      });
      const replyText = res?.content || res?.message || (typeof res === "string" ? res : "I'm not sure how to help with that yet.");
      const nav = replyText.match(/\[NAVIGATE:(\w+)\]/);
      const clean = replyText.replace(/\[NAVIGATE:\w+\]/g, "").trim();
      setMessages(prev => [...prev, { role: "assistant", text: clean, time: new Date() }]);
      if (nav && onNavigate) setTimeout(() => onNavigate(nav[1]), 500);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I had trouble reaching the AI service.", time: new Date(), error: true }]);
      toast?.error?.("Couldn't reach the AI service");
    }
    setLoading(false);
  };

  const quickActions = [
    { label: "Today's interviews", icon: "calendar", action: () => onNavigate?.("interviews"), count: todayCount },
    { label: "Find a candidate", icon: "users", action: () => onNavigate?.("candidates") },
    { label: "Open jobs", icon: "briefcase", action: () => onNavigate?.("jobs") },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: V.gradientBg, position: "relative" }}>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: started ? "16px 14px 12px" : "20px 22px" }}>
        {!started ? (
          <div>
            <div style={{ marginTop: 10, marginBottom: 26 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 6 }}>
                Hi {session?.first_name || "there"}.
              </div>
              <div style={{ fontSize: 15, color: V.muted, fontFamily: F, lineHeight: 1.5 }}>
                What can I help you with?
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {quickActions.map(qa => (
                <button key={qa.label} onClick={qa.action}
                  style={{
                    background: V.cardSolid, border: `1px solid ${V.cardBorder}`,
                    borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                    cursor: "pointer", textAlign: "left", boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: "rgba(13,13,15,0.05)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Ic n={qa.icon} s={18} c={V.inkMid} />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: V.inkMid, fontFamily: F }}>{qa.label}</span>
                  {qa.count ? <Badge label={qa.count} color={V.lavender} /> : null}
                  <Ic n="chevR" s={16} c={V.muted} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}>
                <div style={{
                  maxWidth: "82%",
                  padding: "10px 14px", borderRadius: 18,
                  background: m.role === "user" ? V.ink : (m.error ? `${V.danger}10` : V.cardSolid),
                  color: m.role === "user" ? "white" : (m.error ? V.danger : V.inkMid),
                  fontSize: 14, fontFamily: F, lineHeight: 1.45,
                  border: m.role === "assistant" && !m.error ? `1px solid ${V.cardBorder}` : "none",
                  boxShadow: m.role === "assistant" ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
                  whiteSpace: "pre-wrap",
                }}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                <div style={{ padding: "10px 14px", background: V.cardSolid, borderRadius: 18, border: `1px solid ${V.cardBorder}` }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: "50%", background: V.muted,
                        animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                      }} />
                    ))}
                  </div>
                  <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div style={{
        background: V.cardSolid, borderTop: `1px solid ${V.cardBorder}`,
        padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
        flexShrink: 0,
      }}>
        <input ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(input); }}
          placeholder={listening ? "Listening…" : "Ask anything…"}
          style={{
            flex: 1, padding: "11px 14px", borderRadius: 99,
            border: `1px solid ${V.cardBorder}`, background: "rgba(0,0,0,0.03)",
            fontSize: 15, fontFamily: F, color: V.inkMid, outline: "none",
          }}
        />
        {speechSupported && (
          <button onClick={toggleVoice}
            style={{
              width: 42, height: 42, borderRadius: 99, border: "none",
              background: listening ? V.danger : "rgba(0,0,0,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "background 0.18s",
              animation: listening ? "pulse 1.2s ease-in-out infinite" : "none",
            }}
            aria-label="Voice input">
            <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
            <Ic n="mic" s={18} c={listening ? "white" : V.inkMid} />
          </button>
        )}
        <button onClick={() => send(input)} disabled={!input.trim() || loading}
          style={{
            width: 42, height: 42, borderRadius: 99, border: "none",
            background: input.trim() && !loading ? V.ink : "rgba(0,0,0,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() && !loading ? "pointer" : "default", transition: "background 0.18s",
          }}>
          <Ic n="send" s={16} c={input.trim() && !loading ? "white" : V.muted} />
        </button>
      </div>
    </div>
  );
};

// ─── CANDIDATE DETAIL ─────────────────────────────────────────────────────────
const CandidateDetail = ({ record, onUpdate }) => {
  const toast = useToast();
  const d = record.data || {};
  const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || "Unnamed";
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [stageBusy, setStageBusy] = useState(false);

  useEffect(() => {
    api.get(`/records/${record.id}/notes`).then(res => {
      if (res.ok) setNotes(Array.isArray(res.data) ? res.data : []);
    });
  }, [record.id]);

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    const res = await api.post(`/records/${record.id}/notes`, { content: note });
    if (res.ok && res.data) {
      setNotes(p => [res.data, ...p]);
      setNote("");
      toast?.success?.("Note added");
    } else {
      toast?.error?.(res.error || "Could not save note");
    }
    setSaving(false);
  };

  const currentStage = d.pipeline_stage || d.status || d.stage || null;
  const STAGES = ["new", "screening", "interview", "offer", "hired"];
  const REJECT = ["declined", "withdrawn", "rejected"];

  const advanceStage = async (next) => {
    setStageBusy(true);
    const field = d.pipeline_stage ? "pipeline_stage" : "status";
    const res = await api.patch(`/records/${record.id}`, { data: { ...d, [field]: next } });
    if (res.ok) {
      toast?.success?.(`Moved to ${next}`);
      onUpdate?.({ ...record, data: { ...d, [field]: next } });
    } else {
      toast?.error?.(res.error || "Could not update stage");
    }
    setStageBusy(false);
  };

  const currentIdx = currentStage ? STAGES.indexOf(currentStage.toLowerCase()) : -1;
  const canAdvance = currentIdx >= 0 && currentIdx < STAGES.length - 1;
  const nextStage = canAdvance ? STAGES[currentIdx + 1] : null;
  const isRejected = currentStage && REJECT.includes(currentStage.toLowerCase());

  const callPhone = () => {
    if (d.phone) window.location.href = `tel:${d.phone}`;
    else toast?.warning?.("No phone number on file");
  };
  const sendEmail = () => {
    if (d.email) window.location.href = `mailto:${d.email}`;
    else toast?.warning?.("No email address on file");
  };

  return (
    <div style={{ padding: "18px 22px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Avatar name={name} size={52} color={V.lavender} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.03em" }}>{name}</div>
          {d.current_title && <div style={{ fontSize: 13, color: V.muted, fontFamily: F, marginTop: 2 }}>{d.current_title}</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <button onClick={callPhone} disabled={!d.phone}
          style={{ flex: 1, padding: "12px", borderRadius: 14, border: `1px solid ${V.cardBorder}`,
            background: d.phone ? V.cardSolid : "rgba(0,0,0,0.02)", color: d.phone ? V.success : V.muted,
            cursor: d.phone ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 13, fontWeight: 700, fontFamily: F }}>
          <Ic n="phone" s={14} c={d.phone ? V.success : V.muted} /> Call
        </button>
        <button onClick={sendEmail} disabled={!d.email}
          style={{ flex: 1, padding: "12px", borderRadius: 14, border: `1px solid ${V.cardBorder}`,
            background: d.email ? V.cardSolid : "rgba(0,0,0,0.02)", color: d.email ? V.lavender : V.muted,
            cursor: d.email ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 13, fontWeight: 700, fontFamily: F }}>
          <Ic n="mail" s={14} c={d.email ? V.lavender : V.muted} /> Email
        </button>
      </div>

      {currentStage && (
        <div style={{ background: V.cardSolid, border: `1px solid ${V.cardBorder}`, borderRadius: 16, padding: 16, marginBottom: 22 }}>
          <div style={{ fontSize: 10, color: V.muted, fontFamily: F, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            Current Stage
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Badge label={currentStage} color={statusColor(currentStage)} />
            {isRejected && <span style={{ fontSize: 12, color: V.muted, fontFamily: F }}>Closed</span>}
          </div>
          {!isRejected && (
            <div style={{ display: "flex", gap: 8 }}>
              {canAdvance && (
                <button onClick={() => advanceStage(nextStage)} disabled={stageBusy}
                  style={{ flex: 2, padding: "11px", borderRadius: 12, border: "none",
                    background: V.success, color: "white", fontSize: 13, fontWeight: 700, fontFamily: F,
                    cursor: stageBusy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    opacity: stageBusy ? 0.6 : 1 }}>
                  <Ic n="arrowR" s={14} c="white" /> Advance to {nextStage}
                </button>
              )}
              <button onClick={() => advanceStage("declined")} disabled={stageBusy}
                style={{ flex: 1, padding: "11px", borderRadius: 12, border: `1px solid ${V.cardBorder}`,
                  background: "transparent", color: V.danger, fontSize: 13, fontWeight: 700, fontFamily: F,
                  cursor: stageBusy ? "default" : "pointer", opacity: stageBusy ? 0.6 : 1 }}>
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {[{ l: "Email", v: d.email, i: "mail" }, { l: "Phone", v: d.phone, i: "phone" },
        { l: "Location", v: d.location || d.city, i: "map" }].filter(r => r.v).map((row, i, arr) => (
        <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${V.cardBorder}` : "none", alignItems: "flex-start" }}>
          <Ic n={row.i} s={15} c={V.muted} style={{ marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 2, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{row.l}</div>
            <div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, fontWeight: 500, wordBreak: "break-all" }}>{row.v}</div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Notes
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…"
            onKeyDown={e => { if (e.key === "Enter") addNote(); }}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `1px solid ${V.cardBorder}`,
              fontSize: 14, fontFamily: F, color: V.inkMid, outline: "none" }} />
          <button onClick={addNote} disabled={!note.trim() || saving}
            style={{ padding: "10px 18px", borderRadius: 12, border: "none",
              background: note.trim() && !saving ? V.ink : "rgba(0,0,0,0.08)",
              color: note.trim() && !saving ? "white" : V.muted,
              fontSize: 13, fontWeight: 700, fontFamily: F,
              cursor: note.trim() && !saving ? "pointer" : "default" }}>
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

// ─── CANDIDATES SCREEN ────────────────────────────────────────────────────────
const CandidatesScreen = ({ environment }) => {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(null);
  const [objectId, setObjectId] = useState(null);

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setError(null);
    const objsRes = await api.get(`/objects?environment_id=${environment.id}`);
    if (!objsRes.ok) { setError(objsRes.error); setLoading(false); return; }
    const objs = Array.isArray(objsRes.data) ? objsRes.data : [];
    const o = objs.find(o => o.slug === "people" || o.name?.toLowerCase().includes("people"));
    if (!o) { setError("People object not found in this environment"); setLoading(false); return; }
    setObjectId(o.id);
    const dRes = await api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=50&sort=updated_at&order=desc`);
    if (!dRes.ok) { setError(dRes.error); setLoading(false); return; }
    setRecords(dRes.data?.records || []);
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { await load(); toast?.success?.("Refreshed"); };

  const handleUpdate = (updated) => {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSel(updated);
  };

  const getName = r => [r.data?.first_name, r.data?.last_name].filter(Boolean).join(" ") || r.data?.email || "Unnamed";
  const palette = [V.lavender, V.rose, V.sage, V.lilac, "#C8A87E"];
  const colorFor = n => { let h = 0; for (let c of n) h += c.charCodeAt(0); return palette[h % palette.length]; };
  const filtered = records.filter(r => {
    const n = getName(r).toLowerCase();
    const t = (r.data?.current_title || r.data?.job_title || "").toLowerCase();
    const q = search.toLowerCase();
    return !q || n.includes(q) || t.includes(q);
  });

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#F7F5F2", position: "relative" }}>
      <div style={{ padding: "12px 16px", background: V.cardSolid, borderBottom: `1px solid ${V.cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "10px 14px" }}>
          <Ic n="search" s={15} c={V.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, fontFamily: F, color: V.inkMid, outline: "none" }} />
        </div>
      </div>

      <PullToRefresh onRefresh={refresh} disabled={loading}>
        {loading ? <Skeleton count={8} />
          : error ? <ErrorState message={error} onRetry={load} />
          : filtered.length === 0 ? (
            <EmptyState icon="users"
              title={search ? "No matches" : "No candidates yet"}
              body={search ? "Try a different search term" : "Tap the + button to add your first candidate"} />
          )
          : filtered.map(r => {
            const name = getName(r);
            const col = colorFor(name);
            const status = r.data?.status || r.data?.pipeline_stage;
            return (
              <SwipeRow key={r.id}
                hasPhone={!!r.data?.phone} hasEmail={!!r.data?.email}
                onCall={() => { window.location.href = `tel:${r.data.phone}`; }}
                onEmail={() => { window.location.href = `mailto:${r.data.email}`; }}>
                <button onClick={() => setSel(r)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${V.cardBorder}` }}>
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
              </SwipeRow>
            );
          })}
      </PullToRefresh>

      {!loading && !error && (
        <FAB icon="plus" label="Add candidate"
          onClick={() => {
            const first = prompt("First name?");
            if (!first) return;
            const last = prompt("Last name?") || "";
            const email = prompt("Email (optional)") || "";
            api.post("/records", {
              object_id: objectId,
              environment_id: environment.id,
              data: { first_name: first, last_name: last, email, status: "new" },
            }).then(res => {
              if (res.ok) { toast?.success?.(`${first} ${last} added`); load(); }
              else { toast?.error?.(res.error || "Could not add candidate"); }
            });
          }} />
      )}

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? getName(sel) : ""} height="82vh">
        {sel && <CandidateDetail record={sel} onUpdate={handleUpdate} />}
      </Sheet>
    </div>
  );
};

// ─── INTERVIEWS SCREEN ────────────────────────────────────────────────────────
const InterviewsScreen = ({ environment }) => {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("today");
  const [sel, setSel] = useState(null);

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setError(null);
    const res = await api.get(`/interviews?environment_id=${environment.id}&limit=50`);
    if (!res.ok) { setError(res.error); setLoading(false); return; }
    const list = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.interviews || res.data?.data || []);
    setItems(list);
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { await load(); toast?.success?.("Refreshed"); };

  const today = new Date().toDateString();
  const tom = new Date(Date.now() + 86400000).toDateString();
  const filtered = items.filter(i => {
    const d = new Date(i.date).toDateString();
    if (filter === "today") return d === today;
    if (filter === "tomorrow") return d === tom;
    if (filter === "upcoming") return new Date(i.date) >= new Date();
    return true;
  });
  const fmtTime = (dt, t) => t || new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = dt => {
    const d = new Date(dt).toDateString();
    if (d === today) return "Today";
    if (d === tom) return "Tomorrow";
    return new Date(dt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };
  const typeCol = f => ({ video: V.lavender, phone: V.success, onsite: V.rose, panel: V.lilac }[f?.toLowerCase()] || V.muted);
  const tabs = [
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "upcoming", label: "Upcoming" },
    { id: "all", label: "All" },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#F7F5F2", position: "relative" }}>
      <div style={{ background: V.cardSolid, borderBottom: `1px solid ${V.cardBorder}`, padding: "12px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
        {tabs.map(t => {
          const cnt = t.id === "today" ? items.filter(i => new Date(i.date).toDateString() === today).length : 0;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)}
              style={{ padding: "7px 14px", borderRadius: 99, border: "none",
                background: filter === t.id ? V.ink : "rgba(0,0,0,0.05)",
                color: filter === t.id ? "white" : V.muted, fontSize: 12, fontWeight: 700,
                fontFamily: F, cursor: "pointer", letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
              {t.label}{cnt > 0 && <span style={{ marginLeft: 5, background: filter === t.id ? "rgba(255,255,255,0.25)" : V.lavender, color: "white", borderRadius: 99, padding: "1px 6px", fontSize: 10 }}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      <PullToRefresh onRefresh={refresh} disabled={loading}>
        {loading ? <Skeleton count={6} />
          : error ? <ErrorState message={error} onRetry={load} />
          : filtered.length === 0 ? (
            <EmptyState icon="calendar"
              title="No interviews scheduled"
              body={filter === "today" ? "Your schedule is clear today." : "Nothing in this view yet."} />
          )
          : filtered.map((iv, i) => {
            const col = typeCol(iv.format);
            return (
              <button key={iv.id || i} onClick={() => setSel(iv)}
                style={{ width: "100%", display: "flex", gap: 14, padding: "16px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${V.cardBorder}`, alignItems: "flex-start" }}>
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
            );
          })}
      </PullToRefresh>

      <Sheet open={!!sel} onClose={() => setSel(null)} title="Interview">
        {sel && (
          <div style={{ padding: "20px 22px 40px" }}>
            <div style={{ background: `${typeCol(sel.format)}10`, border: `1px solid ${typeCol(sel.format)}28`, borderRadius: 16, padding: 18, marginBottom: 22 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.03em", marginBottom: 4 }}>{sel.candidate_name || "Candidate"}</div>
              <div style={{ fontSize: 13, color: V.muted, fontFamily: F }}>{sel.job_title || sel.type_name || "Interview"}</div>
            </div>
            {[
              { l: "Date & Time", v: `${fmtDate(sel.date)} at ${fmtTime(sel.date, sel.time)}`, i: "calendar" },
              { l: "Duration", v: sel.duration_minutes ? `${sel.duration_minutes} min` : "—", i: "clock" },
              { l: "Format", v: sel.format || "—", i: "layers" },
              { l: "Location", v: sel.location || sel.video_link || "—", i: "map" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: `1px solid ${V.cardBorder}`, alignItems: "flex-start" }}>
                <Ic n={row.i} s={15} c={V.muted} style={{ marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 2, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{row.l}</div>
                  <div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, fontWeight: 500, wordBreak: "break-word" }}>{row.v}</div>
                </div>
              </div>
            ))}
            {sel.notes && (
              <div style={{ marginTop: 18, padding: 14, background: "rgba(0,0,0,0.02)", borderRadius: 12, border: `1px solid ${V.cardBorder}` }}>
                <div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 6, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Notes</div>
                <div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, lineHeight: 1.65 }}>{sel.notes}</div>
              </div>
            )}
            {sel.video_link && (
              <a href={sel.video_link} target="_blank" rel="noreferrer"
                style={{ display: "block", textDecoration: "none", marginTop: 22, padding: "15px", borderRadius: 14, background: V.ink, color: "white", fontSize: 15, fontWeight: 700, fontFamily: F, letterSpacing: "-0.01em", textAlign: "center" }}>
                → Join video call
              </a>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
};

// ─── STAGE CANDIDATE LIST ─────────────────────────────────────────────────────
const StageCandidateList = ({ candidates, stages, currentStageName, onMoveRequest }) => {
  const palette = [V.lavender, V.rose, V.sage, V.lilac, "#C8A87E"];
  const colorFor = name => { let h = 0; for (const c of name) h += c.charCodeAt(0); return palette[h % palette.length]; };

  if (candidates.length === 0) {
    return (
      <EmptyState icon="users"
        title="No candidates here"
        body={`Nobody is currently in the "${currentStageName}" stage.`} />
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      {candidates.map((link, i) => {
        const d = link.person_data || {};
        const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || d.email || "Unnamed";
        const col = colorFor(name);
        return (
          <div key={link.id || i} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 18px", borderBottom: `1px solid ${V.cardBorder}`, background: V.cardSolid,
          }}>
            <Avatar name={name} size={42} color={col} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: V.inkMid, fontFamily: FD,
                letterSpacing: "-0.02em", marginBottom: 1 }}>{name}</div>
              {(d.current_title || d.job_title) && (
                <div style={{ fontSize: 12, color: V.muted, fontFamily: F,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.current_title || d.job_title}
                </div>
              )}
              {(d.location || d.city) && (
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                  <Ic n="map" s={11} c={V.muted} />
                  <span style={{ fontSize: 11, color: V.muted, fontFamily: F }}>{d.location || d.city}</span>
                </div>
              )}
            </div>
            {stages.length > 1 && (
              <button onClick={() => onMoveRequest(link)}
                style={{ padding: "7px 12px", borderRadius: 10, border: `1px solid ${V.cardBorder}`,
                  background: "rgba(0,0,0,0.03)", color: V.inkMid, fontSize: 12, fontWeight: 600,
                  fontFamily: F, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                Move
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── JOB PIPELINE SECTION ─────────────────────────────────────────────────────
const JobPipelineSection = ({ job, environment, onStageSelect, links, stages, loading }) => {
  const countByStage = useMemo(() => {
    const map = {};
    links.forEach(l => {
      const sn = l.stage_name || "Unassigned";
      map[sn] = (map[sn] || 0) + 1;
    });
    return map;
  }, [links]);

  const totalCandidates = links.length;

  // Derive displayable stages: workflow steps first, then from links, then fallback
  const displayStages = useMemo(() => {
    if (stages.length > 0) return stages;
    // Derive from link stage names
    const seen = new Set();
    const derived = [];
    links.forEach(l => {
      const sn = l.stage_name || "Unassigned";
      if (!seen.has(sn)) { seen.add(sn); derived.push({ id: sn, name: sn, color: statusColor(sn) }); }
    });
    return derived;
  }, [stages, links]);

  return (
    <div style={{ borderTop: `1px solid ${V.cardBorder}`, paddingTop: 20, marginTop: 4 }}>
      <div style={{ padding: "0 22px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Ic n="layers" s={14} c={V.muted} />
          <span style={{ fontSize: 10, color: V.muted, fontFamily: F, fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase" }}>Pipeline</span>
        </div>
        {totalCandidates > 0 && (
          <span style={{ fontSize: 12, color: V.muted, fontFamily: F }}>
            {totalCandidates} candidate{totalCandidates !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "0 22px" }}><Skeleton count={3} /></div>
      ) : displayStages.length === 0 ? (
        <div style={{ padding: "16px 22px", textAlign: "center", color: V.muted, fontFamily: F, fontSize: 13 }}>
          No pipeline configured for this job
        </div>
      ) : (
        <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {displayStages.map((stage, idx) => {
            const count = countByStage[stage.name] || 0;
            const col = stage.color || statusColor(stage.name);
            const candidatesHere = links.filter(l => (l.stage_name || "Unassigned") === stage.name);
            return (
              <button key={stage.id || idx}
                onClick={() => onStageSelect(stage, candidatesHere)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "13px 14px",
                  background: V.cardSolid, borderRadius: 14, border: `1px solid ${V.cardBorder}`,
                  cursor: "pointer", textAlign: "left", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
                onTouchStart={e => { e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                onTouchEnd={e => { e.currentTarget.style.background = V.cardSolid; }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%",
                  background: col, flexShrink: 0, boxShadow: `0 0 0 2px ${col}28` }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: V.inkMid, fontFamily: F }}>{stage.name}</span>
                {count > 0 ? (
                  <span style={{ padding: "3px 10px", borderRadius: 99, background: `${col}18`,
                    color: col, fontSize: 12, fontWeight: 700, fontFamily: F }}>{count}</span>
                ) : (
                  <span style={{ fontSize: 12, color: V.faint, fontFamily: F }}>—</span>
                )}
                <Ic n="chevR" s={13} c={V.muted} />
              </button>
            );
          })}
        </div>
      )}
      <div style={{ height: 24 }} />
    </div>
  );
};

// ─── JOBS SCREEN ──────────────────────────────────────────────────────────────
const JobsScreen = ({ environment }) => {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(null);
  const [objectId, setObjectId] = useState(null);

  // Pipeline state — lifted up so sibling sheets can share it
  const [pipelineStages, setPipelineStages] = useState([]);
  const [pipelineLinks, setPipelineLinks] = useState([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [selStage, setSelStage] = useState(null);          // { stage, candidates[] }
  const [moveCandidate, setMoveCandidate] = useState(null); // link object to move
  const [moving, setMoving] = useState(false);

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setError(null);
    const objsRes = await api.get(`/objects?environment_id=${environment.id}`);
    if (!objsRes.ok) { setError(objsRes.error); setLoading(false); return; }
    const objs = Array.isArray(objsRes.data) ? objsRes.data : [];
    const o = objs.find(o => o.slug === "jobs" || o.name?.toLowerCase().includes("job"));
    if (!o) { setError("Jobs object not found in this environment"); setLoading(false); return; }
    setObjectId(o.id);
    const dRes = await api.get(`/records?object_id=${o.id}&environment_id=${environment.id}&limit=50&sort=updated_at&order=desc`);
    if (!dRes.ok) { setError(dRes.error); setLoading(false); return; }
    setJobs(dRes.data?.records || []);
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { await load(); toast?.success?.("Refreshed"); };

  // Load pipeline data whenever a job is selected
  useEffect(() => {
    if (!sel) { setPipelineStages([]); setPipelineLinks([]); return; }
    let cancelled = false;
    setPipelineLoading(true);
    (async () => {
      const [assignRes, linksRes] = await Promise.all([
        api.get(`/workflows/assignments?record_id=${sel.id}`),
        api.get(`/workflows/people-links?target_record_id=${sel.id}`),
      ]);
      if (cancelled) return;

      // Build stage list from workflow assignment
      let stageList = [];
      if (assignRes.ok && Array.isArray(assignRes.data) && assignRes.data.length > 0) {
        const pipelineAssignment =
          assignRes.data.find(a => a.type === "pipeline" || a.type === "people_link") ||
          assignRes.data[0];
        stageList = pipelineAssignment?.workflow?.steps || [];
      }
      // Fallback: pull steps from the first link's workflow_steps
      if (!stageList.length && linksRes.ok) {
        const firstLink = Array.isArray(linksRes.data) && linksRes.data[0];
        if (firstLink?.workflow_steps?.length) stageList = firstLink.workflow_steps;
      }
      // Fallback: stage-categories
      if (!stageList.length && environment?.id) {
        const catRes = await api.get(`/stage-categories?environment_id=${environment.id}`);
        if (!cancelled && catRes.ok && Array.isArray(catRes.data)) {
          stageList = catRes.data.map(c => ({ id: c.id, name: c.name, color: c.color }));
        }
      }
      setPipelineStages(stageList);
      setPipelineLinks(Array.isArray(linksRes.data) ? linksRes.data : []);
      setPipelineLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sel?.id, environment?.id]);

  const handleMoveStage = async (targetStage) => {
    if (!moveCandidate) return;
    setMoving(true);
    const res = await api.patch(`/workflows/people-links/${moveCandidate.id}`, {
      stage_id: targetStage.id !== targetStage.name ? targetStage.id : undefined,
      stage_name: targetStage.name,
    });
    if (res.ok) {
      toast?.success?.(`Moved to ${targetStage.name}`);
      // Update local links
      setPipelineLinks(prev => prev.map(l =>
        l.id === moveCandidate.id
          ? { ...l, stage_id: targetStage.id, stage_name: targetStage.name }
          : l
      ));
      // Update the stage candidates sheet if it's showing the same stage
      if (selStage) {
        const updatedLinks = pipelineLinks.map(l =>
          l.id === moveCandidate.id ? { ...l, stage_name: targetStage.name } : l
        );
        setSelStage(prev => ({
          ...prev,
          candidates: updatedLinks.filter(l => (l.stage_name || "Unassigned") === prev.stage.name),
        }));
      }
      setMoveCandidate(null);
    } else {
      toast?.error?.(res.error || "Could not move candidate");
    }
    setMoving(false);
  };

  const getTitle = j => j.data?.job_title || j.data?.title || "Untitled Role";
  const getStatus = j => j.data?.status || "Open";
  const filtered = jobs.filter(j => {
    const t = getTitle(j).toLowerCase();
    const dep = (j.data?.department || "").toLowerCase();
    const q = search.toLowerCase();
    return !q || t.includes(q) || dep.includes(q);
  });

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#F7F5F2", position: "relative" }}>
      <div style={{ padding: "12px 16px", background: V.cardSolid, borderBottom: `1px solid ${V.cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "10px 14px" }}>
          <Ic n="search" s={15} c={V.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 15, fontFamily: F, color: V.inkMid, outline: "none" }} />
        </div>
      </div>

      <PullToRefresh onRefresh={refresh} disabled={loading}>
        {loading ? <Skeleton count={5} type="card" />
          : error ? <ErrorState message={error} onRetry={load} />
          : filtered.length === 0 ? (
            <EmptyState icon="briefcase"
              title={search ? "No matches" : "No jobs yet"}
              body={search ? "Try a different search term" : "Tap the + button to post your first role"} />
          )
          : <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>{filtered.map(j => {
            const status = getStatus(j);
            const col = statusColor(status);
            return (
              <button key={j.id} onClick={() => setSel(j)}
                style={{ background: V.cardSolid, borderRadius: 18, border: `1px solid ${V.cardBorder}`, padding: 18, textAlign: "left", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", borderLeft: `4px solid ${col}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: V.inkMid, fontFamily: FD, flex: 1, marginRight: 10, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{getTitle(j)}</div>
                  <Badge label={status} color={col} />
                </div>
                {j.data?.department && <div style={{ fontSize: 13, color: V.muted, fontFamily: F, marginBottom: 5 }}>{j.data.department}</div>}
                {j.data?.location && <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Ic n="map" s={11} c={V.muted} /><span style={{ fontSize: 12, color: V.muted, fontFamily: F }}>{j.data.location}</span></div>}
              </button>
            );
          })}</div>}
      </PullToRefresh>

      {!loading && !error && (
        <FAB icon="plus" label="New job"
          onClick={() => {
            const title = prompt("Job title?");
            if (!title) return;
            const dept = prompt("Department (optional)") || "";
            const loc = prompt("Location (optional)") || "";
            api.post("/records", {
              object_id: objectId,
              environment_id: environment.id,
              data: { job_title: title, department: dept, location: loc, status: "Open" },
            }).then(res => {
              if (res.ok) { toast?.success?.(`${title} posted`); load(); }
              else { toast?.error?.(res.error || "Could not post job"); }
            });
          }} />
      )}

      {/* Job detail sheet */}
      <Sheet open={!!sel} onClose={() => { setSel(null); setSelStage(null); setMoveCandidate(null); }}
        title={sel ? getTitle(sel) : ""} height="90vh">
        {sel && (
          <div style={{ paddingBottom: 40, overflowY: "auto" }}>
            {/* Job fields */}
            <div style={{ padding: "20px 22px 0" }}>
              {[
                { l: "Department", v: sel.data?.department, i: "layers" },
                { l: "Location", v: sel.data?.location, i: "map" },
                { l: "Status", v: getStatus(sel), i: "check" },
                { l: "Type", v: sel.data?.employment_type, i: "briefcase" },
              ].filter(f => f.v).map((row, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${V.cardBorder}` : "none", alignItems: "flex-start" }}>
                  <Ic n={row.i} s={15} c={V.muted} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 2, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{row.l}</div>
                    <div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, fontWeight: 500 }}>{row.v}</div>
                  </div>
                </div>
              ))}
              {sel.data?.description && (
                <div style={{ marginTop: 18, padding: 14, background: "rgba(0,0,0,0.02)", borderRadius: 12, marginBottom: 4 }}>
                  <div style={{ fontSize: 10, color: V.muted, fontFamily: F, marginBottom: 8, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Description</div>
                  <div style={{ fontSize: 14, color: V.inkMid, fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{sel.data.description}</div>
                </div>
              )}
            </div>

            {/* Pipeline section */}
            <JobPipelineSection
              job={sel}
              environment={environment}
              stages={pipelineStages}
              links={pipelineLinks}
              loading={pipelineLoading}
              onStageSelect={(stage, candidates) => setSelStage({ stage, candidates })}
            />
          </div>
        )}
      </Sheet>

      {/* Stage candidates sheet */}
      <Sheet
        open={!!selStage}
        onClose={() => { setSelStage(null); setMoveCandidate(null); }}
        title={selStage ? `${selStage.stage.name} (${pipelineLinks.filter(l => (l.stage_name || "Unassigned") === selStage.stage.name).length})` : ""}
        height="82vh">
        {selStage && (
          <StageCandidateList
            candidates={pipelineLinks.filter(l => (l.stage_name || "Unassigned") === selStage.stage.name)}
            stages={pipelineStages}
            currentStageName={selStage.stage.name}
            onMoveRequest={(link) => setMoveCandidate(link)}
          />
        )}
      </Sheet>

      {/* Move stage sheet */}
      <Sheet
        open={!!moveCandidate}
        onClose={() => setMoveCandidate(null)}
        title="Move to stage"
        height="auto">
        {moveCandidate && (
          <div style={{ padding: "12px 16px 40px", display: "flex", flexDirection: "column", gap: 8 }}>
            {pipelineStages.filter(s => s.name !== moveCandidate.stage_name).map((stage, idx) => {
              const col = stage.color || statusColor(stage.name);
              return (
                <button key={stage.id || idx}
                  onClick={() => handleMoveStage(stage)}
                  disabled={moving}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "15px 16px",
                    background: V.cardSolid, borderRadius: 14, border: `1px solid ${V.cardBorder}`,
                    cursor: moving ? "default" : "pointer", textAlign: "left",
                    opacity: moving ? 0.6 : 1, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                  onTouchStart={e => { if (!moving) e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                  onTouchEnd={e => { e.currentTarget.style.background = V.cardSolid; }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%",
                    background: col, flexShrink: 0, boxShadow: `0 0 0 2px ${col}28` }} />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: V.inkMid, fontFamily: F }}>{stage.name}</span>
                  {moving && <Ic n="refresh" s={14} c={V.muted} />}
                </button>
              );
            })}
          </div>
        )}
      </Sheet>
    </div>
  );
};

// ─── MORE SCREEN ──────────────────────────────────────────────────────────────
const MoreScreen = ({ session, onLogout }) => {
  const toast = useToast();
  const [showDesktopConfirm, setShowDesktopConfirm] = useState(false);

  const switchToDesktop = () => {
    // Set a flag so App.jsx skips the mobile shell even on a narrow viewport
    try { localStorage.setItem("vercentic_force_desktop", "1"); } catch {}
    window.location.href = window.location.origin + "/";
  };

  const items = [
    { icon: "user",    label: "Profile",          action: () => toast?.info?.("Profile editing coming soon") },
    { icon: "inbox",   label: "Inbox",             action: () => toast?.info?.("Inbox coming soon to mobile") },
    { icon: "refresh", label: "Sync data",         action: () => window.location.reload() },
    { icon: "monitor", label: "Switch to Desktop", action: () => setShowDesktopConfirm(true) },
    { icon: "alert",   label: "Report a problem",  action: () => { window.location.href = "mailto:support@vercentic.com?subject=Mobile%20app%20issue"; } },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#F7F5F2", WebkitOverflowScrolling: "touch" }}>
      <div style={{ background: V.cardSolid, borderBottom: `1px solid ${V.cardBorder}`, padding: "24px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar name={[session?.first_name || "", session?.last_name || ""].join(" ").trim() || "U"} size={52} color={V.lavender} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.02em" }}>
            {[session?.first_name, session?.last_name].filter(Boolean).join(" ") || "User"}
          </div>
          <div style={{ fontSize: 13, color: V.muted, fontFamily: F, marginTop: 2, wordBreak: "break-all" }}>{session?.email}</div>
        </div>
      </div>

      <div style={{ padding: "14px 0" }}>
        {items.map(item => (
          <button key={item.label} onClick={item.action}
            style={{ width: "100%", padding: "14px 22px", background: "none", border: "none", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left" }}>
            <Ic n={item.icon} s={18} c={item.label === "Switch to Desktop" ? V.lavender : V.muted} />
            <span style={{ flex: 1, fontSize: 15, color: item.label === "Switch to Desktop" ? V.inkMid : V.inkMid, fontFamily: F, fontWeight: item.label === "Switch to Desktop" ? 600 : 500 }}>{item.label}</span>
            <Ic n="chevR" s={14} c={V.muted} />
          </button>
        ))}
      </div>

      {onLogout && (
        <div style={{ padding: "20px 22px" }}>
          <button onClick={onLogout}
            style={{ width: "100%", padding: "13px", borderRadius: 14, border: `1px solid ${V.cardBorder}`,
              background: V.cardSolid, color: V.danger, fontSize: 14, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      )}

      <div style={{ textAlign: "center", padding: "20px 22px 40px", color: V.muted, fontSize: 11, fontFamily: F }}>
        Vercentic Mobile · v1.0
      </div>

      {/* Desktop switch confirmation modal */}
      {showDesktopConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setShowDesktopConfirm(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(13,13,15,0.45)", backdropFilter: "blur(4px)" }}
          />
          {/* Sheet */}
          <div style={{
            position: "relative", width: "100%", maxWidth: 600,
            background: V.cardSolid, borderRadius: "24px 24px 0 0",
            padding: "28px 24px 44px", boxShadow: "0 -12px 48px rgba(0,0,0,0.14)",
            animation: "slideUp 0.26s cubic-bezier(0.34,1.2,0.64,1)",
          }}>
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.1)", margin: "0 auto 24px" }} />

            {/* Icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 16, background: `${V.lavender}18`,
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
            }}>
              <Ic n="monitor" s={24} c={V.lavender} />
            </div>

            <div style={{ fontSize: 19, fontWeight: 800, color: V.inkMid, fontFamily: FD,
              letterSpacing: "-0.03em", marginBottom: 10 }}>
              Switch to Desktop Version?
            </div>
            <div style={{ fontSize: 14, color: V.muted, fontFamily: F, lineHeight: 1.6, marginBottom: 28 }}>
              The desktop version gives you full access to all features — including Settings, Workflows, Analytics, and more — but it isn't optimised for small screens.
              <br /><br />
              To come back, tap <strong style={{ color: V.inkMid }}>Use Mobile View</strong> in the desktop app's user menu, or just use your browser's back button.
            </div>

            <button onClick={switchToDesktop}
              style={{
                width: "100%", padding: "15px", borderRadius: 14, border: "none",
                background: V.ink, color: "white", fontSize: 15, fontWeight: 700,
                fontFamily: F, cursor: "pointer", marginBottom: 10,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              <Ic n="monitor" s={16} c="white" />
              Continue to Desktop
            </button>
            <button onClick={() => setShowDesktopConfirm(false)}
              style={{
                width: "100%", padding: "15px", borderRadius: 14,
                border: `1px solid ${V.cardBorder}`, background: "transparent",
                color: V.muted, fontSize: 15, fontWeight: 600, fontFamily: F, cursor: "pointer",
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MOBILE SHELL ─────────────────────────────────────────────────────────────
export const MobileShell = ({ session, environment, envError, onRetryEnv, objects }) => {
  const [screen, setScreen] = useState("copilot");
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const nav = [
    { id: "copilot",    icon: "spark",    label: "Copilot" },
    { id: "candidates", icon: "users",    label: "People" },
    { id: "interviews", icon: "calendar", label: "Interviews" },
    { id: "jobs",       icon: "briefcase",label: "Jobs" },
    { id: "more",       icon: "more",     label: "More" },
  ];
  const titles = { copilot: "Vercentic", candidates: "People", interviews: "Interviews", jobs: "Jobs", more: "More" };

  const NavIcon = ({ id, active }) => {
    if (id === "copilot") {
      if (active) return (
        <div style={{ width: 34, height: 34, borderRadius: 10, background: V.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <VIcon size={22} color="white" />
        </div>
      );
      return <VIcon size={22} color={V.muted} />;
    }
    return <Ic n={nav.find(n => n.id === id)?.icon} s={21} c={active ? V.inkMid : V.muted} />;
  };

  if (envError && !environment) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#F7F5F2", fontFamily: F, maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: V.cardSolid, borderBottom: `1px solid ${V.cardBorder}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 54, flexShrink: 0 }}>
          <VLogo height={22} />
        </div>
        <ErrorState message={envError} onRetry={onRetryEnv} />
      </div>
    );
  }

  if (!environment && !envError) {
    return (
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#F7F5F2", fontFamily: F, maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: V.cardSolid, borderBottom: `1px solid ${V.cardBorder}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 54, flexShrink: 0 }}>
          <VLogo height={22} />
        </div>
        <Skeleton count={6} />
      </div>
    );
  }

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#F7F5F2", fontFamily: F, overscrollBehavior: "none", maxWidth: 600, margin: "0 auto" }}>
      {!online && (
        <div style={{ background: V.warning, color: "white", padding: "6px 16px", fontSize: 12, fontWeight: 700, fontFamily: F, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Ic n="wifi" s={13} c="white" /> You're offline — some features may not work
        </div>
      )}

      <div style={{ background: "rgba(247,245,242,0.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid rgba(0,0,0,0.07)`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 54, flexShrink: 0, zIndex: 10 }}>
        {screen === "copilot" ? (
          <>
            <div style={{ width: 30 }} />
            <VLogo height={22} />
            <button onClick={() => setScreen("more")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <Avatar name={[session?.first_name || "", session?.last_name || ""].join(" ").trim() || "U"} size={30} color={V.lavender} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setScreen("copilot")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 0", width: 30 }}>
              <Ic n="chevL" s={18} c={V.inkMid} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 800, color: V.inkMid, fontFamily: FD, letterSpacing: "-0.03em" }}>{titles[screen]}</span>
            <button onClick={() => setScreen("more")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <Avatar name={[session?.first_name || "", session?.last_name || ""].join(" ").trim() || "U"} size={30} color={V.lavender} />
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
        {screen === "copilot"    && <CopilotScreen session={session} environment={environment} onNavigate={setScreen} />}
        {screen === "candidates" && <CandidatesScreen environment={environment} />}
        {screen === "interviews" && <InterviewsScreen environment={environment} />}
        {screen === "jobs"       && <JobsScreen environment={environment} />}
        {screen === "more"       && <MoreScreen session={session} onLogout={() => {
          localStorage.removeItem(_sessionKey());
          window.location.href = "/";
        }} />}
      </div>

      <div style={{ background: "rgba(247,245,242,0.95)", backdropFilter: "blur(16px)", borderTop: `1px solid rgba(0,0,0,0.07)`, display: "flex", flexShrink: 0, zIndex: 10, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {nav.map(item => {
          const active = screen === item.id;
          return (
            <button key={item.id} onClick={() => setScreen(item.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 9px", background: "none", border: "none", cursor: "pointer", gap: 4, position: "relative" }}>
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

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};
