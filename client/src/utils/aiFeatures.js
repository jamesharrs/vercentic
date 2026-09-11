/**
 * aiFeatures.js
 * Single source of truth for AI feature keys/labels/colors used by usage &
 * governance reporting UIs (superadmin/AIUsageReport.jsx, settings/AiGovernance.jsx).
 *
 * WHY THIS FILE EXISTS:
 * These two components each kept their own local FEATURE_LABELS dict, and
 * they had drifted into genuinely different vocabularies — AiGovernance.jsx
 * had a typo'd key ("cv_parsing" instead of the real "cv_parse") and was
 * missing "doc_extract"/"translation" entirely, so those three real, commonly
 * logged features rendered as raw untranslated keys in its usage breakdown
 * chart instead of readable labels. AIUsageReport.jsx also used a positional
 * color array (color = array[i % array.length]) rather than a stable
 * key→color lookup, so a feature's color could shift depending on which
 * other features happened to co-occur in a given period. Server routes
 * (server/config/ai_features.js) mirror the label set — keep both in sync
 * when adding a new feature key.
 *
 * REAL vs ASPIRATIONAL: only copilot, cv_parse, doc_extract, translation and
 * bias_scan are ever actually written to ai_usage_log today. The rest are
 * reserved placeholders for product areas that don't yet tag their AI calls
 * with a distinct feature value.
 */

export const FEATURE_LABELS = {
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

// Keyed (not positional) so a feature's color stays stable regardless of
// which other features co-occur in any given period's data.
export const FEATURE_COLORS = {
  copilot: '#A78BFA',
  cv_parse: '#34D399',
  doc_extract: '#60A5FA',
  translation: '#22D3EE',
  bias_scan: '#F87171',
  job_match: '#FBBF24',
  form_suggest: '#FB923C',
  interview_schedule: '#34D399',
  offer_create: '#FBBF24',
  jd_generate: '#F472B6',
  email_draft: '#2DD4BF',
  screening: '#F472B6',
  interview_questions: '#A78BFA',
  summary: '#9CA3AF',
  unknown: '#9CA3AF',
};
