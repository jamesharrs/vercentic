import { useState, useCallback } from "react";
import { usePermissions } from "./PermissionContext";
import { tFetch } from "./apiClient";

// ── Shared design tokens (inline, no Theme dependency) ───────────────────────
const C = {
  bg:          "var(--t-bg,#f7f8fc)",
  surface:     "var(--t-surface,#ffffff)",
  border:      "var(--t-border,#e8eaf0)",
  accent:      "var(--t-accent,#4361EE)",
  accentLight: "var(--t-accent-light,#EEF2FF)",
  text1:       "var(--t-text1,#111827)",
  text2:       "var(--t-text2,#374151)",
  text3:       "var(--t-text3,#9ca3af)",
};
const F = "var(--t-font,'Inter',sans-serif)";

const SEV = {
  high:   { label:"High",   color:"#dc2626", bg:"#fef2f2", border:"#fecaca" },
  medium: { label:"Medium", color:"#d97706", bg:"#fffbeb", border:"#fde68a" },
  low:    { label:"Low",    color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe" },
};

const CAT_LABELS = {
  gendered_language:       "Gendered Language",
  age_bias:                "Age Bias",
  qualification_inflation: "Qualification Inflation",
  cultural_bias:           "Cultural Bias",
  disability:              "Disability / Accessibility",
  accessibility:           "Accessibility",
  other:                   "Other",
};

function ScoreRing({ score }) {
  const r   = 28;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  const color = pct >= 75 ? "#0ca678" : pct >= 50 ? "#d97706" : "#dc2626";
  return (
    <div style={{ position:"relative", width:72, height:72, flexShrink:0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke={C.border} strokeWidth="6"/>
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
          strokeLinecap="round" style={{ transition:"stroke-dasharray .6s ease" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:15, fontWeight:800, color, lineHeight:1 }}>{pct}</span>
        <span style={{ fontSize:9, color:C.text3, fontWeight:600 }}>/ 100</span>
      </div>
    </div>
  );
}

function IssueCard({ issue }) {
  const [open, setOpen] = useState(false);
  const sev = SEV[issue.severity] || SEV.low;
  return (
    <div style={{ border:`1px solid ${sev.border}`, borderRadius:10, overflow:"hidden",
      marginBottom:8, background:sev.bg }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
          background:"none", border:"none", cursor:"pointer", textAlign:"left", fontFamily:F }}>
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99,
          background:sev.color, color:"white", flexShrink:0, letterSpacing:"0.04em" }}>
          {sev.label}
        </span>
        <span style={{ flex:1, fontSize:12, fontWeight:600, color:C.text1 }}>
          {CAT_LABELS[issue.category] || issue.category}
        </span>
        {issue.quote && (
          <span style={{ fontSize:11, color:C.text3, fontStyle:"italic",
            maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            "{issue.quote}"
          </span>
        )}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ flexShrink:0, opacity:.5, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition:"transform .2s" }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding:"0 14px 12px", display:"flex", flexDirection:"column", gap:8 }}>
          {issue.quote && (
            <div style={{ fontSize:12, color:sev.color, fontStyle:"italic",
              borderLeft:`3px solid ${sev.color}`, paddingLeft:8 }}>
              "{issue.quote}"
            </div>
          )}
          <p style={{ margin:0, fontSize:12, color:C.text2, lineHeight:1.6 }}>
            {issue.explanation}
          </p>
          {issue.suggestion && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"8px 10px",
              background:"white", borderRadius:8, border:`1px solid ${C.border}` }}>
              <span style={{ fontSize:10, fontWeight:700, color:"#0ca678",
                background:"#f0fdf4", padding:"2px 6px", borderRadius:99, flexShrink:0, marginTop:1 }}>
                SUGGESTION
              </span>
              <span style={{ fontSize:12, color:C.text1, lineHeight:1.5 }}>
                {issue.suggestion}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BiasScanner({ record, environment }) {
  const { canGlobal } = usePermissions();
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [copied,   setCopied]   = useState(false);

  const canScan = canGlobal("record_bias_scan");

  const jd = record?.data?.description || record?.data?.job_description || "";
  const title = record?.data?.job_title || record?.data?.name || "";

  const runScan = useCallback(async () => {
    if (!jd.trim()) { setError("No job description found on this record."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res  = await tFetch("/api/bias-scan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          job_description: jd,
          job_title:       title,
          environment_id:  environment?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [jd, title, environment?.id]);

  const copyRewrite = () => {
    if (!result?.rewritten_summary) return;
    navigator.clipboard.writeText(result.rewritten_summary).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Not permitted ─────────────────────────────────────────────────────────
  if (!canScan) return (
    <div style={{ padding:"20px 0", textAlign:"center", color:C.text3, fontSize:13 }}>
      Bias Scanner is not enabled for your role.
    </div>
  );

  // ── No JD yet ─────────────────────────────────────────────────────────────
  if (!jd.trim()) return (
    <div style={{ padding:"20px 16px", textAlign:"center" }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.text3}
        strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom:8 }}>
        <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"/>
      </svg>
      <p style={{ margin:0, fontSize:13, color:C.text3 }}>
        Add a job description to this record to run a bias scan.
      </p>
    </div>
  );

  // ── Idle / initial ────────────────────────────────────────────────────────
  if (!result && !loading) return (
    <div style={{ padding:"4px 0" }}>
      <div style={{ padding:"14px 16px", background:`${C.accent}08`, borderRadius:12,
        border:`1.5px solid ${C.accent}20`, marginBottom:12 }}>
        <p style={{ margin:"0 0 10px", fontSize:13, color:C.text2, lineHeight:1.6 }}>
          Scan this job description for language or requirements that may
          unintentionally deter qualified candidates or introduce hiring bias.
        </p>
        <p style={{ margin:0, fontSize:11, color:C.text3 }}>
          Checks for: gendered language · age bias · qualification inflation ·
          cultural bias · accessibility issues
        </p>
      </div>
      <button onClick={runScan}
        style={{ width:"100%", padding:"10px 0", borderRadius:10, border:"none",
          background:C.accent, color:"white", fontSize:13, fontWeight:700,
          cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center",
          justifyContent:"center", gap:8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white"
          strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        Run Bias Scan
      </button>
      {error && (
        <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8,
          background:"#fef2f2", color:"#dc2626", fontSize:12, border:"1px solid #fecaca" }}>
          {error}
        </div>
      )}
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding:"32px 0", display:"flex", flexDirection:"column",
      alignItems:"center", gap:12 }}>
      <div style={{ width:32, height:32, border:`3px solid ${C.accentLight}`,
        borderTopColor:C.accent, borderRadius:"50%",
        animation:"spin 0.8s linear infinite" }}/>
      <p style={{ margin:0, fontSize:13, color:C.text3 }}>Analysing job description…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Results ───────────────────────────────────────────────────────────────
  const issues    = result.issues    || [];
  const strengths = result.strengths || [];
  const highCount = issues.filter(i => i.severity === "high").length;
  const medCount  = issues.filter(i => i.severity === "medium").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* Score header */}
      <div style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 16px",
        background:C.surface, borderRadius:12, border:`1px solid ${C.border}` }}>
        <ScoreRing score={result.overall_score ?? 0}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text1, marginBottom:4 }}>
            Inclusivity Score
          </div>
          <p style={{ margin:"0 0 8px", fontSize:12, color:C.text2, lineHeight:1.5 }}>
            {result.summary}
          </p>
          <div style={{ display:"flex", gap:8 }}>
            {highCount > 0 && (
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px",
                borderRadius:99, background:"#fef2f2", color:"#dc2626" }}>
                {highCount} high
              </span>
            )}
            {medCount > 0 && (
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px",
                borderRadius:99, background:"#fffbeb", color:"#d97706" }}>
                {medCount} medium
              </span>
            )}
            {issues.length === 0 && (
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px",
                borderRadius:99, background:"#f0fdf4", color:"#0ca678" }}>
                No issues found
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase",
            letterSpacing:"0.07em", marginBottom:8 }}>
            Issues Found ({issues.length})
          </div>
          {issues.map((issue, i) => <IssueCard key={i} issue={issue}/>)}
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase",
            letterSpacing:"0.07em", marginBottom:8 }}>
            What's Working
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {strengths.map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8,
                fontSize:12, color:C.text2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="#0ca678" strokeWidth="2.5" strokeLinecap="round"
                  style={{ flexShrink:0, marginTop:1 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rewritten summary */}
      {result.rewritten_summary && (
        <div style={{ padding:"12px 14px", borderRadius:10, background:"#f0fdf4",
          border:"1.5px solid #bbf7d0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#065f46",
              textTransform:"uppercase", letterSpacing:"0.07em" }}>
              Suggested Rewrite
            </span>
            <button onClick={copyRewrite}
              style={{ fontSize:11, fontWeight:600, color:"#0ca678",
                border:"none", cursor:"pointer", fontFamily:F, padding:"2px 6px",
                borderRadius:6, background: copied ? "#dcfce7" : "transparent" }}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p style={{ margin:0, fontSize:12, color:"#065f46", lineHeight:1.7,
            fontStyle:"italic" }}>
            {result.rewritten_summary}
          </p>
        </div>
      )}

      {/* Re-scan */}
      <button onClick={runScan}
        style={{ alignSelf:"flex-start", padding:"7px 14px", borderRadius:8,
          border:`1.5px solid ${C.border}`, background:"white", fontSize:12,
          fontWeight:600, color:C.text2, cursor:"pointer", fontFamily:F,
          display:"flex", alignItems:"center", gap:6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Re-scan
      </button>
    </div>
  );
}
