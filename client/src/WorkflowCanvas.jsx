import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, addEdge,
  useNodesState, useEdgesState, Handle, Position, Panel,
  MarkerType, BaseEdge, getStraightPath, getBezierPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import api from "./apiClient.js";

// ─── Design tokens ────────────────────────────────────────────────────────────
const F = "'Geist', -apple-system, sans-serif";
const C = {
  surface: "#ffffff", border: "#e5e7eb",
  text1: "#111827", text2: "#374151", text3: "#9ca3af",
  accent: "#3b5bdb", accentLight: "#eef2ff",
  ai: "#7c3aed", aiLight: "#f5f3ff",
  green: "#0ca678", greenLight: "#ecfdf5",
  orange: "#f59f00", orangeLight: "#fffbeb",
  red: "#e03131", redLight: "#fef2f2",
  amber: "#d97706",
};

// ─── Icon micro-component ────────────────────────────────────────────────────
const SVG_PATHS = {
  plus:       "M12 5v14M5 12h14",
  x:          "M18 6L6 18M6 6l12 12",
  zap:        "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  mail:       "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  cpu:        "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  tag:        "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  edit:       "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7",
  webhook:    "M18 16.016l3-5.196M9 4.516L12 6l3-1.5M6 16.016l-3-5.196M12 21v-6",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  chevRight:  "M9 18l6-6-6-6",
  chevD:      "M6 9l6 6 6-6",
  layers:     "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  check:      "M20 6L9 17l-5-5",
  trash:      "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  briefcase:  "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  circle:     "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z",
  filter:     "M22 3H2l8 9.46V19l4 2V12.46L22 3z",
  play:       "M5 3l14 9-14 9V3z",
};
const Ic = ({ n, s = 14, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={SVG_PATHS[n] || SVG_PATHS.circle} />
  </svg>
);

// ─── Automation type map ──────────────────────────────────────────────────────
const AUTO_TYPES = {
  ai_prompt:             { label: "AI Prompt",          icon: "cpu",       color: "#7c3aed" },
  stage_change:          { label: "Change Stage",       icon: "tag",       color: "#3b5bdb" },
  update_field:          { label: "Update Field",       icon: "edit",      color: "#0ca678" },
  send_email:            { label: "Send Email",         icon: "mail",      color: "#f59f00" },
  send_invitation_email: { label: "Interview Invite",   icon: "mail",      color: "#0891b2" },
  webhook:               { label: "Webhook",            icon: "webhook",   color: "#e03131" },
  schedule_interview:    { label: "Schedule Interview", icon: "briefcase", color: "#0891b2" },
  run_agent:             { label: "Run Agent",          icon: "zap",       color: "#7048e8" },
  ai_interview:          { label: "AI Interview",       icon: "cpu",       color: "#7048e8" },
  create_offer:          { label: "Create Offer",       icon: "layers",    color: "#0ca678" },
};

const TRIGGER_LABELS = {
  manual:         "Manual only",
  record_created: "Record Created",
  record_updated: "Record Updated",
  field_changed:  "Field Changes",
  stage_changed:  "Stage Changes",
};

// ─── Node style helpers ───────────────────────────────────────────────────────
const nodeBase = (color, selected) => ({
  background: "#fff",
  border: `2px solid ${selected ? color : color + "60"}`,
  borderRadius: 12,
  fontFamily: F,
  boxShadow: selected ? `0 0 0 3px ${color}30, 0 4px 20px rgba(0,0,0,.12)` : "0 2px 8px rgba(0,0,0,.08)",
  minWidth: 200,
  maxWidth: 280,
  transition: "box-shadow .15s, border-color .15s",
});

const handleStyle = (color) => ({
  background: color,
  width: 10,
  height: 10,
  border: "2px solid white",
  boxShadow: "0 0 0 1px " + color,
});

// ─── Trigger Node ────────────────────────────────────────────────────────────
function TriggerNode({ data, selected }) {
  const color = C.green;
  return (
    <div style={nodeBase(color, selected)}>
      <div style={{ background: `linear-gradient(135deg, ${color}, #059669)`, borderRadius: "10px 10px 0 0", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ic n="play" s={12} c="white" />
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.7)", letterSpacing: ".06em", textTransform: "uppercase" }}>Trigger</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white", lineHeight: 1.2 }}>
            {TRIGGER_LABELS[data.trigger_type] || "Manual"}
          </div>
        </div>
      </div>
      {(data.trigger_config?.field || data.trigger_config?.value) && (
        <div style={{ padding: "6px 14px 10px", fontSize: 11, color: C.text3 }}>
          {data.trigger_config.field && <span style={{ color: C.green, fontWeight: 600 }}>{data.trigger_config.field}</span>}
          {data.trigger_config.value && <span> → <strong style={{ color: C.text2 }}>{data.trigger_config.value}</strong></span>}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={handleStyle(color)} />
    </div>
  );
}

// ─── Stage Node ───────────────────────────────────────────────────────────────
function StageNode({ data, selected }) {
  const actions = data.actions || [];
  const firstColor = actions[0] ? (AUTO_TYPES[actions[0].type]?.color || C.accent) : C.accent;
  const color = firstColor;
  const hasCondition = !!(data.condition?.field);

  return (
    <div style={nodeBase(color, selected)}>
      <Handle type="target" position={Position.Top} style={handleStyle(color)} />
      {hasCondition && (
        <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "4px 12px", fontSize: 10, color: "#92400e", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <Ic n="filter" s={9} c="#d97706" />
          {data.condition.field} {data.condition.operator} {data.condition.value}
        </div>
      )}
      <div style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text1, marginBottom: actions.length ? 8 : 0, lineHeight: 1.3 }}>
          {data.name || <span style={{ color: C.text3, fontStyle: "italic" }}>Unnamed stage</span>}
        </div>
        {actions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {actions.map(a => {
              const def = AUTO_TYPES[a.type] || { label: a.type, icon: "zap", color: C.text3 };
              return (
                <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: def.color + "14", color: def.color, border: `1px solid ${def.color}30` }}>
                  <Ic n={def.icon} s={9} c={def.color} />{def.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle(color)} />
    </div>
  );
}

// ─── Condition Node ───────────────────────────────────────────────────────────
function ConditionNode({ data, selected }) {
  const color = C.amber;
  const size = 110;
  return (
    <div style={{ width: size, height: size, position: "relative", fontFamily: F }}>
      <Handle type="target" position={Position.Top} style={{ ...handleStyle(color), top: 0, left: "50%" }} />
      <svg width={size} height={size} viewBox="0 0 110 110" style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon points="55,4 106,55 55,106 4,55"
          fill="white" stroke={selected ? color : color + "80"} strokeWidth={selected ? 2.5 : 2}
          filter={selected ? `drop-shadow(0 0 6px ${color}40)` : "none"} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: color, textTransform: "uppercase", letterSpacing: ".06em" }}>IF</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text1, textAlign: "center", lineHeight: 1.3, marginTop: 2 }}>
          {data.field || "condition"}
        </div>
        {data.operator && <div style={{ fontSize: 10, color: C.text3 }}>{data.operator}</div>}
        {data.value && <div style={{ fontSize: 10, fontWeight: 600, color: C.text2 }}>{data.value}</div>}
      </div>
      {/* Yes → bottom, No → right */}
      <Handle id="yes" type="source" position={Position.Bottom} style={{ ...handleStyle(C.green), bottom: 0, left: "50%" }} />
      <Handle id="no"  type="source" position={Position.Right}  style={{ ...handleStyle(C.red),   right: 0, top: "50%"  }} />
    </div>
  );
}

// ─── Action Node ──────────────────────────────────────────────────────────────
function ActionNode({ data, selected }) {
  const def = AUTO_TYPES[data.action_type] || { label: data.action_type || "Action", icon: "zap", color: C.accent };
  const color = def.color;
  return (
    <div style={{ ...nodeBase(color, selected), minWidth: 160, maxWidth: 220 }}>
      <Handle type="target" position={Position.Top} style={handleStyle(color)} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Ic n={def.icon} s={14} c="white" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color }}>{def.label}</div>
          {data.summary && <div style={{ fontSize: 10, color: C.text3, marginTop: 2, lineHeight: 1.3 }}>{data.summary}</div>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle(color)} />
    </div>
  );
}

// ─── End Node ─────────────────────────────────────────────────────────────────
function EndNode({ data, selected }) {
  const color = C.text3;
  return (
    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f3f4f6", border: `3px solid ${selected ? color : "#d1d5db"}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: selected ? `0 0 0 4px #d1d5db50` : "none", fontFamily: F, position: "relative" }}>
      <Handle type="target" position={Position.Top} style={handleStyle(color)} />
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#9ca3af", margin: "0 auto 4px" }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>End</div>
      </div>
    </div>
  );
}

// Register all custom node types (stable reference — defined outside component)
const NODE_TYPES = {
  triggerNode:   TriggerNode,
  stageNode:     StageNode,
  conditionNode: ConditionNode,
  actionNode:    ActionNode,
  endNode:       EndNode,
};

// ─── Data converters ──────────────────────────────────────────────────────────
export function stepsToFlow(steps, triggerType = "manual", triggerConfig = {}) {
  const nodes = [];
  const edges = [];

  nodes.push({
    id: "__trigger__",
    type: "triggerNode",
    position: { x: 250, y: 30 },
    data: { trigger_type: triggerType, trigger_config: triggerConfig },
    deletable: false,
  });

  let prevId = "__trigger__";
  let y = 180;

  steps.forEach((step) => {
    const id = step.id || `step_${Math.random().toString(36).slice(2, 8)}`;

    nodes.push({
      id,
      type: "stageNode",
      position: { x: 200, y },
      data: {
        name: step.name || "",
        actions: step.actions || [],
        condition: step.condition || null,
      },
    });

    edges.push({
      id: `e_${prevId}_${id}`,
      source: prevId,
      target: id,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: C.accent },
      style: { stroke: C.accent, strokeWidth: 2 },
    });

    prevId = id;
    y += 160;
  });

  // End node
  nodes.push({
    id: "__end__",
    type: "endNode",
    position: { x: 260, y },
    data: {},
    deletable: false,
  });
  edges.push({
    id: `e_${prevId}___end__`,
    source: prevId,
    target: "__end__",
    style: { stroke: "#d1d5db", strokeWidth: 1.5, strokeDasharray: "6 3" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#d1d5db" },
  });

  return { nodes, edges };
}

export function flowToSteps(nodes, edges) {
  // Build adjacency source → target
  const nextMap = {};
  edges.forEach(e => {
    if (!e.sourceHandle || e.sourceHandle === "yes" || !nextMap[e.source]) {
      nextMap[e.source] = e.target;
    }
  });

  const steps = [];
  let current = nextMap["__trigger__"];
  const visited = new Set();

  while (current && !visited.has(current) && current !== "__end__") {
    visited.add(current);
    const node = nodes.find(n => n.id === current);
    if (node) {
      if (node.type === "stageNode") {
        steps.push({
          id: node.id,
          name: node.data.name || "",
          actions: node.data.actions || [],
          condition: node.data.condition || null,
          automation_type: null,
          config: {},
        });
      } else if (node.type === "conditionNode") {
        // Condition node: add as a placeholder step with condition encoded
        steps.push({
          id: node.id,
          name: `IF ${node.data.field || ""} ${node.data.operator || ""} ${node.data.value || ""}`,
          actions: [],
          condition: { field: node.data.field, operator: node.data.operator, value: node.data.value },
        });
      }
    }
    current = nextMap[current];
  }

  return steps;
}

// ─── Palette items (draggable from left sidebar) ──────────────────────────────
const PALETTE = [
  { type: "stageNode",     label: "Stage",     icon: "layers",     color: C.accent,  desc: "Process step with optional actions" },
  { type: "conditionNode", label: "Condition", icon: "filter",     color: C.amber,   desc: "Branch Yes/No on a field value" },
  { type: "actionNode",    label: "Action",    icon: "zap",        color: "#7048e8", desc: "Standalone automation action" },
  { type: "endNode",       label: "End",       icon: "circle",     color: C.text3,   desc: "Terminal end point" },
];

// Default data for newly dropped nodes
const defaultNodeData = (type) => {
  switch (type) {
    case "stageNode":     return { name: "New Stage", actions: [], condition: null };
    case "conditionNode": return { field: "", operator: "equals", value: "" };
    case "actionNode":    return { action_type: "send_email", summary: "" };
    case "endNode":       return {};
    default:              return {};
  }
};

// ─── Right config panel ───────────────────────────────────────────────────────
function NodeConfigPanel({ node, fields, onChange, onDelete }) {
  if (!node || node.id === "__trigger__" || node.id === "__end__") return null;
  const d = node.data;

  const set = (key, val) => onChange({ ...d, [key]: val });
  const setAction = (actionId, patch) =>
    onChange({ ...d, actions: (d.actions||[]).map(a => a.id === actionId ? { ...a, ...patch } : a) });
  const setActionCfg = (actionId, key, val) =>
    setAction(actionId, { config: { ...((d.actions||[]).find(a=>a.id===actionId)?.config||{}), [key]: val } });
  const removeAction = (actionId) =>
    onChange({ ...d, actions: (d.actions||[]).filter(a => a.id !== actionId) });
  const addAction = (type) =>
    onChange({ ...d, actions: [...(d.actions||[]), { id: `a_${Date.now()}`, type, config: {} }] });

  return (
    <div style={{ width: 280, background: C.surface, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 800, color: C.text1 }}>
          {node.type === "stageNode" ? "Stage" : node.type === "conditionNode" ? "Condition" : node.type === "actionNode" ? "Action" : "Node"}
        </div>
        <button onClick={onDelete} title="Delete node" style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 6, color: C.red }}>
          <Ic n="trash" s={13} c={C.red} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Stage node */}
        {node.type === "stageNode" && (
          <>
            <label>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 5 }}>Stage name</div>
              <input value={d.name || ""} onChange={e => set("name", e.target.value)} placeholder="e.g. Phone Screen"
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: F, outline: "none", color: C.text1 }} />
            </label>

            {/* Condition */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 5 }}>Run condition (optional)</div>
              {d.condition?.field ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <select value={d.condition?.field || ""} onChange={e => set("condition", { ...d.condition, field: e.target.value })}
                    style={{ width: "100%", padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: F, outline: "none", background: "white", color: C.text1 }}>
                    <option value="">Any field</option>
                    {fields.map(f => <option key={f.api_key} value={f.api_key}>{f.name}</option>)}
                  </select>
                  <select value={d.condition?.operator || "equals"} onChange={e => set("condition", { ...d.condition, operator: e.target.value })}
                    style={{ width: "100%", padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: F, outline: "none", background: "white" }}>
                    {[["equals","equals"],["not_equals","not equals"],["contains","contains"],["is_empty","is empty"],["is_not_empty","is not empty"],["greater_than",">"],["less_than","<"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                  {!["is_empty","is_not_empty"].includes(d.condition?.operator||"equals") && (
                    <input value={d.condition?.value || ""} onChange={e => set("condition", { ...d.condition, value: e.target.value })} placeholder="value"
                      style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: F, outline: "none" }} />
                  )}
                  <button onClick={() => set("condition", null)} style={{ fontSize: 10, color: C.text3, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>✕ Remove condition</button>
                </div>
              ) : (
                <button onClick={() => set("condition", { field: "", operator: "equals", value: "" })}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 0", background: "none", border: "none", cursor: "pointer", color: C.text3, fontSize: 11, fontFamily: F }}>
                  <Ic n="plus" s={9} /> Add condition
                </button>
              )}
            </div>

            {/* Actions list */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 6 }}>Actions</div>
              {(d.actions||[]).map(a => {
                const def = AUTO_TYPES[a.type] || { label: a.type, icon: "zap", color: C.text3 };
                return (
                  <div key={a.id} style={{ background: `${def.color}08`, border: `1px solid ${def.color}30`, borderRadius: 8, padding: "6px 10px", marginBottom: 6, display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: def.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Ic n={def.icon} s={10} c="white" />
                    </div>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: def.color }}>{def.label}</span>
                    <button onClick={() => removeAction(a.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}>
                      <Ic n="x" s={10} c={C.text3} />
                    </button>
                  </div>
                );
              })}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                {Object.entries(AUTO_TYPES).map(([type, def]) => (
                  <button key={type} onClick={() => addAction(type)}
                    style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 6, border: `1.5px solid ${def.color}40`, background: `${def.color}08`, color: def.color, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
                    <Ic n={def.icon} s={9} c={def.color} />{def.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Condition node */}
        {node.type === "conditionNode" && (
          <>
            <label>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 5 }}>Field</div>
              <select value={d.field || ""} onChange={e => set("field", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: F, outline: "none", background: "white" }}>
                <option value="">Any field</option>
                {fields.map(f => <option key={f.api_key} value={f.api_key}>{f.name}</option>)}
              </select>
            </label>
            <label>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 5 }}>Operator</div>
              <select value={d.operator || "equals"} onChange={e => set("operator", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: F, outline: "none", background: "white" }}>
                {[["equals","equals"],["not_equals","not equals"],["contains","contains"],["is_empty","is empty"],["is_not_empty","is not empty"],["greater_than",">"],["less_than","<"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            {!["is_empty","is_not_empty"].includes(d.operator||"equals") && (
              <label>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 5 }}>Value</div>
                <input value={d.value || ""} onChange={e => set("value", e.target.value)} placeholder="e.g. Active"
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: F, outline: "none" }} />
              </label>
            )}
            <div style={{ fontSize: 11, color: C.text3, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 10px", lineHeight: 1.5 }}>
              Connect the <strong style={{ color: C.green }}>Yes</strong> handle (bottom) to the step that runs when true.<br />
              Connect the <strong style={{ color: C.red }}>No</strong> handle (right) to the fallback step.
            </div>
          </>
        )}

        {/* Action node */}
        {node.type === "actionNode" && (
          <label>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 5 }}>Action type</div>
            <select value={d.action_type || ""} onChange={e => set("action_type", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: F, outline: "none", background: "white" }}>
              <option value="">Select…</option>
              {Object.entries(AUTO_TYPES).map(([type, def]) => <option key={type} value={type}>{def.label}</option>)}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

// ─── Main WorkflowCanvas export ───────────────────────────────────────────────
export default function WorkflowCanvas({ workflow, environment, steps: initialSteps, triggerType, triggerConfig, fields, onSave, onClose }) {
  const reactFlowWrapper = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);

  // Convert steps → flow on mount
  const { nodes: initNodes, edges: initEdges } = stepsToFlow(initialSteps || [], triggerType, triggerConfig);
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  const [selectedNode, setSelectedNode] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fields for config panel dropdowns
  const [allFields, setAllFields] = useState(fields || []);
  useEffect(() => {
    if (fields?.length) { setAllFields(fields); return; }
    if (workflow?.object_id && environment?.id) {
      api.get(`/fields?object_id=${workflow.object_id}&environment_id=${environment.id}`)
        .then(fs => setAllFields(Array.isArray(fs) ? fs : []));
    }
  }, [workflow?.object_id, environment?.id, fields]);

  // Keep selected node data in sync
  const selectedNodeFull = nodes.find(n => n.id === selectedNode?.id) || null;

  const onConnect = useCallback((params) => {
    setEdges(eds => addEdge({
      ...params,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: C.accent },
      style: { stroke: C.accent, strokeWidth: 2 },
    }, eds));
  }, [setEdges]);

  // Drag from palette
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/reactflow-type");
    if (!type || !rfInstance) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const pos = rfInstance.screenToFlowPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
    const id = `node_${Date.now()}`;
    setNodes(ns => ns.concat({
      id, type, position: pos, data: defaultNodeData(type),
    }));
  }, [rfInstance, setNodes]);

  // Node config update
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: newData } : n));
  }, [setNodes]);

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode || selectedNode.id === "__trigger__" || selectedNode.id === "__end__") return;
    setNodes(ns => ns.filter(n => n.id !== selectedNode.id));
    setEdges(es => es.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const derivedSteps = flowToSteps(nodes, edges);
      // Store flow layout on the workflow
      const flowLayout = { nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })) };
      await api.patch(`/workflows/${workflow.id}`, { flow_layout: flowLayout });
      await api.put(`/workflows/${workflow.id}/steps`, { steps: derivedSteps });
      onSave({ ...workflow, steps: derivedSteps, flow_layout: flowLayout });
    } catch(err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", fontFamily: F, background: "#f5f6fa" }}>
      {/* Top bar */}
      <div style={{ height: 52, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", flexShrink: 0, zIndex: 10 }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: F, color: C.text2 }}>
          <Ic n="chevRight" s={12} c={C.text3} style={{ transform: "rotate(180deg)" }} />
          Back
        </button>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text1 }}>{workflow?.name || "Workflow"} — Visual Canvas</div>
          <div style={{ fontSize: 11, color: C.text3 }}>{nodes.filter(n => n.type === "stageNode").length} stages · {edges.length} connections</div>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 20px", borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.ai})`, color: "white", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: F, opacity: saving ? .6 : 1 }}>
          {saving ? "Saving…" : <><Ic n="check" s={14} c="white" /> Save workflow</>}
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left palette */}
        <div style={{ width: 180, background: C.surface, borderRight: `1px solid ${C.border}`, padding: 14, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Drag to canvas</div>
          {PALETTE.map(item => (
            <div key={item.type}
              draggable
              onDragStart={e => { e.dataTransfer.setData("application/reactflow-type", item.type); e.dataTransfer.effectAllowed = "move"; }}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, border: `1.5px solid ${item.color}40`, background: `${item.color}08`, cursor: "grab", userSelect: "none" }}
              onMouseEnter={e => { e.currentTarget.style.background = `${item.color}18`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${item.color}08`; }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic n={item.icon} s={12} c="white" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.label}</div>
                <div style={{ fontSize: 10, color: C.text3, lineHeight: 1.3, marginTop: 1 }}>{item.desc}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 9, background: "#f3f4f6", fontSize: 10, color: C.text3, lineHeight: 1.5 }}>
            <strong>Tip:</strong> Click a node to configure it. Drag from the handles (●) to connect nodes.
          </div>
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} style={{ flex: 1, height: "100%" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={NODE_TYPES}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode="Delete"
          >
            <Background color="#e5e7eb" gap={20} size={1} />
            <Controls style={{ bottom: 16, left: 16 }} />
            <MiniMap style={{ bottom: 16, right: selectedNodeFull ? 296 : 16 }} nodeColor={n => n.type === "triggerNode" ? C.green : n.type === "conditionNode" ? C.amber : n.type === "endNode" ? "#d1d5db" : C.accent} />
            {/* Yes/No edge labels on condition edges */}
            <Panel position="top-right" style={{ fontSize: 11, color: C.text3, background: "rgba(255,255,255,.85)", borderRadius: 8, padding: "6px 10px", backdropFilter: "blur(4px)" }}>
              Scroll to zoom · Drag nodes to reposition
            </Panel>
          </ReactFlow>
        </div>

        {/* Right config panel */}
        {selectedNodeFull && (
          <NodeConfigPanel
            node={selectedNodeFull}
            fields={allFields}
            onChange={(newData) => updateNodeData(selectedNodeFull.id, newData)}
            onDelete={deleteSelectedNode}
          />
        )}
      </div>
    </div>
  );
}
