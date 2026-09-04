// Single source of truth for Anthropic model identifiers used across the server.
//
// WHY THIS FILE EXISTS:
// Anthropic periodically retires dated model snapshots (e.g. 'claude-sonnet-4-20250514'),
// which start returning HTTP 404 with no warning. Before this file existed, ~30 route
// files each hardcoded their own model string, so a retirement meant hunting through the
// whole codebase file-by-file. Now it's a one-line change here.
//
// Every export below can be overridden in .env / Railway without touching code.
//
// TIERS:
//   MODEL_DEFAULT — general chat, copilot, matching, workflows, scoring, most AI features.
//   MODEL_OPUS    — heavier reasoning / vision tasks: CV parsing, document extraction
//                   (reads images/scans), translation quality. Deliberately a stronger
//                   model tier — do not silently downgrade these to MODEL_DEFAULT.

const MODEL_DEFAULT = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MODEL_OPUS = process.env.ANTHROPIC_MODEL_OPUS || 'claude-opus-4-6';

module.exports = { MODEL_DEFAULT, MODEL_OPUS };
