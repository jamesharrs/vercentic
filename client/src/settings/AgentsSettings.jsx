/**
 * AgentsSettings — wraps the unified AgentsModule for the Settings panel.
 * The full agent builder (automation + interview) lives in Agents.jsx.
 * This file exists so Settings.jsx can import a named component.
 */
import AgentsModule from "../Agents.jsx";

export default function AgentsSettings({ environment }) {
  return <AgentsModule environment={environment} />;
}
