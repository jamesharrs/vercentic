import { useState, useEffect, useCallback } from "react";
import api from "../apiClient.js";

// ── Single source of truth for "is this agent capable of running an AI interview" ──
// This predicate used to be copy-pasted (and quietly drifting) in three places:
// Interviews.jsx's `AIAgentSelector`, Interviews.jsx's `ScheduleModal` (inline
// `availableAgents` state), and CalendarView.jsx's own inline copy. All three now
// import this instead, so there is exactly one place to fix/extend the rule.
export function isInterviewAgent(a) {
  if (!a || a.deleted_at) return false;
  return (
    (a.actions || []).some(ac => ac?.type === "ai_interview" || ac?.action_type === "ai_interview") ||
    (a.steps   || []).some(s  => s?.type === "ai_interview") ||
    a.agent_type === "ai_interview" ||
    a.type === "interview" ||
    a.type === "ai_interview" ||
    !!a.can_interview
  );
}

export function filterInterviewAgents(list) {
  return (Array.isArray(list) ? list : []).filter(isInterviewAgent);
}

// Builds a ready-to-run "AI Screening Interview" agent body for POST /agents.
// Mirrors the defaults the Agents.jsx action editor itself falls back to
// (question_source: 'job', voice: 'en-US'), so a quick-created agent behaves
// identically to one built by hand in Settings → Agents.
export function buildDefaultInterviewAgent(envId, overrides = {}) {
  return {
    name: "AI Screening Interview",
    description: "Conducts an autonomous AI voice interview with the candidate and summarises the result.",
    environment_id: envId,
    trigger_type: "manual",
    is_active: true,
    agent_scope: "all",
    actions: [{
      type: "ai_interview",
      persona_name: "Alex",
      voice: "en-US",
      persona_description: "",
      question_source: "job",
      fallback_question_ids: [],
    }],
    ...overrides,
  };
}

// Fetches + filters interview-capable agents for an environment, and exposes a
// one-click `createDefaultAgent` so an empty list is never a dead end in the UI.
export function useInterviewAgents(envId) {
  const [agents, setAgents]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    if (!envId) { setAgents([]); return Promise.resolve([]); }
    setLoading(true);
    return api.get(`/agents?environment_id=${envId}`)
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.agents || []);
        const filtered = filterInterviewAgents(list);
        setAgents(filtered);
        return filtered;
      })
      .catch(() => { setAgents([]); return []; })
      .finally(() => setLoading(false));
  }, [envId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createDefaultAgent = useCallback((overrides) => {
    if (!envId) return Promise.reject(new Error("No environment"));
    setCreating(true);
    return api.post("/agents", buildDefaultInterviewAgent(envId, overrides))
      .then(agent => refresh().then(() => agent))
      .finally(() => setCreating(false));
  }, [envId, refresh]);

  return { agents, loading, creating, refresh, createDefaultAgent };
}
