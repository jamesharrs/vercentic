// ScreeningRulesPanel.jsx — Panel for Job records showing configurable screening criteria
// Renders inside the record detail right column as a collapsible panel
import { useState, useEffect, useCallback } from "react";

const F = "'DM Sans', -apple-system, sans-serif";
const C = {
  accent: "var(--t-accent, #4361ee)", accentLight: "var(--t-accent-light, #eef1ff)",
  text1: "var(--t-text1, #111827)", text2: "var(--t-text2, #374151)", text3: "var(--t-text3, #6b7280)", text4: "var(--t-text4, #9ca3af)",
  border: "var(--t-border, #e5e7eb)", card: "var(--t-card, #ffffff)", bg: "var(--t-bg, #f9fafb)",
  green: "#059669", red: "#dc2626", amber: "#d97706", purple: "#7c3aed",
};

const api = {
  get: u => fetch(`/api${u}`).then(r => r.json()),
  post: (u, b) => fetch(`/api${u}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  put: (u, b) => fetch(`/api${u}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  patch: (u, b) => fetch(`/api${u}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()),
  del: u => fetch(`/api${u}`, { method: 'DELETE' }).then(r => r.json()),
};

const ICON_PATHS = {
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  play: "M5 3l14 9-14 9V3z",
};

const Ic = ({ n, s = 16, c = "currentColor", style }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
    <path d={ICON_PATHS[n] || ""} />
  </svg>
);

const RULE_TYPES = [
  { value: 'knockout', label: 'Knockout', color: '#dc2626', description: 'Auto-reject if not met — flags for review' },
  { value: 'required', label: 'Required', color: '#d97706', description: 'Must pass — reviewed by recruiter' },
  { value: 'preferred', label: 'Preferred', color: '#059669', description: 'Bonus points — doesn\'t disqualify' },
];

const OPERATORS = [
  { value: '=', label: 'equals', types: ['text', 'select', 'boolean', 'number', 'email'] },
  { value: '!=', label: 'does not equal', types: ['text', 'select', 'boolean', 'number'] },
  { value: '>=', label: 'at least', types: ['number', 'currency', 'rating'] },
  { value: '<=', label: 'at most', types: ['number', 'currency', 'rating'] },
  { value: '>', label: 'greater than', types: ['number', 'currency'] },
  { value: '<', label: 'less than', types: ['number', 'currency'] },
  { value: 'contains', label: 'contains', types: ['text', 'textarea', 'multi_select'] },
  { value: 'not_contains', label: 'does not contain', types: ['text', 'textarea', 'multi_select'] },
  { value: 'is_one_of', label: 'is one of', types: ['text', 'select', 'multi_select'] },
  { value: 'contains_any_of', label: 'has any of', types: ['multi_select'] },
  { value: 'contains_all_of', label: 'has all of', types: ['multi_select'] },
  { value: 'is_not_empty', label: 'is not empty', types: ['text', 'email', 'phone', 'url', 'date', 'select', 'multi_select'] },
  { value: 'is_empty', label: 'is empty', types: ['text', 'email', 'phone', 'url', 'date', 'select', 'multi_select'] },
];

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function ScreeningRulesPanel({ record, environment, candidateFields: externalFields }) {
  const [candidateFields, setCandidateFields] = useState(externalFields || []);

  // Self-load People fields if not provided externally
  useEffect(() => {
    if (externalFields?.length) { setCandidateFields(externalFields); return; }
    if (!environment?.id) return;
    api.get(`/objects?environment_id=${environment.id}`).then(objs => {
      const people = (Array.isArray(objs) ? objs : []).find(o => o.slug === 'people' || o.name?.toLowerCase() === 'person');
      if (people) api.get(`/fields?object_id=${people.id}`).then(f => setCandidateFields(Array.isArray(f) ? f : []));
    });
  }, [environment?.id, externalFields]);
  const [rules, setRules] = useState([]);
  const [globalRules, setGlobalRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  // Auto-advance config
  const [config, setConfig] = useState({ auto_advance_threshold: 80, auto_reject_knockouts: true, flag_for_review: true });
  const [showConfig, setShowConfig] = useState(false);

  // Test screening result
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const recordId = record?.id;
  const envId = environment?.id;

  // Load rules + config
  const load = useCallback(async () => {
    if (!recordId || !envId) return;
    setLoading(true);
    try {
      const [rulesData, configData] = await Promise.all([
        api.get(`/screening?record_id=${recordId}&environment_id=${envId}&include_global=true`),
        api.get(`/screening/job/${recordId}/config`),
      ]);
      setRules(rulesData.job_rules || []);
      setGlobalRules(rulesData.global_rules || []);
      setConfig(configData);
    } catch (e) {
      console.error('Failed to load screening rules:', e);
    }
    setLoading(false);
  }, [recordId, envId]);

  useEffect(() => { load(); }, [load]);

  // Save all rules at once
  const handleSaveAll = async () => {
    setSaving(true);
    await api.put(`/screening/job/${recordId}`, { rules, environment_id: envId });
    setSaving(false);
  };

  // Add a new rule
  const handleAddRule = () => {
    setRules(prev => [...prev, {
      field_api_key: candidateFields[0]?.api_key || '',
      operator: '=',
      value: '',
      rule_type: 'required',
      label: '',
      weight: 10,
      is_active: true,
    }]);
    setEditingIdx(rules.length);
    setShowAdd(false);
  };

  // Update a rule
  const updateRule = (idx, updates) => {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, ...updates } : r));
  };

  // Delete a rule
  const deleteRule = (idx) => {
    setRules(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  // Save config
  const handleSaveConfig = async () => {
    await api.put(`/screening/job/${recordId}/config`, config);
    setShowConfig(false);
  };

  // Test screening against a specific candidate (picks first linked candidate)
  const handleTest = async (candidateId) => {
    if (!candidateId) return;
    setTesting(true);
    try {
      const result = await api.post('/screening/evaluate', { candidate_id: candidateId, job_id: recordId, environment_id: envId });
      setTestResult(result);
    } catch (e) {
      alert('Test failed: ' + e.message);
    }
    setTesting(false);
  };

  const knockoutCount = rules.filter(r => r.rule_type === 'knockout').length;
  const requiredCount = rules.filter(r => r.rule_type === 'required').length;
  const preferredCount = rules.filter(r => r.rule_type === 'preferred').length;
  const hasUnsaved = true; // simplified — always show save

  if (loading) return <div style={{ padding: 20, textAlign: "center", color: C.text3, fontSize: 13 }}>Loading screening rules…</div>;

  return (
    <div style={{ fontFamily: F }}>
      {/* Header stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {knockoutCount > 0 && <RuleTypeBadge type="knockout" count={knockoutCount} />}
        {requiredCount > 0 && <RuleTypeBadge type="required" count={requiredCount} />}
        {preferredCount > 0 && <RuleTypeBadge type="preferred" count={preferredCount} />}
        {rules.length === 0 && <span style={{ fontSize: 12, color: C.text3 }}>No screening rules configured</span>}
      </div>

      {/* Global rules indicator */}
      {globalRules.length > 0 && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: `${C.purple}08`, border: `1px solid ${C.purple}20`, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Ic n="shield" s={14} c={C.purple} />
          <span style={{ fontSize: 12, color: C.purple, fontWeight: 600 }}>{globalRules.length} global rule{globalRules.length !== 1 ? 's' : ''} also apply</span>
          <span style={{ fontSize: 11, color: C.text3 }}>(from environment defaults)</span>
        </div>
      )}

      {/* Rules list */}
      {rules.map((rule, idx) => (
        <RuleCard key={idx} rule={rule} idx={idx} fields={candidateFields}
          isEditing={editingIdx === idx}
          onEdit={() => setEditingIdx(editingIdx === idx ? null : idx)}
          onUpdate={(updates) => updateRule(idx, updates)}
          onDelete={() => deleteRule(idx)}
        />
      ))}

      {/* Add rule button */}
      <button onClick={handleAddRule} style={{
        width: "100%", padding: "10px", borderRadius: 10, border: `2px dashed ${C.border}`, background: "transparent",
        color: C.text3, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 12,
        transition: "all .15s",
      }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
         onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; }}>
        <Ic n="plus" s={14} /> Add screening rule
      </button>

      {/* Actions row */}
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowConfig(!showConfig)} style={{
            padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "white",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F, color: C.text2,
            display: "flex", alignItems: "center", gap: 5,
          }}><Ic n="settings" s={12} c={C.text3} /> Auto-actions</button>
        </div>
        <button onClick={handleSaveAll} disabled={saving} style={{
          padding: "8px 18px", borderRadius: 8, border: "none", background: C.accent, color: "white",
          fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: F,
          display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1,
        }}><Ic n="check" s={12} c="white" /> {saving ? "Saving…" : "Save rules"}</button>
      </div>

      {/* Auto-action config */}
      {showConfig && (
        <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 10 }}>Auto-action configuration</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.text2, cursor: "pointer" }}>
              <input type="checkbox" checked={config.auto_reject_knockouts} onChange={e => setConfig(c => ({ ...c, auto_reject_knockouts: e.target.checked }))} style={{ accentColor: C.red }} />
              Auto-reject candidates who fail knockout rules
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.text2, cursor: "pointer" }}>
              <input type="checkbox" checked={config.flag_for_review} onChange={e => setConfig(c => ({ ...c, flag_for_review: e.target.checked }))} style={{ accentColor: C.amber }} />
              Flag rejected candidates for manual review
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: C.text2 }}>Auto-advance if score ≥</span>
              <input type="number" min={0} max={100} value={config.auto_advance_threshold}
                onChange={e => setConfig(c => ({ ...c, auto_advance_threshold: Number(e.target.value) }))}
                style={{ width: 60, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F, textAlign: "center" }} />
              <span style={{ fontSize: 12, color: C.text3 }}>%</span>
            </div>
            <button onClick={handleSaveConfig} style={{
              padding: "6px 14px", borderRadius: 7, border: "none", background: C.accent, color: "white",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F, alignSelf: "flex-start",
            }}>Save config</button>
          </div>
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 10,
          background: testResult.knockout_passed ? `${C.green}08` : `${C.red}08`,
          border: `1px solid ${testResult.knockout_passed ? C.green : C.red}20` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Ic n={testResult.knockout_passed ? "check" : "x"} s={16} c={testResult.knockout_passed ? C.green : C.red} />
            <span style={{ fontSize: 14, fontWeight: 700, color: testResult.knockout_passed ? C.green : C.red }}>
              Score: {testResult.screening_score}% — {testResult.screening_status}
            </span>
          </div>
          {testResult.results?.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
              <Ic n={r.passed ? "check" : "x"} s={12} c={r.passed ? C.green : C.red} />
              <span style={{ color: C.text2 }}>{r.label || r.field_api_key}: {String(r.actual ?? 'empty')} {r.operator} {String(r.expected)}</span>
              <RuleTypeBadge type={r.rule_type} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rule Card ─────────────────────────────────────────────────────────────────
function RuleCard({ rule, idx, fields, isEditing, onEdit, onUpdate, onDelete }) {
  const typeInfo = RULE_TYPES.find(t => t.value === rule.rule_type) || RULE_TYPES[1];
  const field = fields.find(f => f.api_key === rule.field_api_key);
  const fieldName = field?.name || rule.field_api_key;
  const opLabel = OPERATORS.find(o => o.value === rule.operator)?.label || rule.operator;
  const availableOps = OPERATORS.filter(o => !field || o.types.includes(field.field_type));

  return (
    <div style={{
      background: "white", borderRadius: 10, border: `1.5px solid ${isEditing ? typeInfo.color + '40' : C.border}`,
      padding: "10px 14px", marginBottom: 8, transition: "all .15s",
    }}>
      {/* Summary row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={onEdit}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: typeInfo.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {rule.label ? (
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{rule.label}</div>
          ) : (
            <div style={{ fontSize: 13, color: C.text1 }}>
              <strong>{fieldName}</strong> <span style={{ color: C.text3 }}>{opLabel}</span> <strong>{Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value || '')}</strong>
            </div>
          )}
        </div>
        <RuleTypeBadge type={rule.rule_type} />
        <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Ic n="trash" s={12} c={C.text4} />
        </button>
      </div>

      {/* Edit form */}
      {isEditing && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.bg}`, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Label */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, display: "block", marginBottom: 4 }}>Display label (shown to candidates in portal)</label>
            <input value={rule.label || ''} onChange={e => onUpdate({ label: e.target.value })} placeholder="e.g. Do you have a valid UK driving licence?"
              style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F }} />
          </div>

          {/* Field + Operator + Value */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.text4, display: "block", marginBottom: 3 }}>FIELD</label>
              <select value={rule.field_api_key} onChange={e => onUpdate({ field_api_key: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F }}>
                {fields.map(f => <option key={f.api_key} value={f.api_key}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.text4, display: "block", marginBottom: 3 }}>OPERATOR</label>
              <select value={rule.operator} onChange={e => onUpdate({ operator: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F }}>
                {availableOps.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.text4, display: "block", marginBottom: 3 }}>VALUE</label>
              {rule.operator === 'is_empty' || rule.operator === 'is_not_empty' ? (
                <span style={{ fontSize: 12, color: C.text4, padding: "6px 0", display: "block" }}>—</span>
              ) : field?.field_type === 'select' && field.options?.length ? (
                <select value={rule.value} onChange={e => onUpdate({ value: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F }}>
                  <option value="">Select…</option>
                  {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : field?.field_type === 'boolean' ? (
                <select value={rule.value} onChange={e => onUpdate({ value: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F }}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : (
                <input value={rule.value || ''} onChange={e => onUpdate({ value: e.target.value })} placeholder="value"
                  type={['number', 'currency', 'rating'].includes(field?.field_type) ? 'number' : 'text'}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F }} />
              )}
            </div>
          </div>

          {/* Rule type + weight */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {RULE_TYPES.map(t => (
                <button key={t.value} onClick={() => onUpdate({ rule_type: t.value })} title={t.description} style={{
                  padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: F,
                  border: `1.5px solid ${rule.rule_type === t.value ? t.color : C.border}`,
                  background: rule.rule_type === t.value ? `${t.color}12` : "white",
                  color: rule.rule_type === t.value ? t.color : C.text3,
                }}>{t.label}</button>
              ))}
            </div>
            {rule.rule_type === 'preferred' && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: C.text3 }}>Weight:</span>
                <input type="number" min={1} max={100} value={rule.weight} onChange={e => onUpdate({ weight: Number(e.target.value) })}
                  style={{ width: 50, padding: "3px 6px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: F, textAlign: "center" }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rule Type Badge ───────────────────────────────────────────────────────────
function RuleTypeBadge({ type, count }) {
  const t = RULE_TYPES.find(r => r.value === type) || { color: C.text3, label: type };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
      background: `${t.color}12`, color: t.color, whiteSpace: "nowrap",
    }}>
      {count !== undefined ? `${count} ${t.label}` : t.label}
    </span>
  );
}

// ── Exportable: ScreeningResultBadge for use in pipeline views ────────────────
export function ScreeningResultBadge({ score, status, knockoutPassed }) {
  const color = !knockoutPassed ? C.red : score >= 80 ? C.green : score >= 50 ? C.amber : C.red;
  const label = !knockoutPassed ? 'Knocked out' : status === 'passed' ? 'Passed' : status === 'review' ? 'Review' : `${score}%`;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${color}12`, color, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}
