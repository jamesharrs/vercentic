import { useState, useEffect, useCallback } from "react";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  bg: "var(--t-bg, #F8F9FC)", surface: "var(--t-surface, #FFFFFF)",
  border: "var(--t-border, #E5E7EB)", accent: "var(--t-accent, #4361EE)",
  accentLight: "var(--t-accent-light, #EEF2FF)",
  text1: "var(--t-text1, #111827)", text2: "var(--t-text2, #374151)", text3: "var(--t-text3, #9CA3AF)",
  green: "#10b981", red: "#ef4444", amber: "#f59e0b", purple: "#7c3aed",
};

const api = {
  get: (u) => fetch(`/api${u}`).then(r => r.json()).catch(() => null),
  post: (u, b) => fetch(`/api${u}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()).catch(() => null),
};

function Ic({ n, s = 16, c = "currentColor" }) {
  const P = {
    zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    play: "M5 3l14 9-14 9V3z",
    clock: "M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2",
    calendar: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
    refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
    arrowRight: "M5 12h14M12 5l7 7-7 7",
    check: "M20 6L9 17l-5-5",
    sparkles: "M12 2l1.582 6.135a2 2 0 001.437 1.437L21.154 11.154a.5.5 0 010 .964L15.019 13.7a2 2 0 00-1.437 1.437L12 21.271a.5.5 0 01-.963 0L9.455 15.136a2 2 0 00-1.437-1.437L1.883 12.118a.5.5 0 010-.964L8.018 9.572A2 2 0 009.455 8.135L12 2z",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={P[n] || P.zap}/>
    </svg>
  );
}

// Agent avatar helper
function AgentAvatar({ agent, size = 36 }) {
  const color = agent.avatar_color || agent.trigger_color || C.accent;
  const icon = agent.avatar_icon;
  const initials = (agent.name || "A").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3, background: `${color}18`,
      border: `1.5px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
    }}>
      {icon ? (
        <Ic n={icon} s={size * 0.45} c={color}/>
      ) : (
        <span style={{ fontSize: size * 0.35, fontWeight: 800, color, fontFamily: F }}>{initials}</span>
      )}
    </div>
  );
}

function relTime(iso) {
  if (!iso) return "never";
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

const TRIGGER_COLORS = { record_created: "#10b981", record_updated: "#0891b2", status_changed: "#f59e0b", scheduled: "#7c3aed", manual: "#6366f1", webhook: "#e11d48", field_changed: "#0d9488" };

export default function AgentDashboard({ environment, session, onNavigate }) {
  const [agents, setAgents] = useState([]);
  const [dash, setDash] = useState(null);
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandRun, setExpandRun] = useState(null);

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    const [agentsData, dashData, feedData] = await Promise.all([
      api.get(`/agents?environment_id=${environment.id}`),
      api.get(`/agents/dashboard?environment_id=${environment.id}`),
      api.get(`/agents/activity-feed?environment_id=${environment.id}&limit=20`),
    ]);
    setAgents(Array.isArray(agentsData) ? agentsData : []);
    setDash(dashData && !dashData.error ? dashData : null);
    setFeed(feedData && !feedData.error ? feedData : null);
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  const handleRun = async (id) => {
    await api.post(`/agents/${id}/run`, { environment_id: environment?.id });
    setTimeout(load, 1500);
  };

  const pendingCount = agents.reduce((s, a) => s + (a.pending_approvals || 0), 0);

  // Sparkline component
  const Spark = ({ data }) => {
    const max = Math.max(...(data || []).map(d => d.runs), 1);
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 28 }}>
        {(data || []).map((d, i) => (
          <div key={i} title={`${d.date}: ${d.runs} runs`} style={{
            flex: 1, borderRadius: 2, background: d.runs > 0 ? C.purple : `${C.purple}20`,
            height: `${Math.max(3, (d.runs / max) * 28)}px`, transition: "height .2s"
          }}/>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh", color: C.text3, fontSize: 13 }}>Loading agent data…</div>
  );

  return (
    <div style={{ fontFamily: F }}>

      {/* ── Stat cards ── */}
      {dash && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Agents", value: dash.agents?.total || 0, sub: "configured", icon: "zap", color: C.accent },
            { label: "Active", value: dash.agents?.active || 0, sub: "running", icon: "play", color: C.green },
            { label: "Ran Today", value: dash.runs?.today || 0, sub: "executions", icon: "clock", color: C.purple },
            { label: "This Week", value: dash.runs?.this_week || 0, sub: "total runs", icon: "calendar", color: "#0891b2" },
            { label: "Need Review", value: dash.runs?.pending_approval || 0, sub: "approvals", icon: "eye", color: pendingCount > 0 ? C.amber : C.text3 },
            { label: "Failed", value: dash.runs?.failed || 0, sub: "runs", icon: "alert", color: (dash.runs?.failed || 0) > 0 ? C.red : C.text3 },
          ].map(s => (
            <div key={s.label} style={{
              background: "white", borderRadius: 12, padding: "14px 16px",
              border: `1.5px solid ${s.value > 0 && (s.label === "Need Review" || s.label === "Failed") ? s.color + "50" : C.border}`,
              display: "flex", flexDirection: "column", gap: 4
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Ic n={s.icon} s={14} c={s.color}/>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.text3 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.value > 0 ? s.color : C.text3 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.text3 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Two column: Activity sparkline + Recent activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Activity sparkline */}
        {dash?.runs?.daily_sparkline && (
          <div style={{ background: "white", borderRadius: 14, border: `1.5px solid ${C.border}`, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 12 }}>Run Activity (14 days)</div>
            <Spark data={dash.runs.daily_sparkline}/>
          </div>
        )}

        {/* Quick actions + top agents */}
        <div style={{ background: "white", borderRadius: 14, border: `1.5px solid ${C.border}`, padding: "16px 18px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 12 }}>
            Top Agents <span style={{ fontWeight: 500, color: C.text3, fontSize: 11 }}>{agents.length} total</span>
          </div>
          {agents.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: C.text3, fontSize: 12 }}>
              No agents configured yet.
              {onNavigate && <button onClick={() => onNavigate("agents")} style={{ display: "block", margin: "8px auto 0", padding: "6px 14px", borderRadius: 8, border: "none", background: C.accent, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F }}>Create your first agent</button>}
            </div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {agents.slice(0, 6).map(a => (
                <div key={a.id} onClick={() => onNavigate?.("agents")} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                  transition: "background .1s", marginBottom: 2
                }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <AgentAvatar agent={a} size={28}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.is_active ? C.green : "#D1D5DB" }}/>
                  <span style={{ fontSize: 10, color: C.text3 }}>{relTime(a.last_run_at)}</span>
                  <button onClick={e => { e.stopPropagation(); handleRun(a.id); }} style={{
                    padding: "3px 10px", borderRadius: 6, border: "none", background: C.purple, color: "white",
                    fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: F
                  }}>Run</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent activity feed ── */}
      {feed && Array.isArray(feed) && feed.length > 0 && (
        <div style={{ background: "white", borderRadius: 14, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Ic n="activity" s={14} c={C.purple}/>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>Recent Agent Activity</span>
            <span style={{ fontSize: 11, color: C.text3, marginLeft: 4 }}>{feed.length} events</span>
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {feed.map((item, i) => {
              const st = item.status === "completed" ? { dot: C.green, bg: `${C.green}15`, label: "OK" }
                : item.status === "failed" ? { dot: C.red, bg: `${C.red}15`, label: "Failed" }
                : item.status === "pending_approval" ? { dot: C.amber, bg: `${C.amber}15`, label: "Pending" }
                : { dot: C.text3, bg: C.bg, label: item.status || "—" };
              const exp = expandRun === item.id;
              return (
                <div key={item.id || i}>
                  <div onClick={() => setExpandRun(exp ? null : item.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
                    borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                    transition: "background .1s"
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8f9fc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot, flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.agent_name || "Agent"}
                      </div>
                      {item.summary && <div style={{ fontSize: 11, color: C.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.summary}</div>}
                    </div>
                    <span style={{ fontSize: 10, color: C.text3 }}>{relTime(item.created_at)}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: st.dot, background: st.bg, padding: "1px 6px", borderRadius: 4 }}>{st.label}</span>
                  </div>
                  {exp && item.ai_output && (
                    <div style={{ margin: "0 18px 10px 34px", padding: "8px 10px", borderRadius: 7, background: `${C.purple}08`, fontSize: 11, color: C.text2, lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 100, overflowY: "auto" }}>
                      {item.ai_output}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!feed || feed.length === 0) && !dash && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.text3 }}>
          <Ic n="zap" s={40} c={C.text3}/>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text1, marginTop: 12 }}>No agent activity yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Create and run agents to see activity here.</div>
        </div>
      )}
    </div>
  );
}
