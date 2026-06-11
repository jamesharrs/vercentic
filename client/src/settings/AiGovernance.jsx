/**
 * AiGovernance.jsx — Enhanced A→D
 * A) Persist compliance status + actions, functional data rights
 * B) Real bias scan (JD analysis via Claude), match score distribution
 * C) Risk Register — create/edit/close risks with owner, review date, regs
 * D) AI Usage Dashboard — requests, tokens, cost, per-feature breakdown
 */
import { useState, useEffect, useCallback, useRef } from "react";
import api from "../apiClient";

const F = "var(--t-font,'Plus Jakarta Sans',sans-serif)";
const C = {
  bg:      "var(--t-bg,#F5F7FF)",
  surface: "var(--t-surface,#ffffff)",
  border:  "var(--t-border,#E8EBF4)",
  text1:   "var(--t-text1,#0F1729)",
  text2:   "var(--t-text2,#374151)",
  text3:   "var(--t-text3,#6B7280)",
  accent:  "var(--t-accent,#4361EE)",
  accentL: "var(--t-accentLight,#EEF2FF)",
  green:   "#0CAF77", greenL: "#F0FDF4",
  amber:   "#F59F00", amberL: "#FFFBEB",
  red:     "#E03131", redL:   "#FFF5F5",
  purple:  "#7C3AED", purpleL:"#F5F3FF",
};

// ── Shared icon ────────────────────────────────────────────────────────────────
const PATHS = {
  shield:    "M12 2l7 4v5c0 5.25-3.5 10.74-7 12-3.5-1.26-7-6.75-7-12V6l7-4z",
  check:     "M20 6L9 17l-5-5",
  alert:     "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0-3.42 0zM12 9v4M12 17h.01",
  info:      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 16v-4M12 8h.01",
  x:         "M18 6L6 18M6 6l12 12",
  eye:       "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  users:     "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  file:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  zap:       "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  chevron:   "M9 18l6-6-6-6",
  chevDown:  "M6 9l6 6 6-6",
  sparkles:  "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z",
  activity:  "M22 12h-4l-3 9L9 3l-3 9H2",
  refresh:   "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  clock:     "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  arrowRight:"M5 12h14M12 5l7 7-7 7",
  scan:      "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10",
  plus:      "M12 5v14M5 12h14",
  trash:     "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:      "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  download:  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  dollar:    "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  flag:      "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  person:    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};
const Ic = ({ n, s = 16, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={PATHS[n] || PATHS.info} />
  </svg>
);

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS = {
  compliant: { label: "Compliant",       color: C.green,  bg: C.greenL,  icon: "check"  },
  partial:   { label: "Needs Review",    color: C.amber,  bg: C.amberL,  icon: "alert"  },
  required:  { label: "Action Required", color: C.red,    bg: C.redL,    icon: "x"      },
};
const REG_TAGS = {
  gdpr: { label: "GDPR",      color: "#3B5BDB" },
  euai: { label: "EU AI Act", color: "#7C3AED" },
  iso:  { label: "ISO 42001", color: "#0CA678" },
};
const RISK_LIKELIHOOD = { low:"Low", medium:"Medium", high:"High" };
const RISK_IMPACT     = { low:"Low", medium:"Medium", high:"High", critical:"Critical" };
const RISK_STATUS     = { open:"Open", accepted:"Accepted", mitigated:"Mitigated", closed:"Closed" };
const RISK_CATEGORY   = {
  model_accuracy:"Model Accuracy", data_privacy:"Data Privacy",
  bias_fairness:"Bias & Fairness", transparency:"Transparency",
  security:"Security", operational:"Operational", regulatory:"Regulatory",
};
const RISK_COLOR = {
  open: C.red, accepted: C.amber, mitigated: C.green, closed: C.text3,
};

const RegTag = ({ reg }) => {
  const t = REG_TAGS[reg] || { label: reg.toUpperCase(), color: C.text3 };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
      background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}30`,
    }}>{t.label}</span>
  );
};

// ── Toggle switch ──────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange, disabled }) => (
  <div onClick={() => !disabled && onChange(!value)}
    style={{
      width: 40, height: 22, borderRadius: 11, cursor: disabled ? "default" : "pointer",
      background: value ? C.accent : C.border, transition: "background .2s", position: "relative",
      opacity: disabled ? 0.5 : 1, flexShrink: 0,
    }}>
    <div style={{
      width: 16, height: 16, borderRadius: "50%", background: "white",
      position: "absolute", top: 3, left: value ? 21 : 3, transition: "left .15s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    }} />
  </div>
);

// ── Policy row ─────────────────────────────────────────────────────────────────
const PolicyRow = ({ label, description, value, onChange }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 14,
    padding: "12px 0", borderBottom: `1px solid ${C.border}`,
  }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{label}</div>
      {description && <div style={{ fontSize: 11, color: C.text3, marginTop: 2, lineHeight: 1.5 }}>{description}</div>}
    </div>
    <Toggle value={!!value} onChange={onChange} />
  </div>
);

// ── A) Compliance Card (with persist) ─────────────────────────────────────────
function ComplianceCard({ icon, title, description, status, detail, action, regulations = [], onAction, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const st = STATUS[status] || STATUS.partial;
  return (
    <div style={{
      background: C.surface, borderRadius: 14, border: `1.5px solid ${open ? C.accent+"40" : C.border}`,
      overflow: "hidden", marginBottom: 10,
      boxShadow: open ? "0 4px 20px rgba(0,0,0,0.08)" : "none", transition: "all .2s",
    }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: st.bg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Ic n={icon} s={17} c={st.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{title}</span>
            {regulations.map(r => <RegTag key={r} reg={r} />)}
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{description}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: "3px 10px", borderRadius: 99, border: `1px solid ${st.color}30` }}>
            <Ic n={st.icon} s={10} c={st.color} /> {st.label}
          </span>
          <Ic n={open ? "chevDown" : "chevron"} s={14} c={C.text3} />
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
          {detail && <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.7, margin: "12px 0 0" }}>{detail}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {/* Status override */}
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(STATUS).map(([k, v]) => (
                <button key={k} onClick={() => onStatusChange?.(k)}
                  style={{
                    padding: "4px 12px", borderRadius: 7, border: `1.5px solid ${status === k ? v.color : C.border}`,
                    background: status === k ? v.bg : "transparent", color: status === k ? v.color : C.text3,
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F,
                  }}>{v.label}</button>
              ))}
            </div>
            {action && (
              <button onClick={() => onAction?.(action)}
                style={{
                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.accent}`,
                  background: C.accentL, color: C.accent, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: F,
                }}>
                {action.label} <Ic n="arrowRight" s={12} c={C.accent} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── B) Bias Scan Panel ─────────────────────────────────────────────────────────
function BiasScanPanel({ environment }) {
  const [mode, setMode]       = useState("jd"); // "jd" | "scores"
  const [jdText, setJdText]   = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [loadingScores, setLoadingScores] = useState(false);

  const runJdScan = async () => {
    if (!jdText.trim()) return;
    setScanning(true); setResult(null); setError(null);
    try {
      const data = await api.post("/bias-scan", {
        job_description: jdText,
        job_title: jobTitle,
        environment_id: environment?.id,
      });
      setResult(data);
    } catch (e) { setError(e.message || "Scan failed"); }
    setScanning(false);
  };

  const loadScoreDistribution = async () => {
    if (!environment?.id) return;
    setLoadingScores(true);
    try {
      const records = await api.get(`/records?object_slug=people&environment_id=${environment.id}&limit=200`);
      const all = Array.isArray(records) ? records : (records.records || []);
      // Group by location and count match scores
      const byLocation = {};
      all.forEach(r => {
        const loc = r.data?.location || "Unknown";
        const key = loc.split(",")[0].trim();
        if (!byLocation[key]) byLocation[key] = { total: 0, count: 0, n: 0 };
        const score = r.data?.ai_match_score || r.data?.match_score;
        if (score !== undefined && score !== null) {
          byLocation[key].total += Number(score);
          byLocation[key].n++;
        }
        byLocation[key].count++;
      });
      const groups = Object.entries(byLocation)
        .filter(([, v]) => v.n > 0)
        .map(([label, v]) => ({
          label: `Location: ${label}`,
          avg: Math.round(v.total / v.n),
          n: v.n,
          total_records: v.count,
        }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 8);
      if (groups.length > 0) {
        const avgAll = Math.round(groups.reduce((s, g) => s + g.avg * g.n, 0) / groups.reduce((s, g) => s + g.n, 0));
        groups.forEach(g => { g.deviation = g.avg - avgAll; g.flagged = Math.abs(g.deviation) > 12; });
      }
      setScoreData({ groups, scanned: all.filter(r => r.data?.ai_match_score || r.data?.match_score).length });
    } catch { setScoreData({ groups: [], scanned: 0 }); }
    setLoadingScores(false);
  };

  const SEV = { high: { c: C.red, bg: C.redL }, medium: { c: C.amber, bg: C.amberL }, low: { c: C.text3, bg: C.bg } };
  return (
    <div>
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["jd","Job Description Analysis"],["scores","Match Score Distribution"]].map(([id, label]) => (
          <button key={id} onClick={() => { setMode(id); if (id === "scores" && !scoreData) loadScoreDistribution(); }}
            style={{
              padding: "7px 16px", borderRadius: 8, border: `1.5px solid ${mode===id ? C.accent : C.border}`,
              background: mode===id ? C.accentL : C.surface, color: mode===id ? C.accent : C.text2,
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F,
            }}>{label}</button>
        ))}
      </div>

      {mode === "jd" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
              placeholder="Job title (optional)"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, background: C.surface, color: C.text1, outline: "none" }} />
          </div>
          <textarea value={jdText} onChange={e => setJdText(e.target.value)}
            placeholder="Paste job description here to scan for biased language, qualification inflation, and inclusive hiring issues…"
            rows={8}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, background: C.surface, color: C.text1, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 10 }}>
            {result && <button onClick={() => setResult(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Clear</button>}
            <button onClick={runJdScan} disabled={scanning || !jdText.trim()} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 20px",
              borderRadius: 9, border: "none", background: C.purple, color: "white",
              fontSize: 13, fontWeight: 700, cursor: (scanning || !jdText.trim()) ? "default" : "pointer",
              opacity: (scanning || !jdText.trim()) ? 0.6 : 1, fontFamily: F,
            }}>
              <Ic n="scan" s={14} c="white" /> {scanning ? "Analysing…" : "Run Bias Scan"}
            </button>
          </div>
          {error && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: C.redL, color: C.red, fontSize: 12 }}>{error}</div>}
          {result && (
            <div style={{ marginTop: 16 }}>
              {/* Score header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
                borderRadius: 12, background: result.overall_score >= 75 ? C.greenL : result.overall_score >= 50 ? C.amberL : C.redL,
                border: `1.5px solid ${result.overall_score >= 75 ? C.green : result.overall_score >= 50 ? C.amber : C.red}40`,
                marginBottom: 16,
              }}>
                <div style={{ width: 56, height: 56, position: "relative", flexShrink: 0 }}>
                  <svg width={56} height={56} viewBox="0 0 56 56">
                    <circle cx={28} cy={28} r={22} fill="none" stroke={C.border} strokeWidth={6}/>
                    <circle cx={28} cy={28} r={22} fill="none"
                      stroke={result.overall_score >= 75 ? C.green : result.overall_score >= 50 ? C.amber : C.red}
                      strokeWidth={6} strokeLinecap="round"
                      strokeDasharray={`${result.overall_score * 1.382} 138.2`}
                      strokeDashoffset="34.55" transform="rotate(-90 28 28)"/>
                  </svg>
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color: C.text1 }}>{result.overall_score}</div>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text1 }}>Inclusivity Score</div>
                  <div style={{ fontSize: 12, color: C.text2, marginTop: 4, lineHeight: 1.5, maxWidth: 480 }}>{result.summary}</div>
                </div>
              </div>
              {/* Issues */}
              {result.issues?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Issues Found ({result.issues.length})</div>
                  {result.issues.map((issue, i) => {
                    const sv = SEV[issue.severity] || SEV.low;
                    return (
                      <div key={i} style={{ marginBottom: 8, padding: "12px 14px", borderRadius: 10, background: sv.bg, border: `1px solid ${sv.c}30` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: sv.c, background: `${sv.c}20`, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" }}>{issue.severity}</span>
                          <span style={{ fontSize: 11, color: C.text3, textTransform: "uppercase", letterSpacing: ".04em" }}>{issue.category?.replace(/_/g," ")}</span>
                        </div>
                        {issue.quote && <div style={{ fontSize: 12, fontStyle: "italic", color: C.text2, marginBottom: 6 }}>"{issue.quote}"</div>}
                        <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>{issue.explanation}</div>
                        {issue.suggestion && <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>✦ {issue.suggestion}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Strengths */}
              {result.strengths?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Strengths</div>
                  {result.strengths.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12, color: C.green }}>
                      <Ic n="check" s={13} c={C.green} /> {s}
                    </div>
                  ))}
                </div>
              )}
              {/* Rewritten summary */}
              {result.rewritten_summary && (
                <div style={{ padding: "14px 16px", borderRadius: 10, background: C.accentL, border: `1px solid ${C.accent}30` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Suggested Rewrite</div>
                  <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.7 }}>{result.rewritten_summary}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "scores" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.text3 }}>
              {scoreData ? `${scoreData.scanned} candidates with AI match scores analysed` : "Load score distribution data"}
            </div>
            <button onClick={loadScoreDistribution} disabled={loadingScores}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}>
              <Ic n="refresh" s={12} c={C.text3} /> {loadingScores ? "Loading…" : "Refresh"}
            </button>
          </div>
          {loadingScores && <div style={{ padding: 32, textAlign: "center", color: C.text3 }}>Analysing score distributions…</div>}
          {scoreData && !loadingScores && (
            scoreData.groups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px", color: C.text3, background: C.surface, borderRadius: 12, border: `1.5px dashed ${C.border}` }}>
                No AI match scores found. Scores are generated when running AI matching on candidate records.
              </div>
            ) : (
              <div style={{ background: C.surface, borderRadius: 12, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", background: C.bg, borderBottom: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 60px 1fr 60px 60px", gap: 8, fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  <span>Group</span><span>n</span><span>Avg Score</span><span>Avg</span><span>Δ Avg</span>
                </div>
                {scoreData.groups.map((g, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr 60px 1fr 60px 60px", gap: 8,
                    alignItems: "center", padding: "10px 16px",
                    borderBottom: i < scoreData.groups.length - 1 ? `1px solid ${C.border}` : "none",
                    background: g.flagged ? `${C.amber}08` : "transparent",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.text2 }}>
                      {g.flagged && <Ic n="alert" s={13} c={C.amber} />}
                      {g.label}
                    </div>
                    <div style={{ fontSize: 11, color: C.text3 }}>{g.n}</div>
                    <div style={{ height: 6, borderRadius: 99, background: C.border, overflow: "hidden" }}>
                      <div style={{ width: `${g.avg}%`, height: "100%", borderRadius: 99, background: g.flagged ? C.amber : C.green }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text1 }}>{g.avg}%</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: g.deviation > 0 ? C.green : g.deviation < -8 ? C.amber : C.text3 }}>
                      {g.deviation > 0 ? `+${g.deviation}` : g.deviation}
                    </div>
                  </div>
                ))}
                {scoreData.groups.some(g => g.flagged) && (
                  <div style={{ padding: "10px 16px", background: C.amberL, borderTop: `1px solid ${C.amber}30`, display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.amber, fontWeight: 600 }}>
                    <Ic n="alert" s={14} c={C.amber} />
                    Flagged groups deviate &gt;12 points from the average — review AI matching weights
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── C) Risk Register ──────────────────────────────────────────────────────────
function RiskRegister({ environment }) {
  const [risks, setRisks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(null); // null | {} | existing risk
  const [filterStatus, setFilter] = useState("all");

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    try {
      const data = await api.get(`/ai-governance/risk-register?environment_id=${environment.id}`);
      setRisks(Array.isArray(data) ? data : []);
    } catch { setRisks([]); }
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    try {
      if (form.id) {
        await api.patch(`/ai-governance/risk-register/${form.id}`, form);
      } else {
        await api.post("/ai-governance/risk-register", { ...form, environment_id: environment?.id });
      }
      await load();
      setEditing(null);
    } catch (e) { alert("Save failed: " + e.message); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this risk?")) return;
    await api.delete(`/ai-governance/risk-register/${id}`);
    await load();
  };

  const RISK_SCORE = (r) => {
    const L = { low: 1, medium: 2, high: 3 };
    const I = { low: 1, medium: 2, high: 3, critical: 4 };
    return (L[r.likelihood] || 1) * (I[r.impact] || 1);
  };
  const scoreColor = (s) => s >= 9 ? C.red : s >= 4 ? C.amber : C.green;

  const displayed = risks.filter(r => filterStatus === "all" || r.status === filterStatus)
    .sort((a, b) => RISK_SCORE(b) - RISK_SCORE(a));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "open", "accepted", "mitigated", "closed"].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "5px 12px", borderRadius: 7, border: `1.5px solid ${filterStatus === s ? C.accent : C.border}`,
              background: filterStatus === s ? C.accentL : C.surface, color: filterStatus === s ? C.accent : C.text3,
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F, textTransform: "capitalize",
            }}>{s === "all" ? `All (${risks.length})` : `${RISK_STATUS[s] || s} (${risks.filter(r => r.status === s).length})`}</button>
          ))}
        </div>
        <button onClick={() => setEditing({})} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
          borderRadius: 9, border: "none", background: C.accent, color: "white",
          fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F,
        }}><Ic n="plus" s={13} c="white" /> Add Risk</button>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: C.text3 }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 16px", color: C.text3, background: C.surface, borderRadius: 12, border: `1.5px dashed ${C.border}` }}>
          <Ic n="flag" s={28} c={C.border} />
          <div style={{ marginTop: 12, fontWeight: 600 }}>No risks logged</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Document accepted and mitigated AI risks for your governance record</div>
        </div>
      ) : (
        <div>
          {displayed.map(risk => {
            const score = RISK_SCORE(risk);
            const sc    = scoreColor(score);
            return (
              <div key={risk.id} style={{
                background: C.surface, borderRadius: 12, border: `1.5px solid ${C.border}`,
                marginBottom: 10, padding: "14px 16px",
                borderLeft: `4px solid ${RISK_COLOR[risk.status] || C.text3}`,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{risk.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: sc, background: `${sc}18`, padding: "2px 7px", borderRadius: 5 }}>Score {score}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: RISK_COLOR[risk.status], background: `${RISK_COLOR[risk.status]}18`, padding: "2px 7px", borderRadius: 5, textTransform: "capitalize" }}>{RISK_STATUS[risk.status] || risk.status}</span>
                      {risk.regulations?.map(r => <RegTag key={r} reg={r} />)}
                    </div>
                    {risk.description && <div style={{ fontSize: 12, color: C.text3, marginBottom: 6 }}>{risk.description}</div>}
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: C.text3 }}>
                      <span>Likelihood: <strong style={{ color: C.text2 }}>{RISK_LIKELIHOOD[risk.likelihood] || risk.likelihood}</strong></span>
                      <span>Impact: <strong style={{ color: C.text2 }}>{RISK_IMPACT[risk.impact] || risk.impact}</strong></span>
                      <span>Category: <strong style={{ color: C.text2 }}>{RISK_CATEGORY[risk.category] || risk.category}</strong></span>
                      {risk.owner && <span>Owner: <strong style={{ color: C.text2 }}>{risk.owner}</strong></span>}
                      {risk.review_date && <span>Review: <strong style={{ color: C.text2 }}>{new Date(risk.review_date).toLocaleDateString("en-GB")}</strong></span>}
                    </div>
                    {risk.mitigation && <div style={{ marginTop: 8, fontSize: 12, color: C.green, fontWeight: 600 }}>✦ {risk.mitigation}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setEditing(risk)} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, fontSize: 11, cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 4 }}>
                      <Ic n="edit" s={11} c={C.text3} /> Edit
                    </button>
                    <button onClick={() => remove(risk.id)} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${C.redL}`, background: C.redL, color: C.red, fontSize: 11, cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 4 }}>
                      <Ic n="trash" s={11} c={C.red} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Risk Edit Modal */}
      {editing !== null && <RiskModal risk={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function RiskModal({ risk, onSave, onClose }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "operational",
    likelihood: "medium", impact: "medium", status: "open",
    owner: "", mitigation: "", review_date: "", regulations: [],
    ...risk,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = { padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, background: C.surface, color: C.text1, outline: "none", width: "100%", boxSizing: "border-box" };
  const sel = { ...inp, cursor: "pointer" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,41,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text1 }}>{form.id ? "Edit Risk" : "Log New Risk"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Ic n="x" s={18} c={C.text3} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="e.g. AI scoring may disadvantage early-career candidates" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} style={{ ...inp, marginTop: 5, resize: "vertical" }} placeholder="Describe the risk in detail…" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} style={{ ...sel, marginTop: 5 }}>
                {Object.entries(RISK_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} style={{ ...sel, marginTop: 5 }}>
                {Object.entries(RISK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>Likelihood</label>
              <select value={form.likelihood} onChange={e => set("likelihood", e.target.value)} style={{ ...sel, marginTop: 5 }}>
                {Object.entries(RISK_LIKELIHOOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>Impact</label>
              <select value={form.impact} onChange={e => set("impact", e.target.value)} style={{ ...sel, marginTop: 5 }}>
                {Object.entries(RISK_IMPACT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>Owner</label>
              <input value={form.owner} onChange={e => set("owner", e.target.value)} style={{ ...inp, marginTop: 5 }} placeholder="Name or team" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>Review Date</label>
              <input type="date" value={form.review_date || ""} onChange={e => set("review_date", e.target.value)} style={{ ...inp, marginTop: 5 }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>Mitigation Plan</label>
            <textarea value={form.mitigation} onChange={e => set("mitigation", e.target.value)} rows={2} style={{ ...inp, marginTop: 5, resize: "vertical" }} placeholder="How is this risk being addressed?" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>Regulations</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {["gdpr","euai","iso"].map(r => (
                <button key={r} onClick={() => set("regulations", form.regulations?.includes(r) ? form.regulations.filter(x => x !== r) : [...(form.regulations||[]), r])}
                  style={{ padding: "4px 12px", borderRadius: 7, border: `1.5px solid ${form.regulations?.includes(r) ? REG_TAGS[r].color : C.border}`, background: form.regulations?.includes(r) ? `${REG_TAGS[r].color}18` : "transparent", color: form.regulations?.includes(r) ? REG_TAGS[r].color : C.text3, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
                  {REG_TAGS[r].label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.text2, fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: F }}>Cancel</button>
          <button onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }} disabled={saving || !form.title?.trim()}
            style={{ flex: 2, padding: "10px", borderRadius: 9, border: "none", background: C.accent, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: F, opacity: (!form.title?.trim()) ? 0.5 : 1 }}>
            {saving ? "Saving…" : form.id ? "Save Changes" : "Log Risk"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── D) AI Usage Dashboard ─────────────────────────────────────────────────────
function AiUsageDashboard({ environment }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month"); // month | week | all

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    try {
      const [usage, credits] = await Promise.all([
        api.get(`/ai-credits/usage?environment_id=${environment.id}&period=${period}`).catch(() => null),
        api.get(`/ai-credits/allocation?environment_id=${environment.id}`).catch(() => null),
      ]);
      setData({ usage, credits });
    } catch { setData(null); }
    setLoading(false);
  }, [environment?.id, period]);

  useEffect(() => { load(); }, [load]);

  const FEATURE_LABELS = {
    copilot: "AI Copilot", matching: "AI Matching", cv_parsing: "CV Parsing",
    bias_scan: "Bias Scanner", jd_generation: "JD Generator", email_draft: "Email Drafting",
    screening: "Screening", interview_questions: "Interview Q's", summary: "Record Summary",
  };
  const FEAT_COLOR = ["#4361EE","#7C3AED","#0CA678","#F59F00","#E03131","#0EA5E9","#EC4899","#14B8A6","#F97316"];

  const fmt = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n || 0);
  const fmtCost = (n) => n ? `$${Number(n).toFixed(3)}` : "$0.000";

  const usage = data?.usage;
  const credits = data?.credits;

  // Build chart bars
  const features = usage?.by_feature || [];
  const maxTokens = features.reduce((m, f) => Math.max(m, (f.tokens_in || 0) + (f.tokens_out || 0)), 0) || 1;

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["week","This Week"],["month","This Month"],["all","All Time"]].map(([id, label]) => (
          <button key={id} onClick={() => setPeriod(id)} style={{
            padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${period===id ? C.accent : C.border}`,
            background: period===id ? C.accentL : C.surface, color: period===id ? C.accent : C.text3,
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F,
          }}>{label}</button>
        ))}
        <button onClick={load} disabled={loading} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text3, fontSize: 12, cursor: "pointer", fontFamily: F }}>
          <Ic n="refresh" s={12} c={C.text3} /> Refresh
        </button>
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center", color: C.text3 }}>Loading usage data…</div>}

      {!loading && !usage && (
        <div style={{ textAlign: "center", padding: "48px 16px", color: C.text3, background: C.surface, borderRadius: 12, border: `1.5px dashed ${C.border}` }}>
          <Ic n="activity" s={28} c={C.border} />
          <div style={{ marginTop: 12, fontWeight: 600 }}>No usage data available</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>AI usage is tracked automatically when features are used</div>
        </div>
      )}

      {!loading && usage && (
        <>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Requests", value: fmt(usage.requests), icon: "zap", color: C.accent },
              { label: "Tokens Used", value: fmt((usage.tokens_in||0)+(usage.tokens_out||0)), icon: "activity", color: C.purple },
              { label: "AI Cost", value: fmtCost(usage.cost_anthropic), icon: "dollar", color: C.green },
              { label: "Unique Features", value: String(features.length), icon: "sparkles", color: C.amber },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: C.surface, borderRadius: 12, border: `1.5px solid ${C.border}`, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${kpi.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ic n={kpi.icon} s={14} c={kpi.color} />
                  </div>
                  <span style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>{kpi.label}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.text1 }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Credit allocation */}
          {credits && (
            <div style={{ background: C.surface, borderRadius: 12, border: `1.5px solid ${C.border}`, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>Credit Allocation</div>
                <div style={{ fontSize: 12, color: C.text3 }}>
                  {credits.used_credits != null ? `${fmtCost(credits.used_credits)} of ${fmtCost(credits.allocated_credits)} used` : "No allocation set"}
                </div>
              </div>
              {credits.allocated_credits > 0 && (
                <>
                  <div style={{ height: 8, borderRadius: 99, background: C.border, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{
                      height: "100%", borderRadius: 99, transition: "width .5s",
                      width: `${Math.min(100, (credits.used_credits / credits.allocated_credits) * 100)}%`,
                      background: credits.used_credits / credits.allocated_credits > 0.9 ? C.red : credits.used_credits / credits.allocated_credits > 0.7 ? C.amber : C.green,
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.text3 }}>
                    {Math.round((credits.used_credits / credits.allocated_credits) * 100)}% of monthly allocation used
                  </div>
                </>
              )}
            </div>
          )}

          {/* Feature breakdown bar chart */}
          {features.length > 0 && (
            <div style={{ background: C.surface, borderRadius: 12, border: `1.5px solid ${C.border}`, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 16 }}>Usage by Feature</div>
              {features.slice(0, 10).map((f, i) => {
                const total = (f.tokens_in || 0) + (f.tokens_out || 0);
                const pct   = Math.round((total / maxTokens) * 100);
                const col   = FEAT_COLOR[i % FEAT_COLOR.length];
                return (
                  <div key={f.feature} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: C.text2, fontWeight: 600 }}>{FEATURE_LABELS[f.feature] || f.feature}</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.text3 }}>
                        <span>{f.requests} req</span>
                        <span>{fmt(total)} tok</span>
                      </div>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: C.border, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: col, transition: "width .4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Token split */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: C.surface, borderRadius: 12, border: `1.5px solid ${C.border}`, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: C.text3, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Input Tokens</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text1 }}>{fmt(usage.tokens_in)}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>Context sent to model</div>
            </div>
            <div style={{ background: C.surface, borderRadius: 12, border: `1.5px solid ${C.border}`, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: C.text3, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Output Tokens</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text1 }}>{fmt(usage.tokens_out)}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>Generated by model</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── D2) Data Rights panel (functional) ────────────────────────────────────────
function DataRightsPanel({ environment }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ person_name: "", type: "access", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    try {
      const data = await api.get(`/ai-governance/data-rights?environment_id=${environment.id}`);
      setRequests(Array.isArray(data) ? data : []);
    } catch { setRequests([]); }
    setLoading(false);
  }, [environment?.id]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.person_name.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/ai-governance/data-rights", { ...form, environment_id: environment?.id });
      await load();
      setShowForm(false);
      setForm({ person_name: "", type: "access", notes: "" });
    } catch (e) { alert("Failed: " + e.message); }
    setSubmitting(false);
  };

  const complete = async (id) => {
    await api.patch(`/ai-governance/data-rights/${id}`, { status: "completed" });
    await load();
  };

  const TYPE_LABELS = { access: "Right of Access (Art. 15)", erasure: "Right to Erasure (Art. 17)", portability: "Right to Portability (Art. 20)", explanation: "Right to Explanation (Art. 22)" };
  const TYPE_DESC   = { access: "Export all data held on this individual", erasure: "Delete record and remove from AI processing", portability: "Export data as structured JSON or CSV", explanation: "Export explanation of AI-generated scores or decisions" };
  const STATUS_COL  = { pending: C.amber, completed: C.green, rejected: C.red };

  return (
    <div>
      <div style={{ padding: "14px 16px", borderRadius: 10, background: `${C.accent}08`, border: `1px solid ${C.accent}20`, marginBottom: 20, fontSize: 13, color: C.text2, lineHeight: 1.7 }}>
        Process GDPR data subject rights requests. Each request is logged for compliance audit purposes. Execute the actual data export or erasure from the individual's person record.
      </div>

      {/* Rights coverage */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Rights Covered</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <div key={type} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: C.accentL, padding: "2px 8px", borderRadius: 5, whiteSpace: "nowrap", flexShrink: 0 }}>
              {type === "access" ? "Art. 15" : type === "erasure" ? "Art. 17" : type === "portability" ? "Art. 20" : "Art. 22"}
            </span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text1 }}>{label.split("(")[0].trim()}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{TYPE_DESC[type]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Requests log */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>Requests Log</div>
        <button onClick={() => setShowForm(s => !s)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
          borderRadius: 8, border: "none", background: C.accent, color: "white",
          fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F,
        }}><Ic n="plus" s={12} c="white" /> Log Request</button>
      </div>

      {showForm && (
        <div style={{ background: C.accentL, borderRadius: 12, border: `1.5px solid ${C.accent}30`, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))}
              placeholder="Person name *" style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, background: C.surface, color: C.text1, outline: "none" }} />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, background: C.surface, color: C.text1, outline: "none", cursor: "pointer" }}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes (optional)" style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, background: C.surface, color: C.text1, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Cancel</button>
            <button onClick={submit} disabled={submitting || !form.person_name.trim()} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: C.accent, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F, opacity: !form.person_name.trim() ? 0.5 : 1 }}>
              {submitting ? "Logging…" : "Log Request"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: C.text3 }}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: C.text3, background: C.surface, borderRadius: 12, border: `1.5px dashed ${C.border}`, fontSize: 13 }}>
          No data rights requests logged yet
        </div>
      ) : (
        <div style={{ background: C.surface, borderRadius: 12, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
          {requests.map((r, i) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderBottom: i < requests.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accentL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic n="person" s={16} c={C.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{r.person_name}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{TYPE_LABELS[r.type] || r.type} · {new Date(r.requested_at).toLocaleDateString("en-GB")}</div>
                {r.notes && <div style={{ fontSize: 11, color: C.text3, fontStyle: "italic", marginTop: 2 }}>{r.notes}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COL[r.status] || C.text3, background: `${STATUS_COL[r.status]}18`, padding: "3px 10px", borderRadius: 99, textTransform: "capitalize" }}>{r.status}</span>
                {r.status === "pending" && (
                  <button onClick={() => complete(r.id)} style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${C.green}`, background: C.greenL, color: C.green, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Compliance Overview" },
  { id: "policy",   label: "AI Policy"           },
  { id: "bias",     label: "Bias Monitor"         },
  { id: "audit",    label: "Audit Log"            },
  { id: "risks",    label: "Risk Register"        },
  { id: "usage",    label: "AI Usage"             },
  { id: "rights",   label: "Data Rights"          },
];

function AuditRow({ run }) {
  const [open, setOpen] = useState(false);
  const ts = run.started_at || run.created_at || run.run_at;
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: run.status === "completed" ? C.green : run.status === "failed" ? C.red : C.amber, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{run.workflow_name || run.agent_name || run.feature || "AI Action"}</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{ts ? new Date(ts).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—"}</div>
        </div>
        <div style={{ fontSize: 11, color: run.status === "completed" ? C.green : C.amber, fontWeight: 600, textTransform: "capitalize" }}>{run.status || "—"}</div>
        <Ic n={open ? "chevDown" : "chevron"} s={13} c={C.text3} />
      </div>
      {open && (
        <div style={{ padding: "0 16px 12px", background: C.bg }}>
          <pre style={{ fontSize: 11, color: C.text2, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5, maxHeight: 200, overflow: "auto" }}>
            {JSON.stringify(run, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AiGovernance({ environment }) {
  const [tab, setTab]       = useState("overview");
  const [policy, setPolicy] = useState({
    require_human_review_for_scoring: true,
    require_human_review_for_emails:  true,
    show_ai_badge_on_all_content:     true,
    log_all_ai_decisions:             true,
    allow_ai_field_updates:           false,
    candidate_transparency_notice:    true,
    data_minimisation_mode:           false,
  });
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [auditRuns, setAuditRuns]   = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch]   = useState("");
  const [complianceStatuses, setComplianceStatuses] = useState({});
  const [statusSaving, setStatusSaving] = useState(false);

  const setP = (k, v) => setPolicy(p => ({ ...p, [k]: v }));

  const savePolicy = async () => {
    setSaving(true);
    await api.patch("/security/settings", { ai_governance_policy: policy }).catch(() => {});
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const loadAudit = useCallback(async () => {
    if (!environment?.id) { setAuditLoading(false); return; }
    setAuditLoading(true);
    try {
      const data = await api.get(`/agents/runs?environment_id=${environment.id}&limit=100`);
      setAuditRuns(Array.isArray(data) ? data : (data.runs || []));
    } catch { setAuditRuns([]); }
    setAuditLoading(false);
  }, [environment?.id]);

  // Load persisted compliance statuses
  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/ai-governance/status?environment_id=${environment.id}`)
      .then(d => { if (d.items) setComplianceStatuses(d.items); })
      .catch(() => {});
  }, [environment?.id]);

  useEffect(() => { if (tab === "audit") loadAudit(); }, [tab, loadAudit]);

  const handleStatusChange = async (itemTitle, newStatus) => {
    const updated = { ...complianceStatuses, [itemTitle]: newStatus };
    setComplianceStatuses(updated);
    setStatusSaving(true);
    try {
      await api.patch("/ai-governance/status", { environment_id: environment?.id, items: updated });
    } catch {}
    setStatusSaving(false);
  };

  const handleCardAction = (action) => {
    if (action?.tab) setTab(action.tab);
  };

  const complianceItems = [
    { icon:"eye",    title:"AI Output Labelling",   description:"All AI-generated content is marked with a visible badge",             status: complianceStatuses["AI Output Labelling"]   || (policy.show_ai_badge_on_all_content          ? "compliant" : "required"), detail:"The EU AI Act and GDPR require transparency when automated systems generate content. Vercentic displays a ✦ badge on all AI-written notes, emails and recommendations.", regulations:["euai","gdpr"], action: !policy.show_ai_badge_on_all_content ? { label:"Enable in Policy", tab:"policy"  } : null },
    { icon:"users",  title:"Human Oversight",        description:"Human approval required before AI decisions take effect",             status: complianceStatuses["Human Oversight"]        || (policy.require_human_review_for_scoring      ? "compliant" : "required"), detail:"ISO 42001 and the EU AI Act mandate human oversight for high-risk AI systems. Enabling this ensures a human reviews AI scoring and decisions before they affect candidates.", regulations:["euai","iso"],  action: !policy.require_human_review_for_scoring ? { label:"Configure in Policy", tab:"policy" } : null },
    { icon:"file",   title:"Audit Logging",          description:"All AI decisions logged with input, output, model, and reviewer",     status: complianceStatuses["Audit Logging"]          || (policy.log_all_ai_decisions                  ? "compliant" : "required"), detail:"A complete audit trail is required for demonstrating compliance and investigating disputes. Every AI action, its context, model used, and any human approval is stored.", regulations:["euai","gdpr","iso"], action: policy.log_all_ai_decisions ? { label:"View Audit Log", tab:"audit" } : { label:"Enable in Policy", tab:"policy" } },
    { icon:"zap",    title:"Candidate Transparency", description:"Candidates are informed when AI is used in their assessment",         status: complianceStatuses["Candidate Transparency"] || (policy.candidate_transparency_notice          ? "compliant" : "required"), detail:"Under GDPR Article 13/14 and the EU AI Act, data subjects must be informed when AI is used in hiring decisions. Enabling this appends a transparency notice to candidate-facing communications.", regulations:["gdpr","euai"], action: !policy.candidate_transparency_notice ? { label:"Enable in Policy", tab:"policy" } : null },
    { icon:"sparkles",title:"Explainability",        description:"AI scoring decisions include reasoning and gap analysis",             status: complianceStatuses["Explainability"]         || "partial",                                    detail:"AI match scores in Vercentic include a breakdown of contributing factors (skills, location, experience). Full explainability requires that reasons are surfaced to both recruiters and candidates on request.", regulations:["euai","gdpr"], action: { label:"View AI Matching", tab:"bias" } },
    { icon:"scan",   title:"Bias Monitoring",        description:"Score distributions monitored for demographic patterns",              status: complianceStatuses["Bias Monitoring"]        || "partial",                                    detail:"ISO 42001 requires ongoing monitoring for bias and fairness in AI systems. Run regular bias scans on job descriptions and review match score distributions across candidate groups.", regulations:["euai","iso"],  action: { label:"Run Bias Scan", tab:"bias" } },
    { icon:"shield", title:"Data Minimisation",      description:"AI only processes fields necessary for the task",                    status: complianceStatuses["Data Minimisation"]      || (policy.data_minimisation_mode                ? "compliant" : "partial"),  detail:"GDPR Article 5(1)(c) requires that personal data processing is limited to what is necessary. Data minimisation mode restricts AI agents to only the fields explicitly defined in their configuration.", regulations:["gdpr"],       action: !policy.data_minimisation_mode ? { label:"Enable in Policy", tab:"policy" } : null },
    { icon:"refresh",title:"Right to Erasure",       description:"Deleting a record removes it from AI processing and matching",       status: complianceStatuses["Right to Erasure"]       || "compliant",                                  detail:"GDPR Article 17 requires that deletion of personal data extends to all derived processing. Vercentic's hard delete removes records from the matching index, AI context, and audit trail summaries.", regulations:["gdpr"],       action: { label:"Manage Data Rights", tab:"rights" } },
  ];

  const score      = Math.round((complianceItems.filter(i => (complianceStatuses[i.title] || i.status) === "compliant").length / complianceItems.length) * 100);
  const needsAction = complianceItems.filter(i => (complianceStatuses[i.title] || i.status) !== "compliant").length;

  const filteredAudit = auditSearch
    ? auditRuns.filter(r => JSON.stringify(r).toLowerCase().includes(auditSearch.toLowerCase()))
    : auditRuns;

  return (
    <div style={{ fontFamily: F }}>
      {/* ── Header ── */}
      <div style={{
        borderRadius: 16, padding: "24px 28px", marginBottom: 24,
        background: "linear-gradient(135deg, #0F1729 0%, #1e2d5a 60%, #2d1b69 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "white", marginBottom: 4 }}>AI Governance</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
            EU AI Act · GDPR Article 22 · ISO 42001 · High-risk AI system obligations
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { label: "Compliance Score", value: `${score}%`, color: score >= 75 ? "#4ade80" : score >= 50 ? "#fcd34d" : "#f87171" },
              { label: "Compliant",        value: complianceItems.filter(i => (complianceStatuses[i.title]||i.status)==="compliant").length, color: "#4ade80" },
              { label: "Needs Review",     value: complianceItems.filter(i => (complianceStatuses[i.title]||i.status)==="partial").length,    color: "#fcd34d" },
              { label: "Action Required",  value: complianceItems.filter(i => (complianceStatuses[i.title]||i.status)==="required").length,   color: "#f87171" },
            ].map(k => (
              <div key={k.label}>
                <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Score ring */}
        <svg width={90} height={90} viewBox="0 0 84 84">
          <circle cx={42} cy={42} r={36} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8"/>
          <circle cx={42} cy={42} r={36} fill="none"
            stroke={score >= 75 ? "#4ade80" : score >= 50 ? "#fcd34d" : "#f87171"}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${score * 2.262} 226.2`}
            strokeDashoffset="56.55" transform="rotate(-90 42 42)"/>
          <text x="42" y="47" textAnchor="middle" fill="white" fontSize="16" fontWeight="800" fontFamily="system-ui">{score}%</text>
        </svg>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", borderBottom: `1.5px solid ${C.border}`, marginBottom: 20, overflowX: "auto", gap: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "9px 18px", border: "none", background: "transparent", fontFamily: F,
            fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
            color: tab === t.id ? C.accent : C.text3,
            borderBottom: tab === t.id ? `2.5px solid ${C.accent}` : "2.5px solid transparent",
            marginBottom: -1.5,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── COMPLIANCE OVERVIEW ── */}
      {tab === "overview" && (
        <div>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 16, lineHeight: 1.6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{needsAction > 0 ? `${needsAction} items need attention. Click any card to see details and update status.` : "All compliance items are in good standing."}</span>
            {statusSaving && <span style={{ fontSize: 11, color: C.accent }}>Saving…</span>}
          </div>
          {complianceItems.map((item, i) => (
            <ComplianceCard key={i} {...item}
              status={complianceStatuses[item.title] || item.status}
              onAction={handleCardAction}
              onStatusChange={(s) => handleStatusChange(item.title, s)}
            />
          ))}
        </div>
      )}

      {/* ── POLICY ── */}
      {tab === "policy" && (
        <div>
          <div style={{ fontSize: 12, color: C.amber, marginBottom: 20, lineHeight: 1.6, padding: "10px 14px", borderRadius: 8, background: C.amberL, border: `1px solid ${C.amber}40` }}>
            ⚠ Changes take effect immediately for new AI actions. Existing runs are unaffected.
          </div>
          {[
            { group: "Human Oversight", rows: [
              { label: "Require human review before AI scoring is applied", desc: "Agents with AI Score actions must include a Request Approval step", key: "require_human_review_for_scoring" },
              { label: "Require human review before AI-drafted emails are sent", desc: "AI draft emails are saved as drafts, not auto-sent", key: "require_human_review_for_emails" },
              { label: "Prevent AI from directly updating candidate fields", desc: "AI can suggest field values but cannot write them without confirmation", key: "allow_ai_field_updates", invert: true },
            ]},
            { group: "Transparency", rows: [
              { label: "Show AI badge on all AI-generated content", desc: "Displays ✦ sparkle badge on notes, emails and communications written by AI", key: "show_ai_badge_on_all_content" },
              { label: "Append transparency notice to candidate-facing AI emails", desc: "Adds: 'This message was drafted with AI assistance'", key: "candidate_transparency_notice" },
            ]},
            { group: "Data & Privacy", rows: [
              { label: "Log all AI decisions", desc: "Store every agent run, AI output, and human approval decision in the audit log", key: "log_all_ai_decisions" },
              { label: "Data minimisation mode", desc: "Agents only process fields explicitly listed in their conditions", key: "data_minimisation_mode" },
            ]},
          ].map(({ group, rows }) => (
            <div key={group}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 20, marginBottom: 8 }}>{group}</div>
              {rows.map(r => (
                <PolicyRow key={r.key} label={r.label} description={r.desc}
                  value={r.invert ? !policy[r.key] : policy[r.key]}
                  onChange={v => setP(r.key, r.invert ? !v : v)} />
              ))}
            </div>
          ))}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={savePolicy} disabled={saving} style={{
              padding: "10px 24px", borderRadius: 10, border: "none",
              background: saved ? C.green : C.accent, color: "white",
              fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: F,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {saved ? <><Ic n="check" s={14} c="white" /> Saved!</> : saving ? "Saving…" : "Save Policy"}
            </button>
          </div>
        </div>
      )}

      {/* ── BIAS MONITOR ── */}
      {tab === "bias" && <BiasScanPanel environment={environment} />}

      {/* ── AUDIT LOG ── */}
      {tab === "audit" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Search audit log…"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: F, background: C.surface, color: C.text1, outline: "none" }} />
            <button onClick={loadAudit} disabled={auditLoading} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface,
              color: C.text2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F,
            }}>
              <Ic n="refresh" s={12} c={C.text3} /> Refresh
            </button>
            {auditRuns.length > 0 && (
              <button onClick={() => {
                const blob = new Blob([JSON.stringify(auditRuns, null, 2)], { type: "application/json" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = `ai-audit-log-${new Date().toISOString().split("T")[0]}.json`; a.click();
              }} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface,
                color: C.text2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F,
              }}>
                <Ic n="download" s={12} c={C.text3} /> Export
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 10 }}>
            {auditLoading ? "Loading…" : `${filteredAudit.length} AI decisions logged${auditSearch ? ` (filtered)` : ""}`}
          </div>
          {!auditLoading && filteredAudit.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: C.text3, background: C.surface, borderRadius: 12, border: `1.5px dashed ${C.border}` }}>
              <Ic n="file" s={28} c={C.border} />
              <div style={{ marginTop: 12, fontWeight: 600 }}>{auditSearch ? "No matching entries" : "No audit records yet"}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>AI agent runs will appear here when they occur</div>
            </div>
          ) : (
            <div style={{ background: C.surface, borderRadius: 12, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
              {filteredAudit.map((run, i) => <AuditRow key={run.id || i} run={run} />)}
            </div>
          )}
        </div>
      )}

      {/* ── RISK REGISTER ── */}
      {tab === "risks" && <RiskRegister environment={environment} />}

      {/* ── AI USAGE ── */}
      {tab === "usage" && <AiUsageDashboard environment={environment} />}

      {/* ── DATA RIGHTS ── */}
      {tab === "rights" && <DataRightsPanel environment={environment} />}
    </div>
  );
}
