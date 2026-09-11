// Single source of truth for AI feature keys/labels used across usage-tracking
// and reporting routes.
//
// WHY THIS FILE EXISTS:
// Four separate files (server: admin_dashboard.js, superadmin_perf.js; client:
// superadmin/AIUsageReport.jsx, settings/AiGovernance.jsx) each kept their own
// local copy of this mapping. They drifted into two genuinely different
// vocabularies rather than just cosmetic differences — e.g. AiGovernance.jsx
// had "cv_parsing" (wrong key — real logged value is "cv_parse") and was
// missing "doc_extract"/"translation" entirely, so those three real, commonly
// logged features rendered as raw untranslated keys in its usage breakdown
// instead of readable labels. Now there is one canonical dict.
//
// REAL vs ASPIRATIONAL:
// Only 5 keys are ever actually written to ai_usage_log by current code
// (confirmed by grepping every trackAIUsage() call site and every literal
// `feature:` string across server + client): copilot, cv_parse, doc_extract,
// translation, bias_scan. The remaining keys below are aspirational —
// reserved for product areas that don't yet tag their AI calls with a
// distinct feature value — kept as forward-compatible placeholders rather
// than pruned, so existing UI (e.g. the usage-log filter dropdown) keeps
// working once those areas start tagging themselves.

const FEATURE_LABELS = {
  // Real / currently logged
  copilot: 'Copilot',
  cv_parse: 'CV Parsing',
  doc_extract: 'Document Extract',
  translation: 'Translation',
  bias_scan: 'Bias Scanner',
  // Aspirational — not yet emitted by any current code path
  job_match: 'Job Matching',
  form_suggest: 'Form Builder',
  interview_schedule: 'Interview Schedule',
  offer_create: 'Offer Creation',
  jd_generate: 'JD Generation',
  email_draft: 'Email Drafting',
  screening: 'Screening',
  interview_questions: 'Interview Questions',
  summary: 'Record Summary',
  // Fallback
  unknown: 'Other',
};

module.exports = { FEATURE_LABELS };
