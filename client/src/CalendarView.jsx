import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import api from "./apiClient.js";

// ── Design tokens ─────────────────────────────────────────────────────────────
const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const C = {
  bg:       "#FAFAFF",
  surface:  "#FFFFFF",
  border:   "#E8E6F0",
  text1:    "#1a1a2e",
  text2:    "#6b7280",
  text3:    "#9ca3af",
  accent:   "#7C5CFC",
  accentLt: "#EDE9FE",
};

// Event colour palette — soft pastels
const EVENT_COLORS = [
  { bg: "#EDE9FE", border: "#C4B5FD", text: "#5B21B6", label: "purple"  },
  { bg: "#D1FAE5", border: "#86EFAC", text: "#065F46", label: "mint"    },
  { bg: "#FEF3C7", border: "#FDE68A", text: "#92400E", label: "amber"   },
  { bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF", label: "blue"    },
  { bg: "#FCE7F3", border: "#F9A8D4", text: "#9D174D", label: "pink"    },
  { bg: "#E0E7FF", border: "#A5B4FC", text: "#3730A3", label: "indigo"  },
  { bg: "#CCFBF1", border: "#5EEAD4", text: "#134E4A", label: "teal"    },
  { bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B", label: "red"     },
];

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am–7pm
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
};
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const formatTime = (h, m = 0) => `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;

// ── Ic (icon) ─────────────────────────────────────────────────────────────────
const ICON_PATHS = {
  chevL:  "M15 18l-6-6 6-6",
  chevR:  "M9 18l6-6-6-6",
  clock:  "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
  video:  "M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z",
  phone:  "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  users:  "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
  x:      "M18 6L6 18M6 6l12 12",
  edit:   "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:  "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  plus:   "M12 5v14M5 12h14",
  calendar:"M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
};
const Ic = ({ n, s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {(ICON_PATHS[n] || "").split(/(?<=z)/).map((d, i) => <path key={i} d={d}/>)}
  </svg>
);

// ── Mini Calendar ─────────────────────────────────────────────────────────────
const MiniCalendar = ({ currentDate, selectedDate, onSelect, interviews }) => {
  const [viewMonth, setViewMonth] = useState(new Date(currentDate));
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  // Count interviews per day
  const interviewDays = useMemo(() => {
    const map = {};
    (interviews || []).forEach(iv => {
      if (iv.date) {
        const d = new Date(iv.date);
        if (d.getMonth() === month && d.getFullYear() === year) {
          const key = d.getDate();
          map[key] = (map[key] || 0) + 1;
        }
      }
    });
    return map;
  }, [interviews, month, year]);

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Month header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={prevMonth} style={miniBtn}><Ic n="chevL" s={14} c={C.text2}/></button>
          <button onClick={nextMonth} style={miniBtn}><Ic n="chevR" s={14} c={C.text2}/></button>
        </div>
      </div>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, marginBottom: 4 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: C.text3, padding: "2px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d.slice(0,2)}</div>
        ))}
      </div>
      {/* Days grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`}/>;
          const date = new Date(year, month, day);
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const hasInterview = interviewDays[day];
          return (
            <button key={day} onClick={() => onSelect(date)}
              style={{
                width: 32, height: 32, border: "none", borderRadius: 10,
                background: isSelected ? C.accent : isToday ? C.accentLt : "transparent",
                color: isSelected ? "#fff" : isToday ? C.accent : C.text1,
                fontSize: 12, fontWeight: isToday || isSelected ? 700 : 400,
                cursor: "pointer", fontFamily: FONT, position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .12s",
              }}>
              {day}
              {hasInterview && !isSelected && (
                <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
                  width: 4, height: 4, borderRadius: "50%", background: C.accent }}/>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
const miniBtn = { background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" };

// ── Event Detail Popup ────────────────────────────────────────────────────────
const EventPopup = ({ event, color, rect, onClose, onEdit, onDelete }) => {
  const ref = useRef(null);
  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const d = event.date ? new Date(event.date) : null;
  const timeStr = event.time || "—";
  const endTime = (() => {
    if (!event.time || !event.duration) return "";
    const [h, m] = event.time.split(":").map(Number);
    const totalMin = h * 60 + m + (event.duration || 45);
    return ` – ${formatTime(Math.floor(totalMin / 60), totalMin % 60)}`;
  })();

  // Position relative to the event card
  const top = rect ? rect.top : 100;
  const left = rect ? Math.min(rect.right + 12, window.innerWidth - 340) : 200;

  return (
    <div ref={ref} style={{
      position: "fixed", top, left, width: 310, zIndex: 1000,
      background: "#fff", borderRadius: 16, border: `1.5px solid ${color.border}`,
      boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
      fontFamily: FONT, overflow: "hidden",
      animation: "popIn .15s ease-out",
    }}>
      <style>{`@keyframes popIn { from { opacity:0; transform:translateY(-6px) scale(0.97); } to { opacity:1; transform:none; } }`}</style>
      {/* Colour header bar */}
      <div style={{ height: 6, background: color.border }}/>
      <div style={{ padding: "16px 20px" }}>
        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 8 }}>
          <Ic n="x" s={14} c={C.text3}/>
        </button>
        {/* Title */}
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text1, marginBottom: 4, paddingRight: 20 }}>
          {event.candidate_name || "Interview"}
        </div>
        <div style={{ fontSize: 12, color: C.text2, marginBottom: 14 }}>
          {event.interview_type_name || "Interview"}{event.job_name ? ` · ${event.job_name}` : ""}
        </div>
        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.text2 }}>
            <Ic n="calendar" s={13} c={C.text3}/>
            <span>{d ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.text2 }}>
            <Ic n="clock" s={13} c={C.text3}/>
            <span>{timeStr}{endTime} · {event.duration || 45} min</span>
          </div>
          {event.format && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.text2 }}>
              <Ic n={event.format === "Video Call" ? "video" : event.format === "Phone" ? "phone" : "mapPin"} s={13} c={C.text3}/>
              <span>{event.format}{event.location ? ` · ${event.location}` : ""}</span>
            </div>
          )}
          {event.interviewers?.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.text2 }}>
              <Ic n="users" s={13} c={C.text3}/>
              <div style={{ display: "flex", alignItems: "center" }}>
                {event.interviewers.slice(0, 4).map((person, i) => (
                  <InterviewerAvatar key={i} person={person} cache={avatarCache}
                    size={24} border="#fff"
                    offset={i > 0 ? -8 : 0} zIndex={4 - i}
                    colorScheme={EVENT_COLORS[i % EVENT_COLORS.length]}
                  />
                ))}
                {event.interviewers.length > 4 && (
                  <span style={{ fontSize: 10, color: C.text3, marginLeft: 4 }}>+{event.interviewers.length - 4}</span>
                )}
                <span style={{ fontSize: 11, color: C.text2, marginLeft: 8 }}>
                  {event.interviewers.slice(0, 2).map(p => typeof p === 'string' ? p : p?.name).join(', ')}
                  {event.interviewers.length > 2 ? ` +${event.interviewers.length - 2} more` : ''}
                </span>
              </div>
            </div>
          )}
        </div>
        {event.notes && (
          <div style={{ marginTop: 12, padding: "8px 10px", background: "#f9f9fc", borderRadius: 8, fontSize: 11, color: C.text2, lineHeight: 1.5 }}>
            {event.notes}
          </div>
        )}
        {/* Actions */}
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          <button onClick={onEdit} style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: "#fff", fontSize: 11, fontWeight: 600, color: C.text2, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <Ic n="edit" s={11} c={C.text2}/> Edit
          </button>
          <button onClick={onDelete} style={{ padding: "7px 10px", borderRadius: 9, border: `1px solid #fecaca`, background: "#fff", fontSize: 11, fontWeight: 600, color: "#dc2626", cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <Ic n="trash" s={11}/>
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Week Calendar Grid ────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64; // px per hour
const HEADER_HEIGHT = 72;

const WeekGrid = ({ weekStart, interviews, onSelectEvent, selectedEvent, avatarCache = {} }) => {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const gridRef = useRef(null);

  // Scroll to ~8am on mount
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = HOUR_HEIGHT * 1; // 1 hour past 7am = 8am
  }, [weekStart]);

  // Group interviews by day
  const eventsByDay = useMemo(() => {
    const map = {};
    days.forEach((d, i) => { map[i] = []; });
    (interviews || []).forEach(iv => {
      if (!iv.date) return;
      const ivDate = new Date(iv.date);
      days.forEach((d, i) => {
        if (isSameDay(ivDate, d)) map[i].push(iv);
      });
    });
    return map;
  }, [interviews, weekStart]);

  // Current time indicator
  const nowY = (() => {
    const h = today.getHours();
    const m = today.getMinutes();
    if (h < 7 || h > 19) return null;
    return (h - 7) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
  })();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 20, border: `1.5px solid ${C.border}`, background: C.surface }}>
      {/* Day headers */}
      <div style={{ display: "flex", borderBottom: `1.5px solid ${C.border}`, flexShrink: 0, background: "linear-gradient(180deg, #FAFAFF 0%, #F5F3FF 100%)" }}>
        {/* Time gutter header */}
        <div style={{ width: 56, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.text3, letterSpacing: "0.08em", transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>
            GMT+4
          </span>
        </div>
        {days.map((d, i) => {
          const isToday2 = isSameDay(d, today);
          return (
            <div key={i} style={{ flex: 1, padding: "12px 8px 10px", textAlign: "center", borderRight: i < 6 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: isToday2 ? C.accent : C.text3, textTransform: "lowercase", letterSpacing: "0.02em" }}>
                {DAY_NAMES[i].toLowerCase()}
              </div>
              <div style={{
                fontSize: 28, fontWeight: 800, color: isToday2 ? C.accent : C.text1, lineHeight: 1.1,
                ...(isToday2 ? { background: C.accent, color: "#fff", width: 42, height: 42, borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" } : {})
              }}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={gridRef} style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <div style={{ display: "flex", minHeight: HOURS.length * HOUR_HEIGHT, position: "relative" }}>
          {/* Time labels */}
          <div style={{ width: 56, flexShrink: 0, borderRight: `1px solid ${C.border}`, position: "relative" }}>
            {HOURS.map(h => (
              <div key={h} style={{
                position: "absolute", top: (h - 7) * HOUR_HEIGHT, height: HOUR_HEIGHT,
                width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
                paddingRight: 10, paddingTop: 0, boxSizing: "border-box",
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.text3, lineHeight: 1, transform: "translateY(-5px)" }}>
                  {h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, dayIdx) => {
            const isToday3 = isSameDay(d, today);
            const dayEvents = eventsByDay[dayIdx] || [];
            return (
              <div key={dayIdx} style={{
                flex: 1, position: "relative",
                borderRight: dayIdx < 6 ? `1px solid ${C.border}` : "none",
                background: isToday3 ? "rgba(124, 92, 252, 0.03)" : "transparent",
              }}>
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div key={h} style={{
                    position: "absolute", top: (h - 7) * HOUR_HEIGHT, left: 0, right: 0,
                    height: 1, background: C.border,
                  }}/>
                ))}
                {/* Half-hour lines */}
                {HOURS.map(h => (
                  <div key={`h${h}`} style={{
                    position: "absolute", top: (h - 7) * HOUR_HEIGHT + HOUR_HEIGHT / 2, left: 0, right: 0,
                    height: 1, background: `${C.border}60`,
                  }}/>
                ))}

                {/* Current time line */}
                {isToday3 && nowY !== null && (
                  <div style={{ position: "absolute", top: nowY, left: -1, right: 0, zIndex: 10, pointerEvents: "none" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginLeft: -4 }}/>
                      <div style={{ flex: 1, height: 2, background: "#ef4444" }}/>
                    </div>
                  </div>
                )}

                {/* Event cards */}
                {dayEvents.map((ev, evIdx) => {
                  const colorIdx = (ev.interview_type_name || "").charCodeAt(0) % EVENT_COLORS.length || evIdx % EVENT_COLORS.length;
                  const color = EVENT_COLORS[colorIdx];
                  const [h, m] = (ev.time || "09:00").split(":").map(Number);
                  const topPx = (h - 7) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
                  const dur = ev.duration || 45;
                  const heightPx = Math.max((dur / 60) * HOUR_HEIGHT, 28);
                  const isSelected = selectedEvent?.id === ev.id;

                  // Simple overlap detection for side-by-side
                  const overlapping = dayEvents.filter(other => {
                    if (other.id === ev.id) return false;
                    const [oh, om] = (other.time || "09:00").split(":").map(Number);
                    const oStart = oh * 60 + om;
                    const oEnd = oStart + (other.duration || 45);
                    const myStart = h * 60 + m;
                    const myEnd = myStart + dur;
                    return myStart < oEnd && myEnd > oStart;
                  });
                  const overlapIdx = overlapping.length > 0 ? dayEvents.filter(o => {
                    const [oh, om] = (o.time || "09:00").split(":").map(Number);
                    return (oh * 60 + om) <= (h * 60 + m) && o.id !== ev.id &&
                      overlapping.some(ov => ov.id === o.id);
                  }).length : 0;
                  const totalOverlap = overlapping.length + 1;
                  const widthPct = totalOverlap > 1 ? (100 / totalOverlap) - 1 : 100;
                  const leftPct = totalOverlap > 1 ? overlapIdx * (100 / totalOverlap) : 0;

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => onSelectEvent(ev, e.currentTarget.getBoundingClientRect(), color)}
                      style={{
                        position: "absolute",
                        top: topPx + 1,
                        left: `calc(${leftPct}% + 3px)`,
                        width: `calc(${widthPct}% - 6px)`,
                        height: heightPx - 2,
                        background: color.bg,
                        border: `1.5px solid ${color.border}`,
                        borderLeft: `3px solid ${color.border}`,
                        borderRadius: 10,
                        padding: "5px 8px",
                        cursor: "pointer",
                        overflow: "hidden",
                        transition: "box-shadow .12s, transform .12s",
                        boxShadow: isSelected ? `0 4px 16px ${color.border}60` : "none",
                        transform: isSelected ? "scale(1.02)" : "none",
                        zIndex: isSelected ? 5 : 2,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 2px 12px ${color.border}50`; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: color.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ev.candidate_name || "Interview"}
                      </div>
                      {heightPx > 36 && (
                        <div style={{ fontSize: 10, color: `${color.text}99`, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ev.time || "—"}{ev.duration ? ` · ${ev.duration}m` : ""}
                        </div>
                      )}
                      {heightPx > 56 && ev.interviewers?.length > 0 && (
                        <div style={{ display: "flex", gap: 0, marginTop: 4 }}>
                          {ev.interviewers.slice(0, 3).map((person, ii) => (
                            <InterviewerAvatar key={ii} person={person} cache={avatarCache}
                              size={18} border={color.bg}
                              offset={ii > 0 ? -5 : 0} zIndex={3 - ii}
                              colorScheme={{ bg: '#fff', text: color.text }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Day View ──────────────────────────────────────────────────────────────────
const DayGrid = ({ date, interviews, onSelectEvent, selectedEvent, avatarCache = {} }) => {
  const gridRef = useRef(null);
  const today = new Date();
  const isToday = isSameDay(date, today);

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = HOUR_HEIGHT * 1;
  }, [date]);

  const dayEvents = useMemo(() => 
    (interviews || []).filter(iv => iv.date && isSameDay(new Date(iv.date), date)),
    [interviews, date]
  );

  const nowY = (() => {
    if (!isToday) return null;
    const h = today.getHours();
    const m = today.getMinutes();
    if (h < 7 || h > 19) return null;
    return (h - 7) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
  })();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 20, border: `1.5px solid ${C.border}`, background: C.surface }}>
      {/* Day header */}
      <div style={{ padding: "16px 24px", borderBottom: `1.5px solid ${C.border}`, background: "linear-gradient(180deg, #FAFAFF 0%, #F5F3FF 100%)", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? C.accent : C.text3, textTransform: "lowercase" }}>
          {DAY_NAMES_FULL[(date.getDay() + 6) % 7].toLowerCase()}
        </div>
        <div style={{
          fontSize: 36, fontWeight: 800, color: isToday ? C.accent : C.text1, lineHeight: 1.1,
          ...(isToday ? { background: C.accent, color: "#fff", width: 54, height: 54, borderRadius: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" } : {})
        }}>
          {date.getDate()}
        </div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{MONTH_NAMES[date.getMonth()]} {date.getFullYear()}</div>
      </div>

      {/* Grid */}
      <div ref={gridRef} style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <div style={{ display: "flex", minHeight: HOURS.length * HOUR_HEIGHT, position: "relative" }}>
          <div style={{ width: 56, flexShrink: 0, borderRight: `1px solid ${C.border}`, position: "relative" }}>
            {HOURS.map(h => (
              <div key={h} style={{ position: "absolute", top: (h - 7) * HOUR_HEIGHT, height: HOUR_HEIGHT, width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.text3, transform: "translateY(-5px)" }}>
                  {h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`}
                </span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, position: "relative", background: isToday ? "rgba(124,92,252,0.02)" : "transparent" }}>
            {HOURS.map(h => (
              <div key={h} style={{ position: "absolute", top: (h - 7) * HOUR_HEIGHT, left: 0, right: 0, height: 1, background: C.border }}/>
            ))}
            {HOURS.map(h => (
              <div key={`h${h}`} style={{ position: "absolute", top: (h - 7) * HOUR_HEIGHT + HOUR_HEIGHT / 2, left: 0, right: 0, height: 1, background: `${C.border}60` }}/>
            ))}
            {isToday && nowY !== null && (
              <div style={{ position: "absolute", top: nowY, left: -1, right: 0, zIndex: 10, pointerEvents: "none" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginLeft: -4 }}/>
                  <div style={{ flex: 1, height: 2, background: "#ef4444" }}/>
                </div>
              </div>
            )}
            {dayEvents.map((ev, evIdx) => {
              const colorIdx = (ev.interview_type_name || "").charCodeAt(0) % EVENT_COLORS.length || evIdx % EVENT_COLORS.length;
              const color = EVENT_COLORS[colorIdx];
              const [h, m] = (ev.time || "09:00").split(":").map(Number);
              const topPx = (h - 7) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
              const dur = ev.duration || 45;
              const heightPx = Math.max((dur / 60) * HOUR_HEIGHT, 34);
              const isSelected = selectedEvent?.id === ev.id;
              return (
                <div key={ev.id} onClick={e => onSelectEvent(ev, e.currentTarget.getBoundingClientRect(), color)}
                  style={{
                    position: "absolute", top: topPx + 1, left: 8, right: 8, height: heightPx - 2,
                    background: color.bg, border: `1.5px solid ${color.border}`, borderLeft: `4px solid ${color.border}`,
                    borderRadius: 12, padding: "8px 12px", cursor: "pointer", overflow: "hidden",
                    transition: "box-shadow .12s", boxShadow: isSelected ? `0 4px 16px ${color.border}60` : "none", zIndex: isSelected ? 5 : 2,
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: color.text }}>{ev.candidate_name || "Interview"}</div>
                  <div style={{ fontSize: 11, color: `${color.text}99`, marginTop: 2 }}>{ev.time} · {dur}m · {ev.interview_type_name || ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Month View ────────────────────────────────────────────────────────────────
const MonthGrid = ({ currentDate, interviews, onSelectEvent, onDayClick }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const eventsByDate = useMemo(() => {
    const map = {};
    (interviews || []).forEach(iv => {
      if (!iv.date) return;
      const d = new Date(iv.date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const key = d.getDate();
        if (!map[key]) map[key] = [];
        map[key].push(iv);
      }
    });
    return map;
  }, [interviews, month, year]);

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRadius: 20, border: `1.5px solid ${C.border}`, background: C.surface, overflow: "hidden" }}>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1.5px solid ${C.border}`, background: "linear-gradient(180deg, #FAFAFF 0%, #F5F3FF 100%)" }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ padding: "12px 8px", textAlign: "center", fontSize: 11, fontWeight: 600, color: C.text3, textTransform: "lowercase" }}>{d.toLowerCase()}</div>
        ))}
      </div>
      {/* Grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "1fr" }}>
        {cells.map((day, i) => {
          const isT = day && isSameDay(new Date(year, month, day), today);
          const events = day ? (eventsByDate[day] || []) : [];
          return (
            <div key={i} onClick={() => day && onDayClick(new Date(year, month, day))}
              style={{
                borderRight: (i + 1) % 7 !== 0 ? `1px solid ${C.border}` : "none",
                borderBottom: `1px solid ${C.border}`,
                padding: "6px 8px", minHeight: 80, cursor: day ? "pointer" : "default",
                background: isT ? "rgba(124,92,252,0.04)" : day ? "#fff" : "#fafafa",
                transition: "background .1s",
              }}
              onMouseEnter={e => { if (day) e.currentTarget.style.background = isT ? "rgba(124,92,252,0.07)" : "#f8f7ff"; }}
              onMouseLeave={e => { if (day) e.currentTarget.style.background = isT ? "rgba(124,92,252,0.04)" : "#fff"; }}
            >
              {day && (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: isT ? 800 : 500, color: isT ? C.accent : C.text1, marginBottom: 4,
                    ...(isT ? { background: C.accent, color: "#fff", width: 24, height: 24, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" } : {})
                  }}>{day}</div>
                  {events.slice(0, 3).map((ev, ei) => {
                    const ci = (ev.interview_type_name || "").charCodeAt(0) % EVENT_COLORS.length || ei % EVENT_COLORS.length;
                    const col = EVENT_COLORS[ci];
                    return (
                      <div key={ev.id} onClick={e => { e.stopPropagation(); onSelectEvent(ev, e.currentTarget.getBoundingClientRect(), col); }}
                        style={{
                          fontSize: 10, fontWeight: 600, color: col.text, background: col.bg, border: `1px solid ${col.border}`,
                          borderRadius: 6, padding: "2px 6px", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          cursor: "pointer", lineHeight: 1.4,
                        }}>
                        {ev.time?.slice(0,5)} {ev.candidate_name?.split(" ")[0] || "Interview"}
                      </div>
                    );
                  })}
                  {events.length > 3 && <div style={{ fontSize: 9, color: C.text3, fontWeight: 600 }}>+{events.length - 3} more</div>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Category / Interview Type Filters ─────────────────────────────────────────
const CategoryFilters = ({ types, activeTypes, onToggle }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
      Interview Types
    </div>
    {types.map((t, i) => {
      const col = EVENT_COLORS[i % EVENT_COLORS.length];
      const active = activeTypes.includes(t.id);
      return (
        <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", fontSize: 12, color: active ? C.text1 : C.text3 }}>
          <div style={{
            width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${active ? col.border : C.border}`,
            background: active ? col.bg : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .1s",
          }}>
            {active && <div style={{ width: 6, height: 6, borderRadius: 2, background: col.border }}/>}
          </div>
          <span style={{ fontWeight: active ? 600 : 400 }}>{t.name}</span>
        </label>
      );
    })}
  </div>
);

// ── Interviewer Avatar ──────────────────────────────────────────────────────────
function InterviewerAvatar({ person, cache = {}, size = 22, border = '#fff', offset = 0, zIndex = 1, colorScheme }) {
  const name = typeof person === 'string' ? person : (person?.name || '?');
  const id   = person?.id;
  const cached = id ? cache[id] : null;
  const photo  = cached?.photo_url || null;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bg  = colorScheme?.bg  || '#EDE9FE';
  const col = colorScheme?.text || '#5B21B6';
  return (
    <div title={name} style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${border}`,
      marginLeft: offset, zIndex, overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: photo ? 'transparent' : bg,
      fontSize: size * 0.38, fontWeight: 800, color: col, position: 'relative',
    }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
          />
        : null}
      <span style={{ display: photo ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        {initials}
      </span>
    </div>
  );
}

// ── Main CalendarView Export ──────────────────────────────────────────────────
export default function CalendarView({ interviews: interviewsProp, interviewTypes: typesProp, onEdit, onDelete, onSchedule, environment }) {
  const [viewMode, setViewMode] = useState("week");   // month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [popupRect, setPopupRect] = useState(null);
  const [popupColor, setPopupColor] = useState(EVENT_COLORS[0]);
  const [activeTypes, setActiveTypes] = useState([]);
  const [avatarCache, setAvatarCache] = useState({}); // {personId: {name, photo_url}}
  // Self-loading when used standalone (environment prop provided)
  const [ownInterviews, setOwnInterviews] = useState([]);
  const [ownTypes, setOwnTypes] = useState([]);
  const interviews = interviewsProp ?? ownInterviews;
  const interviewTypes = typesProp ?? ownTypes;

  useEffect(() => {
    if (!environment?.id) return;
    const envId = environment.id;
    api.get(`/interviews?environment_id=${envId}&limit=200`).then(d => {
      setOwnInterviews(Array.isArray(d) ? d : d?.interviews ?? []);
    }).catch(() => {});
    api.get(`/interview-types?environment_id=${envId}`).then(d => {
      setOwnTypes(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, [environment?.id]);

  // Prefetch avatars for all interviewers that have person IDs
  useEffect(() => {
    if (!interviews?.length) return;
    const ids = new Set();
    interviews.forEach(iv => {
      (iv.interviewers || []).forEach(p => { if (p?.id) ids.add(p.id); });
    });
    if (!ids.size) return;
    const missing = [...ids].filter(id => !avatarCache[id]);
    if (!missing.length) return;
    api.get(`/records/avatars?ids=${missing.join(',')}`).then(results => {
      setAvatarCache(prev => {
        const next = { ...prev };
        results.forEach(r => { next[r.id] = r; });
        return next;
      });
    }).catch(() => {});
  }, [interviews]);

  // Init active types
  useEffect(() => {
    if (interviewTypes?.length && activeTypes.length === 0) {
      setActiveTypes(interviewTypes.map(t => t.id));
    }
  }, [interviewTypes]);

  const weekStart = useMemo(() => getMonday(currentDate), [currentDate]);

  const filteredInterviews = useMemo(() => {
    if (!activeTypes.length || activeTypes.length === interviewTypes?.length) return interviews;
    return (interviews || []).filter(iv => activeTypes.includes(iv.interview_type_id));
  }, [interviews, activeTypes, interviewTypes]);

  const toggleType = (id) => {
    setActiveTypes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectEvent = (ev, rect, color) => {
    setSelectedEvent(ev);
    setPopupRect(rect);
    setPopupColor(color);
  };

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const goNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const headerTitle = viewMode === "month"
    ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : viewMode === "day"
      ? `${DAY_NAMES_FULL[(currentDate.getDay() + 6) % 7]}, ${currentDate.getDate()} ${MONTH_SHORT[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : `${weekStart.getDate()} ${MONTH_SHORT[weekStart.getMonth()]} – ${addDays(weekStart, 6).getDate()} ${MONTH_SHORT[addDays(weekStart, 6).getMonth()]} ${weekStart.getFullYear()}`;

  // Stats
  const today = new Date();
  const todayCount = (interviews || []).filter(iv => iv.date && isSameDay(new Date(iv.date), today)).length;

  return (
    <div style={{ display: "flex", gap: 0, height: "100%", fontFamily: FONT }}>
      {/* Left sidebar */}
      <div style={{ width: 240, flexShrink: 0, padding: "20px 16px", borderRight: `1.5px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        <MiniCalendar
          currentDate={currentDate}
          selectedDate={currentDate}
          onSelect={(d) => { setCurrentDate(d); setViewMode("day"); }}
          interviews={interviews}
        />

        {/* Today summary */}
        <div style={{ padding: "12px 14px", background: C.accentLt, borderRadius: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 2 }}>Today</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{todayCount}</div>
          <div style={{ fontSize: 11, color: C.text3 }}>interview{todayCount !== 1 ? "s" : ""} scheduled</div>
        </div>

        {/* Categories */}
        {interviewTypes?.length > 0 && (
          <CategoryFilters types={interviewTypes} activeTypes={activeTypes} onToggle={toggleType}/>
        )}

        {/* Schedule button */}
        <button onClick={onSchedule} style={{
          width: "100%", padding: "10px 0", borderRadius: 12, border: "none",
          background: C.accent, color: "#fff", fontSize: 12, fontWeight: 700,
          cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          boxShadow: `0 4px 12px ${C.accent}30`,
          transition: "transform .1s, box-shadow .1s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${C.accent}40`; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 4px 12px ${C.accent}30`; }}
        >
          <Ic n="plus" s={14} c="#fff"/> Schedule Interview
        </button>
      </div>

      {/* Main calendar area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text1 }}>{headerTitle}</h2>
            <button onClick={goToday} style={{
              padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${C.accent}`,
              background: "transparent", color: C.accent, fontSize: 11, fontWeight: 700,
              cursor: "pointer", fontFamily: FONT,
            }}>Today</button>
            <div style={{ display: "flex", gap: 2 }}>
              <button onClick={goPrev} style={navBtn}><Ic n="chevL" s={16} c={C.text2}/></button>
              <button onClick={goNext} style={navBtn}><Ic n="chevR" s={16} c={C.text2}/></button>
            </div>
          </div>
          {/* View mode toggle */}
          <div style={{ display: "flex", borderRadius: 12, border: `1.5px solid ${C.border}`, overflow: "hidden", background: C.bg }}>
            {["Month", "Week", "Day"].map(v => (
              <button key={v} onClick={() => setViewMode(v.toLowerCase())}
                style={{
                  padding: "7px 18px", border: "none",
                  background: viewMode === v.toLowerCase() ? C.surface : "transparent",
                  color: viewMode === v.toLowerCase() ? C.text1 : C.text3,
                  fontSize: 12, fontWeight: viewMode === v.toLowerCase() ? 700 : 500,
                  cursor: "pointer", fontFamily: FONT,
                  boxShadow: viewMode === v.toLowerCase() ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                  transition: "all .12s",
                }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        {viewMode === "week" && (
          <WeekGrid weekStart={weekStart} interviews={filteredInterviews} onSelectEvent={handleSelectEvent} selectedEvent={selectedEvent}/>
        )}
        {viewMode === "day" && (
          <DayGrid date={currentDate} interviews={filteredInterviews} onSelectEvent={handleSelectEvent} selectedEvent={selectedEvent}/>
        )}
        {viewMode === "month" && (
          <MonthGrid currentDate={currentDate} interviews={filteredInterviews} onSelectEvent={handleSelectEvent} onDayClick={(d) => { setCurrentDate(d); setViewMode("day"); }}/>
        )}
      </div>

      {/* Event popup */}
      {selectedEvent && popupRect && (
        <EventPopup
          event={selectedEvent}
          color={popupColor}
          rect={popupRect}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => { onEdit(selectedEvent); setSelectedEvent(null); }}
          onDelete={() => { onDelete(selectedEvent.id); setSelectedEvent(null); }}
        />
      )}
    </div>
  );
}

const navBtn = {
  background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 10,
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "background .1s",
};
