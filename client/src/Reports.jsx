import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const B = {
  purple:     "#7F77DD",
  purpleLight:"#AFA9EC",
  rose:       "#D4537E",
  teal:       "#1D9E75",
  amber:      "#EF9F27",
  gray:       "#888780",
  border:     "rgba(0,0,0,0.06)",
  bg:         "#F8F7FF",
  card:       "white",
};
const PALETTE = [B.purple, B.rose, B.teal, B.amber, B.purpleLight, "#E87FAA", "#5DCAA5"];

const api = {
  get:    (p)    => fetch(p).then(r => r.json()).catch(() => null),
  post:   (p, b) => fetch(p, { method: "POST",   headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()).catch(() => null),
  put:    (p, b) => fetch(p, { method: "PUT",    headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json()).catch(() => null),
  delete: (p)    => fetch(p, { method: "DELETE" }).then(r => r.json()).catch(() => null),
};

const OPS = {
  text:         ["contains","is","is not","is empty","is not empty"],
  number:       ["=","≠",">","<","≥","≤","is empty"],
  select:       ["is","is not","is empty"],
  multi_select: ["includes","does not include","is empty"],
  date:         ["is","before","after","is empty"],
  boolean:      ["is true","is false"],
  rating:       ["=",">","<"],
  currency:     ["=",">","<","≥","≤"],
};

function evalFormula(expr, row) {
  try {
    const e = expr.toUpperCase();
    const numVal = (k) => { const v = row[k]; return typeof v === "number" ? v : parseFloat(v) || 0; };
    const fieldMatch = expr.match(/\{([^}]+)\}/g);
    if (/^COUNT\(\)$/i.test(e))       return 1;
    if (/^SUM\(([^)]+)\)$/i.test(e))  { const m = e.match(/SUM\(([^)]+)\)/);  return numVal(m[1].toLowerCase()); }
    if (/^AVG\(([^)]+)\)$/i.test(e))  { const m = e.match(/AVG\(([^)]+)\)/);  return numVal(m[1].toLowerCase()); }
    if (/^UPPER\(([^)]+)\)$/i.test(e)){ const m = expr.match(/UPPER\(([^)]+)\)/i); return String(row[m[1]] || "").toUpperCase(); }
    if (/^LOWER\(([^)]+)\)$/i.test(e)){ const m = expr.match(/LOWER\(([^)]+)\)/i); return String(row[m[1]] || "").toLowerCase(); }
    if (/^LEN\(([^)]+)\)$/i.test(e))  { const m = expr.match(/LEN\(([^)]+)\)/i);   return String(row[m[1]] || "").length; }
    if (/^ROUND\(([^,)]+),([^)]+)\)$/i.test(e)) { const m = expr.match(/ROUND\(([^,)]+),([^)]+)\)/i); return parseFloat(numVal(m[1].trim()).toFixed(parseInt(m[2].trim()))); }
    if (/^DIFF\(([^,)]+),([^)]+)\)$/i.test(e))  { const m = e.match(/DIFF\(([^,)]+),([^)]+)\)/);      return numVal(m[1].trim()) - numVal(m[2].trim()); }
    if (/^CONCAT\(([^)]+)\)$/i.test(e)) {
      const m = expr.match(/CONCAT\(([^)]+)\)/i);
      return m[1].split(",").map(p => { const t = p.trim(); return (t.startsWith("{") && t.endsWith("}")) ? (row[t.slice(1,-1)] || "") : t.replace(/^['"]|['"]$/g,""); }).join("");
    }
    if (/^IF\(/i.test(e)) {
      const m = expr.match(/IF\(([^,]+),([^,]+),([^)]+)\)/i);
      if (m) { const [lhs,op,rhs]=m[1].trim().split(/(=|!=|>|<)/); const lv=row[lhs.trim().replace(/[{}]/g,"")]||0; const rv=(rhs?.trim().replace(/['"]/g,""))||""; const pass=op==="="?String(lv)===rv:op==="!="?String(lv)!==rv:op===">"?lv>rv:lv<rv; return pass?m[2].trim().replace(/['"]/g,""):m[3].trim().replace(/['"]/g,""); }
    }
    if (fieldMatch) { let result=expr; fieldMatch.forEach(f=>{const k=f.slice(1,-1);result=result.replace(f,row[k]||"");}); return result; }
    return "";
  } catch { return ""; }
}

const DarkTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0F0F19", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#fff" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || "#ccc", marginTop: 2 }}>{p.name}: <strong>{p.value}</strong></div>)}
    </div>
  );
};

function Panel({ title, sub, children, action }) {
  return (
    <div style={{ background: B.card, border: `0.5px solid ${B.border}`, borderRadius: 14, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: sub ? 2 : 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: B.gray, marginTop: 2, marginBottom: 12 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, cursor: "pointer", border: `0.5px solid ${active ? B.purple : B.border}`, background: active ? B.purple : "transparent", color: active ? "#fff" : B.gray, fontFamily: "inherit", fontWeight: active ? 700 : 400, transition: "all 0.15s" }}>
      {label}
    </button>
  );
}

export default function Reports({ environment, initialReport }) {
  const [objects, setObjects] = useState([]);
  const [fields, setFields] = useState([]);
  const [selObject, setSelObject] = useState("");
  const [selCols, setSelCols] = useState([]);
  const [filters, setFilters] = useState([]);
  const [groupBy, setGroupBy] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [formulas, setFormulas] = useState([]);
  const [chartType, setChartType] = useState("bar");
  const [chartX, setChartX] = useState("");
  const [chartY, setChartY] = useState("");
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [panel, setPanel] = useState("build");
  const [savedLists, setSavedLists] = useState([]);
  const [listName, setListName] = useState("");
  const [listShared, setListShared] = useState(false);
  const [savingList, setSavingList] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const skipReset = useRef(false);

  useEffect(() => {
    if (!environment?.id) return;
    api.get(`/api/objects?environment_id=${environment.id}`).then(d => setObjects(Array.isArray(d) ? d : []));
    api.get(`/api/saved-views?environment_id=${environment.id}`).then(d => setSavedLists(Array.isArray(d) ? d : []));
  }, [environment?.id]);

  useEffect(() => {
    if (!selObject) return;
    api.get(`/api/fields?object_id=${selObject}`).then(d => {
      const f = Array.isArray(d) ? d : [];
      setFields(f);
      if (!skipReset.current) { setSelCols(f.filter(x => x.show_in_list).map(x => x.id)); setGroupBy(""); setSortBy(""); setFilters([]); setFormulas([]); setChartX(""); setChartY(""); setResults(null); }
      skipReset.current = false;
    });
  }, [selObject]);

  useEffect(() => {
    if (!initialReport || !objects.length) return;
    const needle = (initialReport.objectSlug || initialReport.object || "").toLowerCase();
    // match by slug, plural name, or common aliases (candidates → people)
    const ALIASES = { candidates: "people", candidate: "people", vacancies: "jobs", vacancy: "jobs" };
    const resolvedNeedle = ALIASES[needle] || needle;
    const obj = objects.find(o =>
      o.slug === resolvedNeedle ||
      (o.plural_name || o.name || "").toLowerCase().includes(resolvedNeedle) ||
      (o.plural_name || o.name || "").toLowerCase() === resolvedNeedle
    );
    if (obj) {
      skipReset.current = true;
      setSelObject(obj.id);
      if (initialReport.groupBy)   setGroupBy(initialReport.groupBy);
      if (initialReport.chartType) setChartType(initialReport.chartType);
      if (initialReport.formulas)  setFormulas(initialReport.formulas);
      setPanel("build");
      setTimeout(() => runReport(obj.id, initialReport.groupBy), 500);
    }
  }, [initialReport, objects]);

  const runReport = useCallback(async (objectId, grpBy) => {
    const oid = objectId || selObject;
    if (!oid || !environment?.id) return;
    setRunning(true);
    try {
      const res = await api.get(`/api/records?object_id=${oid}&environment_id=${environment.id}&limit=500`);
      const raw = Array.isArray(res?.records) ? res.records : [];
      let rows = raw.map(r => ({ _id: r.id, _createdAt: r.created_at, ...r.data }));
      const activeFilters = filters.filter(f => f.field && f.op);
      if (activeFilters.length) {
        rows = rows.filter(row => activeFilters.every(f => {
          const v = String(row[f.field] || "").toLowerCase(); const fv = String(f.value || "").toLowerCase();
          switch (f.op) {
            case "contains": return v.includes(fv); case "is": return v === fv; case "is not": return v !== fv;
            case "is empty": return !row[f.field]; case "is not empty": return !!row[f.field];
            case ">": return parseFloat(row[f.field]) > parseFloat(f.value); case "<": return parseFloat(row[f.field]) < parseFloat(f.value);
            case "≥": return parseFloat(row[f.field]) >= parseFloat(f.value); case "≤": return parseFloat(row[f.field]) <= parseFloat(f.value);
            case "=": return parseFloat(row[f.field]) === parseFloat(f.value);
            case "includes": return (Array.isArray(row[f.field]) ? row[f.field] : [row[f.field]]).some(x => String(x).toLowerCase() === fv);
            default: return true;
          }
        }));
      }

      const gb = grpBy || groupBy;
      let grouped = rows;
      if (gb) {
        const groups = {};
        rows.forEach(r => { const key = String(r[gb] || "Unknown"); if (!groups[key]) groups[key] = []; groups[key].push(r); });
        grouped = Object.entries(groups).map(([key, members]) => ({ _group: key, _count: members.length, ...members.reduce((acc, m) => { Object.keys(m).forEach(k => { if (typeof m[k] === "number") acc[k] = (acc[k] || 0) + m[k]; }); return acc; }, {}) }));
      }
      if (formulas.length) grouped = grouped.map(row => { const extra = {}; formulas.forEach(f => { if (f.name && f.expression) extra[f.name] = evalFormula(f.expression, row); }); return { ...row, ...extra }; });
      if (sortBy) grouped.sort((a, b) => { const av = a[sortBy], bv = b[sortBy]; if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av; return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av)); });
      setResults(grouped);
      if (!chartX && gb) setChartX("_group");
      if (!chartY && gb) setChartY("_count");
    } catch (e) { console.error(e); } finally { setRunning(false); }
  }, [selObject, environment?.id, filters, groupBy, sortBy, sortDir, formulas, chartX, chartY]);

  const saveList = async () => {
    if (!listName || !selObject) return;
    setSavingList(true);
    const cfg = { name: listName, object_id: selObject, environment_id: environment?.id, is_shared: listShared, filters, group_by: groupBy, sort_by: sortBy, sort_dir: sortDir, formulas, chart_type: chartType, chart_x: chartX, chart_y: chartY, columns: selCols };
    const d = await api.post("/api/saved-views", cfg);
    if (d?.id) { setSavedLists(p => [...p, d]); setListName(""); setShowSaveForm(false); }
    setSavingList(false);
  };

  const loadList = (sv) => {
    skipReset.current = true;
    setSelObject(sv.object_id || selObject);
    if (sv.filters)    setFilters(sv.filters);    if (sv.group_by)   setGroupBy(sv.group_by);
    if (sv.sort_by)    setSortBy(sv.sort_by);     if (sv.sort_dir)   setSortDir(sv.sort_dir);
    if (sv.formulas)   setFormulas(sv.formulas);  if (sv.chart_type) setChartType(sv.chart_type);
    if (sv.chart_x)    setChartX(sv.chart_x);     if (sv.chart_y)    setChartY(sv.chart_y);
    if (sv.columns)    setSelCols(sv.columns);
  };

  const deleteList = async (id) => { await api.delete(`/api/saved-views/${id}`); setSavedLists(p => p.filter(s => s.id !== id)); };
  const addFilter  = () => setFilters(p => [...p, { id: Date.now(), field: fields[0]?.api_key || "", op: "contains", value: "" }]);
  const addFormula = () => setFormulas(p => [...p, { id: Date.now(), name: "", expression: "" }]);
  const resultCols  = results?.length ? Object.keys(results[0]).filter(k => !k.startsWith("_") || k === "_count" || k === "_group") : [];
  const chartData   = results?.slice(0, 20) || [];

  const Inp = ({ val, onChange, placeholder, style }) => (
    <input value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: `0.5px solid ${B.border}`, background: "white", color: "#111827", fontFamily: "inherit", width: "100%", outline: "none", ...style }} />
  );
  const Sel = ({ val, onChange, opts }) => (
    <select value={val} onChange={e => onChange(e.target.value)}
      style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: `0.5px solid ${B.border}`, background: "white", color: "#111827", fontFamily: "inherit", width: "100%", outline: "none" }}>
      <option value="">— select —</option>
      {opts.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  );

  return (
    <div style={{ background: B.bg, minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0F0F19", letterSpacing: "-0.03em" }}>Reports</div>
          <div style={{ fontSize: 13, color: B.gray, marginTop: 4 }}>Build, save and share reports from any data</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setShowSaveForm(true); setPanel("saved"); }} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 20, border: `0.5px solid ${B.border}`, background: B.card, color: B.gray, cursor: "pointer", fontFamily: "inherit" }}>Save report</button>
          <button onClick={() => runReport()} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 20, border: "none", background: B.purple, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>{running ? "Running…" : "▶ Run report"}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0,1fr)", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["build","formulas","saved"].map(p => <Pill key={p} label={p==="build"?"Build":p==="formulas"?"∑ Formulas":"Saved reports"} active={panel===p} onClick={()=>setPanel(p)} />)}
          </div>

          {panel === "build" && (
            <div style={{ background: B.card, border: `0.5px solid ${B.border}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: B.gray, marginBottom: 6 }}>Data source</div>
                <Sel val={selObject} onChange={v => setSelObject(v)} opts={objects.map(o => ({ value: o.id, label: o.plural_name || o.name }))} />
              </div>
              {fields.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: B.gray, marginBottom: 6 }}>Columns</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {fields.map(f => (
                      <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12, color: "#374151" }}>
                        <input type="checkbox" checked={selCols.includes(f.id)} onChange={e => setSelCols(p => e.target.checked ? [...p, f.id] : p.filter(x => x !== f.id))} style={{ accentColor: B.purple }} />
                        {f.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {fields.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: B.gray, marginBottom: 6 }}>Group by</div>
                  <Sel val={groupBy} onChange={setGroupBy} opts={fields.map(f => ({ value: f.api_key, label: f.name }))} />
                </div>
              )}
              {fields.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: B.gray, marginBottom: 6 }}>Sort by</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ flex: 1 }}><Sel val={sortBy} onChange={setSortBy} opts={fields.map(f => ({ value: f.api_key, label: f.name }))} /></div>
                    <select value={sortDir} onChange={e => setSortDir(e.target.value)} style={{ fontSize: 12, padding: "6px 8px", borderRadius: 8, border: `0.5px solid ${B.border}`, background: "white", color: "#111827", fontFamily: "inherit" }}>
                      <option value="desc">↓</option><option value="asc">↑</option>
                    </select>
                  </div>
                </div>
              )}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: B.gray }}>Filters</div>
                  <button onClick={addFilter} style={{ fontSize: 11, color: B.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>+ Add</button>
                </div>
                {filters.map((f, i) => (
                  <div key={f.id} style={{ marginBottom: 8, background: B.bg, borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      <div style={{ flex: 1 }}><Sel val={f.field} onChange={v => setFilters(p => p.map((x,j) => j===i?{...x,field:v}:x))} opts={fields.map(fi => ({ value: fi.api_key, label: fi.name }))} /></div>
                      <button onClick={() => setFilters(p => p.filter((_,j) => j!==i))} style={{ fontSize: 12, color: B.rose, background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>×</button>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <div style={{ flex: 1 }}><Sel val={f.op} onChange={v => setFilters(p => p.map((x,j) => j===i?{...x,op:v}:x))} opts={(OPS[fields.find(fi=>fi.api_key===f.field)?.field_type]||OPS.text).map(o=>({value:o,label:o}))} /></div>
                      {!["is empty","is not empty","is true","is false"].includes(f.op) && <div style={{ flex: 1 }}><Inp val={f.value} onChange={v => setFilters(p => p.map((x,j) => j===i?{...x,value:v}:x))} placeholder="value…" /></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {panel === "formulas" && (
            <div style={{ background: B.card, border: `0.5px solid ${B.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Calculated columns</div>
                <button onClick={addFormula} style={{ fontSize: 11, color: B.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>+ Add</button>
              </div>
              {formulas.length === 0 && <div style={{ fontSize: 12, color: B.gray, textAlign: "center", padding: "16px 0" }}>No formulas yet</div>}
              {formulas.map((f, i) => (
                <div key={f.id} style={{ marginBottom: 10, background: B.bg, borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}><Inp val={f.name} onChange={v => setFormulas(p => p.map((x,j) => j===i?{...x,name:v}:x))} placeholder="Column name…" /></div>
                    <button onClick={() => setFormulas(p => p.filter((_,j) => j!==i))} style={{ fontSize: 12, color: B.rose, background: "none", border: "none", cursor: "pointer" }}>×</button>
                  </div>
                  <Inp val={f.expression} onChange={v => setFormulas(p => p.map((x,j) => j===i?{...x,expression:v}:x))} placeholder="SUM({salary}), COUNT(), …" />
                </div>
              ))}
              <div style={{ marginTop: 12, padding: "10px 12px", background: `${B.purple}08`, borderRadius: 10, fontSize: 11, color: B.gray, lineHeight: 1.6 }}>
                <strong style={{ color: B.purple }}>Formulas:</strong> SUM(field) · AVG(field) · COUNT() · DIFF(a,b) · CONCAT(a,b) · IF(x=y,a,b) · UPPER(field) · ROUND(field,2)
              </div>
            </div>
          )}

          {panel === "saved" && (
            <div style={{ background: B.card, border: `0.5px solid ${B.border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Saved reports</div>
              {showSaveForm && (
                <div style={{ background: B.bg, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <Inp val={listName} onChange={setListName} placeholder="List name…" style={{ marginBottom: 8 }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: B.gray, cursor: "pointer", marginBottom: 10 }}>
                    <input type="checkbox" checked={listShared} onChange={e => setListShared(e.target.checked)} style={{ accentColor: B.purple }} /> Share with all users
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setShowSaveForm(false); setListName(""); }} style={{ flex: 1, fontSize: 11, padding: "6px", borderRadius: 8, border: `0.5px solid ${B.border}`, background: "transparent", color: B.gray, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                    <button onClick={saveList} disabled={!listName||savingList} style={{ flex: 1, fontSize: 11, padding: "6px", borderRadius: 8, border: "none", background: B.purple, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>{savingList?"Saving…":"Save"}</button>
                  </div>
                </div>
              )}
              {savedLists.length === 0 && !showSaveForm && <div style={{ fontSize: 12, color: B.gray, textAlign: "center", padding: "16px 0" }}>No saved reports yet</div>}
              {savedLists.map(sv => (
                <div key={sv.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `0.5px solid ${B.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{sv.name}</div>
                    {sv.is_shared && <span style={{ fontSize: 10, color: B.purple, fontWeight: 700 }}>shared</span>}
                  </div>
                  <button onClick={() => { loadList(sv); setPanel("build"); runReport(sv.object_id); }} style={{ fontSize: 11, color: B.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Load</button>
                  <button onClick={() => deleteList(sv.id)} style={{ fontSize: 11, color: B.rose, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {results && (
            <Panel title="Visualisation" sub="Configure axes then pick a chart type">
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {["bar","area","pie"].map(ct => <Pill key={ct} label={ct.charAt(0).toUpperCase()+ct.slice(1)} active={chartType===ct} onClick={()=>setChartType(ct)} />)}
              </div>
              {chartType !== "pie" && (
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: B.gray, marginBottom: 4 }}>X axis</div>
                    <Sel val={chartX} onChange={setChartX} opts={resultCols.map(k => ({ value: k, label: k==="_group"?"Group":k==="_count"?"Count":k }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: B.gray, marginBottom: 4 }}>Y axis</div>
                    <Sel val={chartY} onChange={setChartY} opts={resultCols.map(k => ({ value: k, label: k==="_group"?"Group":k==="_count"?"Count":k }))} />
                  </div>
                </div>
              )}
              {chartType === "pie" && (
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: B.gray, marginBottom: 4 }}>Label</div>
                    <Sel val={chartX} onChange={setChartX} opts={resultCols.map(k => ({ value: k, label: k==="_group"?"Group":k }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: B.gray, marginBottom: 4 }}>Value</div>
                    <Sel val={chartY} onChange={setChartY} opts={resultCols.map(k => ({ value: k, label: k==="_count"?"Count":k }))} />
                  </div>
                </div>
              )}
              {chartX && chartY && chartData.length > 0 && (
                <div>
                  {chartType === "bar" && (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={chartData} margin={{top:4,right:4,bottom:0,left:-20}} barCategoryGap="30%">
                        <CartesianGrid stroke="rgba(0,0,0,0.04)" vertical={false} />
                        <XAxis dataKey={chartX} tick={{fontSize:10,fill:B.gray}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize:10,fill:B.gray}} axisLine={false} tickLine={false} />
                        <Tooltip content={<DarkTip />} />
                        <Bar dataKey={chartY} fill={B.purple} radius={[4,4,0,0]} label={{position:"top",fontSize:9,fill:B.gray}} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === "area" && (
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={chartData} margin={{top:4,right:4,bottom:0,left:-20}}>
                        <defs>
                          <linearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={B.purple} stopOpacity={0.18} />
                            <stop offset="95%" stopColor={B.purple} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(0,0,0,0.04)" vertical={false} />
                        <XAxis dataKey={chartX} tick={{fontSize:10,fill:B.gray}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize:10,fill:B.gray}} axisLine={false} tickLine={false} />
                        <Tooltip content={<DarkTip />} />
                        <Area type="monotone" dataKey={chartY} stroke={B.purple} strokeWidth={2} fill="url(#rptGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                  {chartType === "pie" && (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={chartData} dataKey={chartY} nameKey={chartX} cx="50%" cy="50%" innerRadius="55%" outerRadius="78%" paddingAngle={3}>
                          {chartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip content={<DarkTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </Panel>
          )}

          {results ? (
            <Panel title={`Results — ${results.length.toLocaleString()} rows`}
              action={
                <button onClick={() => {
                  const headers = resultCols.slice(0,8).join(",");
                  const rows = results.map(r => resultCols.slice(0,8).map(k => JSON.stringify(r[k] ?? "")).join(","));
                  const csv = [headers,...rows].join("\n");
                  const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download = "report.csv"; a.click();
                }} style={{ fontSize: 11, color: B.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                  Export CSV ↓
                </button>
              }>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {resultCols.slice(0,8).map(k => (
                        <th key={k} onClick={() => { setSortBy(k==="_group"?groupBy:k); setSortDir(d => d==="asc"?"desc":"asc"); }}
                          style={{ textAlign:"left", padding:"8px 10px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:B.gray, borderBottom:`0.5px solid ${B.border}`, cursor:"pointer", whiteSpace:"nowrap" }}>
                          {k==="_group"?(groupBy||"Group"):k==="_count"?"Count":k}
                          {sortBy===k && <span style={{marginLeft:4}}>{sortDir==="asc"?"↑":"↓"}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0,50).map((row, i) => (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${B.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = B.bg}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {resultCols.slice(0,8).map(k => (
                          <td key={k} style={{ padding: "9px 10px", color: "#374151" }}>
                            {k==="_count" ? <span style={{ fontWeight:700, color:B.purple }}>{row[k]}</span> : String(row[k]??"—").slice(0,60)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.length > 50 && <div style={{ fontSize:11, color:B.gray, textAlign:"center", marginTop:10 }}>Showing 50 of {results.length} rows. Export CSV for the full set.</div>}
              </div>
            </Panel>
          ) : (
            <div style={{ background: B.card, border: `0.5px solid ${B.border}`, borderRadius: 14, padding: 48, textAlign: "center" }}>
              <div style={{ width:48, height:48, borderRadius:14, background:`${B.purple}12`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={B.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"#111827", marginBottom:6 }}>Configure and run your report</div>
              <div style={{ fontSize:13, color:B.gray, marginBottom:20, maxWidth:280, margin:"0 auto 20px" }}>Select a data source, choose your columns, add filters, then hit Run report.</div>
              <button onClick={() => runReport()} style={{ fontSize:12, padding:"8px 20px", borderRadius:20, border:"none", background:B.purple, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>Run report</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
