/**
 * ConversationalActionsSettings — wraps ConversationalActions for the
 * Settings panel. The full module lives in ConversationalActions.jsx, same
 * pattern as settings/AgentsSettings.jsx wrapping Agents.jsx.
 */
import ConversationalActions from "../ConversationalActions.jsx";

export default function ConversationalActionsSettings({ environment }) {
  return <ConversationalActions environment={environment} />;
}
