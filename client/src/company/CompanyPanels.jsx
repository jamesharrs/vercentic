// client/src/company/CompanyPanels.jsx
// Panels that plug into the Company record detail view, plus the bulk
// "build companies from employer data" screen used in Settings.
//
// The Company list, filters, saved lists, reports and exports all come from the
// generic records layer — nothing here duplicates that.

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import api from "../apiClient.js";

const F = "'Geist', -apple-system, sans-serif";
const C = {
  bg: "#f8f9fc", surface: "#ffffff", surface2: "#f5f7ff",
  border: "#e8eaed", border2: "#d1d5db",
  text1: "#111827", text2: "#4b5563", text3: "#9ca3af",
  accent: "var(--t-accent, #4361EE)",
  accentLight: "var(--t-accent-light, #EEF2FF)",
  purple: "#7950F2", amber: "#F79009", green: "#0CAF77", red: "#EF4444",
};

const PATHS = {
  x: "M18 6L6 18M6 6l12 12",
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  search: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  building: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01",
  sparkle: "M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6.1L4 10l6.1-1.2L12 3z",
  loader: "M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  refresh: "M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  merge: "M8 3v4a4 4 0 0 0 4 4h4M8 21V11M16 11l4-4M16 11l4 4",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  chart: "M3 3v18h18M7 16v-5M12 16V8M17 16v-9",
};

const Ic = ({ n, s = 14, c = "currentColor", style }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={PATHS[n] || PATHS.x} />
  </svg>
);

const Spin = ({ s = 14, c = C.text3 }) => (
  <Ic n="loader" s={s} c={c} style={{ animation: "vcSpin 1s linear infinite" }} />
);

// ── Small primitives ─────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = "ghost", disabled, icon, style = {}, title }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F,
    fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
    border: `1px solid ${C.border}`, background: "transparent", color: C.text2,
    transition: "all .12s", whiteSpace: "nowrap",
  };
  const v = variant === "primary"
    ? { background: C.accent, color: "#fff", border: "1px solid transparent" }
    : variant === "danger"
    ? { background: "transparent", color: C.red, border: `1px solid ${C.red}33` }
    : {};
  return (
    <button title={title} onClick={onClick} disabled={disabled} style={{ ...base, ...v, ...style }}>
      {icon && <Ic n={icon} s={12} c={variant === "primary" ? "#fff" : "currentColor"} />}
      {children}
    </button>
  );
};

const Pill = ({ children, color = C.text3, bg }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
    background: bg || `${color}14`, color, letterSpacing: ".02em",
    whiteSpace: "nowrap", border: `1px solid ${color}22`,
  }}>{children}</span>
);

const Empty = ({ icon = "users", title, hint, action }) => (
  <div style={{ padding: "28px 16px", textAlign: "center" }}>
    <div style={{
      width: 40, height: 40, borderRadius: 12, background: C.surface2,
      display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
    }}>
      <Ic n={icon} s={18} c={C.text3} />
    </div>
    <div style={{ fontSize: 13, fontWeight: 600, color: C.text2, marginBottom: 3 }}>{title}</div>
    {hint && <div style={{ fontSize: 11.5, color: C.text3, lineHeight: 1.5, maxWidth: 300, margin: "0 auto" }}>{hint}</div>}
    {action && <div style={{ marginTop: 12 }}>{action}</div>}
  </div>
);

const Avatar = ({ name, size = 28, color = C.accent }) => {
  const initials = String(name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3.2, flexShrink: 0,
      background: `${color}18`, color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.36, fontWeight: 800,
    }}>{initials}</div>
  );
};

const Bar = ({ label, value, max, color = C.accent, onClick }) => (
  <div onClick={onClick} style={{ marginBottom: 7, cursor: onClick ? "pointer" : "default" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
      <span style={{ fontSize: 11.5, color: C.text2, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 11.5, color: C.text1, fontWeight: 700 }}>{value}</span>
    </div>
    <div style={{ height: 5, borderRadius: 99, background: C.surface2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${max ? (value / max) * 100 : 0}%`, background: color, borderRadius: 99, transition: "width .3s" }} />
    </div>
  </div>
);

const openRecord = (recordId, objectId) =>
  window.dispatchEvent(new CustomEvent("vercentic:openRecord", { detail: { recordId, objectId } }));

// ═════════════════════════════════════════════════════════════════════════════
// EMPLOYEES
// ═════════════════════════════════════════════════════════════════════════════
export function CompanyEmployeesPanel({ record, environment, peopleObjectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [showProbable, setShowProbable] = useState(false);

  const load = useCallback(async () => {
    if (!record?.id || !environment?.id) return;
    setLoading(true);
    try { setData(await api.get(`/companies/${record.id}/employees?environment_id=${environment.id}`)); }
    catch { setData({ employees: [], probable: [], by_department: {} }); }
    setLoading(false);
  }, [record?.id, environment?.id]);

  useEffect(() => { load(); }, [load]);

  const list = data?.employees || [];
  const depts = useMemo(() => Object.entries(data?.by_department || {}).sort((a, b) => b[1] - a[1]), [data]);
  const filtered = list.filter(e =>
    (dept === "all" || (e.department || "Unassigned") === dept) &&
    (!search || `${e.name} ${e.title} ${e.location || ""}`.toLowerCase().includes(search.toLowerCase()))
  );

  const claim = async (personId) => {
    await api.post(`/companies/${record.id}/link-person`, { person_id: personId, environment_id: environment.id });
    load();
  };

  if (loading) return <div style={{ padding: 20, display: "flex", justifyContent: "center" }}><Spin s={18} /></div>;
  if (!list.length && !(data?.probable || []).length)
    return <Empty icon="users" title="No people matched to this company"
      hint="People are matched automatically when their employer resolves to this company. Add an alias if the employer is spelled differently in your data." />;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
          <Ic n="search" s={12} c={C.text3} style={{ position: "absolute", left: 9, top: 8 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people…"
            style={{ width: "100%", padding: "6px 10px 6px 26px", borderRadius: 8, border: `1px solid ${C.border}`,
              fontSize: 12, fontFamily: F, outline: "none", boxSizing: "border-box", color: C.text1 }} />
        </div>
        <Pill color={C.accent}>{filtered.length} of {list.length}</Pill>
      </div>

      {depts.length > 1 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
          <button onClick={() => setDept("all")} style={chip(dept === "all")}>All</button>
          {depts.map(([d, n]) => (
            <button key={d} onClick={() => setDept(d)} style={chip(dept === d)}>{d} <span style={{ opacity: .6 }}>{n}</span></button>
          ))}
        </div>
      )}

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {filtered.map((e, i) => (
          <div key={e.id} onClick={() => peopleObjectId && openRecord(e.id, peopleObjectId)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
              borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
              cursor: peopleObjectId ? "pointer" : "default", background: C.surface }}>
            <Avatar name={e.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
              <div style={{ fontSize: 11, color: C.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.title || "No title"}{e.location ? ` · ${e.location}` : ""}
              </div>
            </div>
            {e.link === "matched" && <Pill color={C.text3} title={`Matched from "${e.raw_employer}"`}>matched</Pill>}
            {e.department && <Pill color={C.purple}>{e.department}</Pill>}
          </div>
        ))}
        {!filtered.length && <div style={{ padding: 16, fontSize: 12, color: C.text3, textAlign: "center" }}>Nothing matches that filter.</div>}
      </div>

      {(data?.probable || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowProbable(s => !s)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
              cursor: "pointer", padding: 0, fontFamily: F, fontSize: 11.5, fontWeight: 600, color: C.amber }}>
            <Ic n="alert" s={12} c={C.amber} />
            {data.probable.length} possible match{data.probable.length === 1 ? "" : "es"} needing review
          </button>
          {showProbable && (
            <div style={{ marginTop: 8, border: `1px solid ${C.amber}33`, borderRadius: 12, overflow: "hidden", background: "#FFFBEB" }}>
              {data.probable.map((e, i) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  borderBottom: i < data.probable.length - 1 ? `1px solid ${C.amber}22` : "none" }}>
                  <Avatar name={e.name} color={C.amber} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text1 }}>{e.name}</div>
                    <div style={{ fontSize: 10.5, color: C.text3 }}>
                      Employer reads “{e.raw_employer}” · {Math.round((e.confidence || 0) * 100)}% similar
                    </div>
                  </div>
                  <Btn variant="primary" icon="check" onClick={() => claim(e.id)}>Confirm</Btn>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const chip = (active) => ({
  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99, cursor: "pointer",
  fontFamily: F, border: `1px solid ${active ? "transparent" : C.border}`,
  background: active ? C.accent : "transparent", color: active ? "#fff" : C.text2,
});

// ═════════════════════════════════════════════════════════════════════════════
// ALUMNI
// ═════════════════════════════════════════════════════════════════════════════
export function CompanyAlumniPanel({ record, environment, peopleObjectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!record?.id || !environment?.id) return;
    setLoading(true);
    api.get(`/companies/${record.id}/alumni?environment_id=${environment.id}`)
      .then(setData).catch(() => setData({ alumni: [] })).finally(() => setLoading(false));
  }, [record?.id, environment?.id]);

  if (loading) return <div style={{ padding: 20, display: "flex", justifyContent: "center" }}><Spin s={18} /></div>;
  const list = data?.alumni || [];
  if (!list.length) return <Empty icon="users" title="No alumni recorded"
    hint="When someone's company changes, their previous employer is kept here. Alumni are often the easiest people to approach and the most candid about how a business runs." />;

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {list.map((e, i) => (
        <div key={e.id} onClick={() => peopleObjectId && openRecord(e.id, peopleObjectId)}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
            borderBottom: i < list.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer" }}>
          <Avatar name={e.name} color={C.green} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text1 }}>{e.name}</div>
            <div style={{ fontSize: 11, color: C.text3 }}>{e.title || "No title"}</div>
          </div>
          {e.now_at && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.text2 }}>
              <Ic n="arrowRight" s={11} c={C.text3} />
              <span style={{ fontWeight: 600 }}>{e.now_at}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE
// ═════════════════════════════════════════════════════════════════════════════
export function CompanyIntelPanel({ record, environment }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!record?.id || !environment?.id) return;
    setLoading(true);
    api.get(`/companies/${record.id}/intel?environment_id=${environment.id}`)
      .then(setD).catch(() => setD(null)).finally(() => setLoading(false));
  }, [record?.id, environment?.id]);

  if (loading) return <div style={{ padding: 20, display: "flex", justifyContent: "center" }}><Spin s={18} /></div>;
  if (!d || d.error) return <Empty icon="chart" title="Intelligence unavailable" hint={d?.error || "You may not have permission to view market intelligence."} />;

  const maxOf = (arr) => Math.max(1, ...arr.map(x => x.count));
  const box = { border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: C.surface };
  const h = { fontSize: 10.5, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 9 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Coverage */}
      <div style={box}>
        <div style={h}>Mapping coverage</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: C.text1, letterSpacing: "-.5px" }}>{d.mapped_headcount}</span>
          <span style={{ fontSize: 12, color: C.text3 }}>
            people mapped{d.stated_headcount ? ` of ~${d.stated_headcount.toLocaleString()}` : ""}
          </span>
          {d.coverage_pct != null && <Pill color={d.coverage_pct >= 50 ? C.green : C.amber}>{d.coverage_pct}%</Pill>}
        </div>
        {d.coverage_pct != null && (
          <div style={{ height: 6, borderRadius: 99, background: C.surface2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${d.coverage_pct}%`, background: d.coverage_pct >= 50 ? C.green : C.amber, borderRadius: 99 }} />
          </div>
        )}
        <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: C.text3 }}>
          <span><strong style={{ color: C.text1 }}>{d.alumni_count}</strong> alumni</span>
          {d.probable_count > 0 && <span><strong style={{ color: C.amber }}>{d.probable_count}</strong> unconfirmed</span>}
        </div>
      </div>

      {/* Seniority */}
      {d.seniority?.length > 0 && (
        <div style={box}>
          <div style={h}>Seniority spread</div>
          {d.seniority.map(s => <Bar key={s.band} label={s.band} value={s.count} max={maxOf(d.seniority)} color={C.purple} />)}
        </div>
      )}

      {/* Flow */}
      {(d.inflow?.length > 0 || d.outflow?.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {d.inflow?.length > 0 && (
            <div style={box}>
              <div style={{ ...h, display: "flex", alignItems: "center", gap: 5 }}>
                <Ic n="arrowDown" s={11} c={C.green} /> Joining from
              </div>
              {d.inflow.slice(0, 6).map(x => <Bar key={x.name} label={x.name} value={x.count} max={maxOf(d.inflow)} color={C.green} />)}
            </div>
          )}
          {d.outflow?.length > 0 && (
            <div style={box}>
              <div style={{ ...h, display: "flex", alignItems: "center", gap: 5 }}>
                <Ic n="arrowUp" s={11} c={C.amber} /> Leaving for
              </div>
              {d.outflow.slice(0, 6).map(x => <Bar key={x.name} label={x.name} value={x.count} max={maxOf(d.outflow)} color={C.amber} />)}
            </div>
          )}
        </div>
      )}

      {/* Similar */}
      {d.similar_companies?.length > 0 && (
        <div style={box}>
          <div style={h}>Comparable organisations</div>
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 9, lineHeight: 1.5 }}>
            Derived from people who have worked at both — not a guess.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {d.similar_companies.map(s => (
              <span key={s.company_id} style={{ display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
                background: C.accentLight, color: C.accent }}>
                {s.name} <span style={{ opacity: .65, fontWeight: 500 }}>{s.shared_people}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Comp */}
      <div style={box}>
        <div style={h}>Compensation</div>
        {d.compensation?.suppressed ? (
          <div style={{ fontSize: 11.5, color: C.text3, lineHeight: 1.5 }}>
            Held back — {d.compensation.n} salar{d.compensation.n === 1 ? "y" : "ies"} on file, {d.compensation.min_required} needed
            before a band can be shown without identifying individuals.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 18 }}>
            {[["25th", d.compensation.p25], ["Median", d.compensation.median], ["75th", d.compensation.p75]].map(([lbl, v]) => (
              <div key={lbl}>
                <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 2 }}>{lbl}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text1 }}>
                  {v != null ? Number(v).toLocaleString() : "—"}
                </div>
              </div>
            ))}
            <div style={{ marginLeft: "auto", alignSelf: "flex-end", fontSize: 10.5, color: C.text3 }}>
              n={d.compensation.n}{d.compensation.currency ? ` · ${d.compensation.currency}` : ""}
            </div>
          </div>
        )}
      </div>

      {d.notice_periods?.length > 0 && (
        <div style={box}>
          <div style={h}>Notice periods</div>
          {d.notice_periods.slice(0, 5).map(x => <Bar key={x.label} label={x.label} value={x.count} max={maxOf(d.notice_periods)} />)}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RESEARCH
// ═════════════════════════════════════════════════════════════════════════════
const RESEARCH_FIELDS = [
  ["summary", "Summary"], ["industry", "Industry"], ["headquarters", "Headquarters"],
  ["locations", "Locations"], ["headcount", "Headcount"], ["headcount_band", "Headcount band"],
  ["founded_year", "Founded"], ["ownership_type", "Ownership"], ["revenue", "Revenue"],
  ["website", "Website"], ["linkedin_url", "LinkedIn"], ["careers_url", "Careers page"],
  ["talent_notes", "Talent notes"], ["aliases", "Also known as"],
];

export function CompanyResearchPanel({ record, environment, onUpdate }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [runId, setRunId] = useState(null);
  const [picked, setPicked] = useState({});
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);

  const run = async () => {
    setRunning(true); setError(null); setResult(null);
    try {
      const r = await api.post(`/companies/${record.id}/research`, { environment_id: environment.id });
      if (r.error) { setError(r.error); }
      else {
        setResult(r.result); setRunId(r.run_id);
        // Pre-tick anything the record doesn't already have
        const pre = {};
        for (const [k] of RESEARCH_FIELDS) {
          const v = r.result[k];
          if (v === undefined || v === null || v === "") continue;
          const cur = k === "aliases" ? null : record.data?.[k];
          pre[k] = cur === undefined || cur === null || cur === "";
        }
        setPicked(pre);
      }
    } catch (e) { setError(e.message || "Research failed"); }
    setRunning(false);
  };

  const apply = async () => {
    setApplying(true);
    const fields = Object.entries(picked).filter(([, v]) => v).map(([k]) => k);
    const r = await api.post(`/companies/${record.id}/research/${runId}/apply`, { fields });
    if (r.company && onUpdate) onUpdate(r.company);
    setResult(null); setRunId(null); setApplying(false);
  };

  const val = (k) => {
    const v = result?.[k];
    if (v == null) return null;
    return Array.isArray(v) ? v.join(", ") : String(v);
  };

  return (
    <div>
      {!result && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: `${C.purple}14`,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <Ic n="sparkle" s={17} c={C.purple} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text2, marginBottom: 4 }}>Research this organisation</div>
          <div style={{ fontSize: 11.5, color: C.text3, lineHeight: 1.55, maxWidth: 320, margin: "0 auto 12px" }}>
            Searches public sources for headcount, locations, ownership and recruitment-relevant
            signals. Nothing is written to the record until you review and accept it.
          </div>
          <Btn variant="primary" icon={running ? undefined : "sparkle"} onClick={run} disabled={running}>
            {running ? <><Spin s={12} c="#fff" /> Researching…</> : "Run research"}
          </Btn>
          {record.data?.last_researched_at && (
            <div style={{ fontSize: 10.5, color: C.text3, marginTop: 10 }}>
              Last run {record.data.last_researched_at}
            </div>
          )}
          {error && (
            <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#FEF2F2",
              border: "1px solid #FECACA", fontSize: 11.5, color: "#B91C1C", textAlign: "left" }}>{error}</div>
          )}
        </div>
      )}

      {result && (
        <div style={{ border: `1px solid ${C.purple}33`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "9px 14px", background: `${C.purple}0F`, display: "flex", alignItems: "center", gap: 8 }}>
            <Ic n="sparkle" s={13} c={C.purple} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.purple }}>Review before applying</span>
            {result.confidence && <Pill color={result.confidence === "high" ? C.green : result.confidence === "low" ? C.red : C.amber}>{result.confidence} confidence</Pill>}
          </div>

          <div>
            {RESEARCH_FIELDS.map(([k, label]) => {
              const v = val(k);
              if (!v) return null;
              const existing = k === "aliases" ? null : record.data?.[k];
              return (
                <label key={k} style={{ display: "flex", gap: 10, padding: "9px 14px",
                  borderTop: `1px solid ${C.border}`, cursor: "pointer", alignItems: "flex-start" }}>
                  <input type="checkbox" checked={!!picked[k]} onChange={e => setPicked(p => ({ ...p, [k]: e.target.checked }))}
                    style={{ marginTop: 2, accentColor: C.purple, cursor: "pointer" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
                      {existing ? <Pill color={C.amber}>will overwrite</Pill> : null}
                    </div>
                    <div style={{ fontSize: 12, color: C.text1, lineHeight: 1.5, wordBreak: "break-word" }}>{v}</div>
                    {existing && (
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 3, textDecoration: "line-through" }}>
                        {String(existing).slice(0, 140)}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {Array.isArray(result.sources) && result.sources.length > 0 && (
            <div style={{ padding: "9px 14px", borderTop: `1px solid ${C.border}`, background: C.surface2 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", marginBottom: 5 }}>Sources</div>
              {result.sources.slice(0, 5).map((s, i) => (
                <a key={i} href={s} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.accent,
                    textDecoration: "none", marginBottom: 2, wordBreak: "break-all" }}>
                  <Ic n="external" s={10} c={C.accent} />{s}
                </a>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: `1px solid ${C.border}` }}>
            <Btn onClick={() => { setResult(null); setRunId(null); }} style={{ flex: 1, justifyContent: "center" }}>Discard</Btn>
            <Btn variant="primary" onClick={apply} disabled={applying || !Object.values(picked).some(Boolean)}
              style={{ flex: 2, justifyContent: "center" }} icon={applying ? undefined : "check"}>
              {applying ? <><Spin s={12} c="#fff" /> Applying…</> : `Apply ${Object.values(picked).filter(Boolean).length} field${Object.values(picked).filter(Boolean).length === 1 ? "" : "s"}`}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUGGESTED REPORTING LINES
// ═════════════════════════════════════════════════════════════════════════════
export function CompanyOrgPanel({ record, environment }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inferring, setInferring] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!record?.id || !environment?.id) return;
    setLoading(true);
    try {
      const r = await api.get(`/companies/${record.id}/suggested-relationships?environment_id=${environment.id}`);
      setSuggestions(Array.isArray(r) ? r : []);
    } catch { setSuggestions([]); }
    setLoading(false);
  }, [record?.id, environment?.id]);

  useEffect(() => { load(); }, [load]);

  const infer = async () => {
    setInferring(true); setError(null);
    const r = await api.post(`/companies/${record.id}/infer-org`, { environment_id: environment.id });
    if (r.error) setError(r.error);
    setInferring(false);
    load();
  };

  const act = async (action, ids) => {
    await api.post(`/companies/relationships/confirm`, { relationship_ids: ids, action });
    setSelected(new Set());
    load();
  };

  const toggle = (id) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = suggestions.length > 0 && selected.size === suggestions.length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <Btn icon={inferring ? undefined : "sparkle"} onClick={infer} disabled={inferring}
          style={{ borderColor: `${C.purple}44`, color: C.purple }}>
          {inferring ? <><Spin s={12} c={C.purple} /> Building structure…</> : "Suggest reporting lines"}
        </Btn>
        <div style={{ marginLeft: "auto" }}>
          <Btn icon="external" onClick={() => window.dispatchEvent(new CustomEvent("vercentic:navigate", { detail: { slug: "orgchart" } }))}>
            Open org chart
          </Btn>
        </div>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA",
          fontSize: 11.5, color: "#B91C1C", marginBottom: 10 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ padding: 20, display: "flex", justifyContent: "center" }}><Spin s={18} /></div>
      ) : !suggestions.length ? (
        <Empty icon="sparkle" title="No suggested reporting lines"
          hint="Suggested lines are generated from job titles and departments of the people mapped to this company. Confirmed lines appear on the org chart with a solid connector." />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
            background: `${C.purple}0C`, borderRadius: 9, marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", flex: 1 }}>
              <input type="checkbox" checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(suggestions.map(s => s.id)))}
                style={{ accentColor: C.purple, cursor: "pointer" }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.purple }}>
                {selected.size > 0 ? `${selected.size} selected` : `${suggestions.length} suggested — review before they count as fact`}
              </span>
            </label>
            {selected.size > 0 && (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="danger" onClick={() => act("reject", [...selected])}>Reject</Btn>
                <Btn variant="primary" icon="check" onClick={() => act("confirm", [...selected])}>Confirm</Btn>
              </div>
            )}
          </div>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {suggestions.map((s, i) => {
              const conf = Math.round((s.confidence || 0) * 100);
              const col = conf >= 85 ? C.green : conf >= 65 ? C.amber : C.red;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : "none",
                  background: selected.has(s.id) ? `${C.purple}08` : C.surface }}>
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)}
                    style={{ accentColor: C.purple, cursor: "pointer", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text1 }}>{s.from_name}</span>
                      <Ic n="arrowRight" s={11} c={C.text3} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text1 }}>{s.to_name}</span>
                      <span title="Suggested, not confirmed" style={{ display: "inline-flex", alignItems: "center" }}>
                        <Ic n="sparkle" s={11} c={C.purple} />
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: C.text3, marginTop: 2 }}>
                      {s.from_title} reports to {s.to_title}
                    </div>
                    {s.notes && <div style={{ fontSize: 10.5, color: C.text3, marginTop: 2, fontStyle: "italic" }}>{s.notes}</div>}
                  </div>
                  <Pill color={col}>{conf}%</Pill>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ALIASES
// ═════════════════════════════════════════════════════════════════════════════
export function CompanyAliasesPanel({ record, environment }) {
  const [aliases, setAliases] = useState([]);
  const [adding, setAdding] = useState("");
  const [kind, setKind] = useState("variant");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(() => {
    if (!record?.id) return;
    api.get(`/companies/${record.id}/aliases`).then(r => setAliases(Array.isArray(r) ? r : [])).catch(() => setAliases([]));
  }, [record?.id]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!adding.trim()) return;
    setBusy(true); setErr(null);
    const r = await api.post(`/companies/${record.id}/aliases`, { alias: adding.trim(), kind, environment_id: environment?.id });
    if (r.error) setErr(r.error); else { setAdding(""); load(); }
    setBusy(false);
  };

  const KINDS = [["variant", "Variant"], ["former_name", "Former name"], ["abbreviation", "Abbreviation"], ["legal_name", "Legal name"], ["local_name", "Local name"]];

  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.text3, lineHeight: 1.55, marginBottom: 10 }}>
        Aliases are how a person's typed employer resolves to this record. Add every spelling,
        abbreviation, legal name and former name you see in your data.
      </div>

      {aliases.length > 0 && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
          {aliases.map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
              borderBottom: i < aliases.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ flex: 1, fontSize: 12.5, color: C.text1, fontWeight: 500 }}>{a.alias}</div>
              <Pill color={C.text3}>{(KINDS.find(k => k[0] === a.kind) || [undefined, a.kind])[1]}</Pill>
              {a.source === "ai" && <span title="Added from research"><Ic n="sparkle" s={11} c={C.purple} /></span>}
              <button onClick={async () => { await api.del(`/companies/aliases/${a.id}`); load(); }}
                title="Remove alias"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 3, display: "flex", color: C.text3 }}>
                <Ic n="trash" s={12} c={C.text3} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input value={adding} onChange={e => setAdding(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="e.g. ENBD, Emirates N.B.D., Emirates Bank"
          style={{ flex: 1, minWidth: 160, padding: "7px 11px", borderRadius: 8, border: `1px solid ${C.border}`,
            fontSize: 12, fontFamily: F, outline: "none", color: C.text1, boxSizing: "border-box" }} />
        <select value={kind} onChange={e => setKind(e.target.value)}
          style={{ padding: "7px 9px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12,
            fontFamily: F, outline: "none", color: C.text2, background: C.surface, cursor: "pointer" }}>
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Btn variant="primary" icon="plus" onClick={add} disabled={busy || !adding.trim()}>Add</Btn>
      </div>
      {err && <div style={{ marginTop: 8, fontSize: 11.5, color: C.red }}>{err}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BULK BUILD — Settings › Companies
// ═════════════════════════════════════════════════════════════════════════════
export function CompanyBuilder({ environment }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minCount, setMinCount] = useState(2);
  const [creating, setCreating] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [recon, setRecon] = useState(null);
  const [reconBusy, setReconBusy] = useState(false);

  const load = useCallback(async () => {
    if (!environment?.id) return;
    setLoading(true);
    try {
      const r = await api.get(`/companies/suggestions?environment_id=${environment.id}&min_count=${minCount}&limit=60`);
      setSuggestions(r.suggestions || []);
    } catch { setSuggestions([]); }
    setLoading(false);
  }, [environment?.id, minCount]);

  useEffect(() => { load(); }, [load]);

  const create = async (s) => {
    setCreating(s.canonical);
    await api.post("/companies/from-suggestion", {
      environment_id: environment.id,
      canonical: s.canonical,
      variants: s.variants,
      link_people: true,
    });
    setCreating(null);
    load();
  };

  const reconcile = async (dry) => {
    setReconBusy(true);
    const r = await api.post("/companies/reconcile", { environment_id: environment.id, dry_run: dry });
    setRecon(r); setReconBusy(false);
    if (!dry) load();
  };

  const card = { border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, marginBottom: 8 };

  return (
    <div style={{ maxWidth: 780 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: C.text1,
        fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-.4px" }}>Build company records</h2>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: C.text3, lineHeight: 1.55 }}>
        Employer names already in your people data, grouped by spelling. Creating a company also
        registers every variant as an alias and links the matching people.
      </p>

      {/* Reconcile */}
      <div style={{ ...card, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 2 }}>Re-match everyone</div>
            <div style={{ fontSize: 11.5, color: C.text3, lineHeight: 1.5 }}>
              Sweeps every unlinked person and attaches them where the match is unambiguous.
            </div>
          </div>
          <Btn onClick={() => reconcile(true)} disabled={reconBusy}>Preview</Btn>
          <Btn variant="primary" icon="refresh" onClick={() => reconcile(false)} disabled={reconBusy}>Run</Btn>
        </div>
        {recon && (
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: C.surface2, fontSize: 12 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: recon.samples?.length ? 8 : 0 }}>
              <span><strong style={{ color: C.green }}>{recon.linked}</strong> {recon.dry_run ? "would link" : "linked"}</span>
              <span><strong style={{ color: C.amber }}>{recon.ambiguous}</strong> ambiguous</span>
              <span><strong style={{ color: C.text3 }}>{recon.unmatched}</strong> no match</span>
            </div>
            {recon.samples?.slice(0, 6).map((s, i) => (
              <div key={i} style={{ fontSize: 11, color: C.text3, padding: "2px 0" }}>
                {s.person} — “{s.raw}” <Ic n="arrowRight" s={9} c={C.text3} style={{ verticalAlign: "middle" }} /> <strong style={{ color: C.text2 }}>{s.matched}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, color: C.text3, fontWeight: 600 }}>Minimum people</span>
        {[1, 2, 5, 10].map(n => (
          <button key={n} onClick={() => setMinCount(n)} style={chip(minCount === n)}>{n}+</button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 11.5, color: C.text3 }}>{suggestions.length} groups</div>
      </div>

      {loading ? (
        <div style={{ padding: 30, display: "flex", justifyContent: "center" }}><Spin s={20} /></div>
      ) : !suggestions.length ? (
        <Empty icon="building" title="Nothing left to create"
          hint="Every employer in your data either has a company record or appears fewer times than the threshold." />
      ) : suggestions.map(s => {
        const existing = s.existing_match;
        const open = expanded === s.canonical;
        return (
          <div key={s.canonical} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
              <Avatar name={s.canonical} size={32} color={C.purple} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text1 }}>{s.canonical}</div>
                <button onClick={() => setExpanded(open ? null : s.canonical)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
                    fontFamily: F, fontSize: 11, color: C.text3, textAlign: "left" }}>
                  {s.total_people} {s.total_people === 1 ? "person" : "people"}
                  {s.variants.length > 1 && ` · ${s.variants.length} spellings`}
                </button>
              </div>
              {existing ? (
                <Pill color={C.amber}>possible duplicate</Pill>
              ) : (
                <Btn variant="primary" icon={creating === s.canonical ? undefined : "plus"}
                  onClick={() => create(s)} disabled={creating === s.canonical}>
                  {creating === s.canonical ? <><Spin s={12} c="#fff" /> Creating…</> : "Create"}
                </Btn>
              )}
            </div>

            {existing && (
              <div style={{ padding: "9px 14px", borderTop: `1px solid ${C.border}`, background: "#FFFBEB" }}>
                <div style={{ fontSize: 11.5, color: C.text2, marginBottom: 6 }}>
                  Looks like it may already exist:
                </div>
                {existing.candidates.slice(0, 3).map(c => (
                  <div key={c.company_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{c.name}</span>
                    <Pill color={C.text3}>{Math.round(c.score * 100)}% · {c.reason}</Pill>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <Btn onClick={() => create(s)}>Create separately anyway</Btn>
                  <Btn variant="primary" icon="link" onClick={async () => {
                    await api.post(`/companies/${existing.candidates[0].company_id}/aliases`, {
                      alias: s.canonical, kind: "variant", environment_id: environment.id });
                    await api.post("/companies/reconcile", { environment_id: environment.id });
                    load();
                  }}>Add as alias</Btn>
                </div>
              </div>
            )}

            {open && (
              <div style={{ padding: "9px 14px", borderTop: `1px solid ${C.border}`, background: C.surface2 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase",
                  letterSpacing: ".05em", marginBottom: 6 }}>Spellings found</div>
                {s.variants.map(v => (
                  <div key={v.raw} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 11.5 }}>
                    <span style={{ color: C.text2 }}>{v.raw}</span>
                    <span style={{ color: C.text3, fontWeight: 600 }}>{v.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <style>{`@keyframes vcSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default {
  CompanyEmployeesPanel, CompanyAlumniPanel, CompanyIntelPanel,
  CompanyResearchPanel, CompanyOrgPanel, CompanyAliasesPanel, CompanyBuilder,
};
