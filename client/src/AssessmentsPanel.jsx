/**
 * AssessmentsPanel.jsx
 * Shows Screening responses and Interview Scorecards for a candidate,
 * always scoped to a specific job application (people_link).
 */
import { useState, useEffect, useCallback } from "react";
import api from "./apiClient.js";
import { ScorecardPanel } from "./Scorecards.jsx";

const F = "var(--t-font,'Plus Jakarta Sans',sans-serif)";
const C = {
  accent:"var(--t-accent,#3b5bdb)", accentLight:"var(--t-accentLight,#eef2ff)",
  border:"var(--t-border,#e5e7eb)", surface:"var(--t-surface,#fff)",
  surface2:"var(--t-surface2,#f8fafc)", text1:"var(--t-text1,#111827)",
  text2:"var(--t-text2,#374151)", text3:"var(--t-text3,#9ca3af)",
  green:"#059669", red:"#ef4444", amber:"#d97706", orange:"#ea580c",
};

// ── Job Picker ────────────────────────────────────────────────────────────────
function JobPicker({ links, selectedId, onSelect }) {
  if (!links.length) return (
    <div style={{ fontSize:12, color:C.text3, padding:"10px 0" }}>
      No job applications linked to this candidate.
    </div>
  );
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase",
        letterSpacing:"0.07em", marginBottom:6 }}>Application</div>
      <select value={selectedId||""} onChange={e=>onSelect(e.target.value)}
        style={{ width:"100%", padding:"8px 10px", borderRadius:9, border:`1.5px solid ${C.border}`,
          background:C.surface, color:C.text1, fontFamily:F, fontSize:13, fontWeight:600,
          cursor:"pointer", outline:"none" }}>
        <option value="">— Select a job application —</option>
        {links.map(l => (
          <option key={l.id} value={l.id}>
            {l.job_name || l.target_name || "Job"}{l.stage_name ? ` · ${l.stage_name}` : ""}
            {l.created_at ? ` · Applied ${new Date(l.created_at).toLocaleDateString()}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Screening Tab ─────────────────────────────────────────────────────────────
function ScreeningTab({ recordId, jobId }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recordId || !jobId) return;
    setLoading(true);
    api.get(`/screening/responses/record/${recordId}/job/${jobId}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [recordId, jobId]);

  if (loading) return <div style={{ padding:24, textAlign:"center", color:C.text3, fontFamily:F }}>Loading…</div>;
  if (!data || !data.questions?.length) return (
    <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:12, padding:"28px 20px", textAlign:"center" }}>
      <div style={{ fontSize:24, marginBottom:8 }}>📋</div>
      <div style={{ fontSize:13, fontWeight:600, color:C.text1, marginBottom:4 }}>No screening questions</div>
      <div style={{ fontSize:12, color:C.text3 }}>This job has no screening questions configured, or the candidate applied without answering them.</div>
    </div>
  );

  const knockedOut = data.knocked_out;
  const score      = data.score;
  const answered   = data.questions.filter(q => q.answer !== null && q.answer !== undefined);
  const hasAnswers = answered.length > 0;

  const statusColor = knockedOut ? C.red : score >= 70 ? C.green : score >= 40 ? C.amber : C.text3;
  const statusLabel = knockedOut ? "⛔ Knocked out" : score >= 70 ? "✓ Passed" : score !== null ? "⚠ Review" : "Not evaluated";

  return (
    <div style={{ fontFamily:F }}>
      {/* Summary bar */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
        borderRadius:10, background:C.surface2, border:`1px solid ${C.border}`, marginBottom:16 }}>
        {score !== null && (
          <div style={{ textAlign:"center", minWidth:52 }}>
            <div style={{ fontSize:22, fontWeight:800, color:statusColor, lineHeight:1 }}>{score}%</div>
            <div style={{ fontSize:10, color:C.text3, marginTop:1 }}>Score</div>
          </div>
        )}
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:statusColor }}>{statusLabel}</div>
          {data.submitted_at && (
            <div style={{ fontSize:11, color:C.text3 }}>
              Submitted {new Date(data.submitted_at).toLocaleDateString()}
              {!hasAnswers && " · No answers recorded"}
            </div>
          )}
          {!data.submitted_at && (
            <div style={{ fontSize:11, color:C.text3 }}>Questions not yet answered by candidate</div>
          )}
        </div>
        {knockedOut && (
          <div style={{ fontSize:11, fontWeight:700, color:C.red, background:"#fef2f2",
            padding:"4px 10px", borderRadius:99, border:"1px solid #fecaca" }}>⛔ Knockout triggered</div>
        )}
      </div>

      {/* Questions list */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {data.questions.map((q, i) => {
          const isKnockout  = q.rule_type === "knockout";
          const passed      = q.passed;
          const hasAnswer   = q.answer !== null && q.answer !== undefined;
          const passColor   = passed === true ? C.green : passed === false ? C.red : C.text3;
          const passLabel   = passed === true ? "✓ Pass" : passed === false ? "✗ Fail" : "—";
          const answerStr   = Array.isArray(q.answer) ? q.answer.join(", ") : String(q.answer ?? "No answer");

          return (
            <div key={q.rule_id || i} style={{ padding:"10px 14px", borderRadius:10,
              border:`1.5px solid ${isKnockout && passed === false ? "#fecaca" : C.border}`,
              background: isKnockout && passed === false ? "#fef2f2" : C.surface }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:hasAnswer?4:0 }}>
                    {isKnockout && (
                      <span style={{ fontSize:10, fontWeight:700, color:C.red, background:"#fef2f2",
                        padding:"1px 6px", borderRadius:4, border:"1px solid #fecaca", flexShrink:0 }}>KNOCKOUT</span>
                    )}
                    <span style={{ fontSize:13, fontWeight:600, color:C.text1 }}>{q.question || `Question ${i+1}`}</span>
                  </div>
                  {hasAnswer && (
                    <div style={{ fontSize:13, color:C.text2, marginTop:2 }}>{answerStr}</div>
                  )}
                  {!hasAnswer && (
                    <div style={{ fontSize:12, color:C.text3, fontStyle:"italic" }}>Not answered</div>
                  )}
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:passColor, flexShrink:0,
                  background:`${passColor}12`, padding:"3px 10px", borderRadius:99 }}>{passLabel}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main AssessmentsPanel export ──────────────────────────────────────────────
export default function AssessmentsPanel({ record, environment, session, activeJobId }) {
  const [links,       setLinks]       = useState([]);
  const [selectedLinkId, setSelectedLinkId] = useState(activeJobId || "");
  const [tab,         setTab]         = useState("screening"); // screening | scorecards
  const [loadingLinks, setLoadingLinks] = useState(true);

  // Load all job applications for this person
  useEffect(() => {
    if (!record?.id || !environment?.id) return;
    setLoadingLinks(true);
    api.get(`/records/${record.id}/people-links?environment_id=${environment.id}`)
      .catch(() => api.get(`/people-links?person_record_id=${record.id}&environment_id=${environment.id}`).catch(() => []))
      .then(raw => {
        const arr = Array.isArray(raw) ? raw : (raw?.links || []);
        // Enrich with job name from the target record data
        setLinks(arr.map(l => ({
          ...l,
          job_name: l.target_name || l.job_title || l.job_name || "Job",
          stage_name: l.stage_name || null,
        })));
        // Auto-select: use activeJobId link if provided, else most recent
        if (!selectedLinkId && arr.length) {
          const match = activeJobId ? arr.find(l => l.target_record_id === activeJobId || l.record_id === activeJobId) : null;
          setSelectedLinkId(match?.id || arr[0]?.id || "");
        }
        setLoadingLinks(false);
      });
  }, [record?.id, environment?.id]);

  // When activeJobId changes from outside (e.g. clicking from a different job context), update selection
  useEffect(() => {
    if (!activeJobId || !links.length) return;
    const match = links.find(l => l.target_record_id === activeJobId || l.record_id === activeJobId);
    if (match) setSelectedLinkId(match.id);
  }, [activeJobId, links]);

  const selectedLink = links.find(l => l.id === selectedLinkId);
  const jobRecordId  = selectedLink?.target_record_id || selectedLink?.record_id || null;

  const TABS = [
    { id:"screening",  label:"Screening"  },
    { id:"scorecards", label:"Scorecards" },
  ];

  return (
    <div style={{ fontFamily:F }}>
      {/* Job picker */}
      {loadingLinks
        ? <div style={{ fontSize:12, color:C.text3, padding:"6px 0", marginBottom:12 }}>Loading applications…</div>
        : <JobPicker links={links} selectedId={selectedLinkId} onSelect={setSelectedLinkId} />
      }

      {/* Tab bar */}
      {selectedLinkId && (
        <div style={{ display:"flex", gap:4, marginBottom:16, borderBottom:`2px solid ${C.border}`, paddingBottom:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:"6px 14px", border:"none", borderRadius:"6px 6px 0 0",
                background: tab===t.id ? C.accent : "transparent",
                color: tab===t.id ? "white" : C.text3,
                fontFamily:F, fontSize:12, fontWeight:700, cursor:"pointer",
                borderBottom: tab===t.id ? `2px solid ${C.accent}` : "none",
                marginBottom:-2 }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {!selectedLinkId && !loadingLinks && (
        <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:12, padding:"28px 20px", textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:8 }}>🔗</div>
          <div style={{ fontSize:13, fontWeight:600, color:C.text1, marginBottom:4 }}>Select a job application above</div>
          <div style={{ fontSize:12, color:C.text3 }}>Assessments are always linked to a specific job application.</div>
        </div>
      )}

      {selectedLinkId && tab === "screening" && (
        <ScreeningTab recordId={record?.id} jobId={jobRecordId} />
      )}

      {selectedLinkId && tab === "scorecards" && (
        <ScorecardPanel
          record={record}
          environment={environment}
          session={session}
          jobRecordId={jobRecordId}
        />
      )}
    </div>
  );
}
