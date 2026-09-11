// server/middleware/plan_gates.js
// Plan feature map + /api/plan/features endpoint.
const express = require('express');
const router  = express.Router();
const { findOne } = require('../db/init');

const PLAN_FEATURES = {
  trial:      ['core_records','basic_search','email_templates','portals_basic'],
  foundation: ['core_records','basic_search','email_templates','portals_basic','workflows','forms','bulk_actions','csv_export','saved_views','communications_log','tasks','onboarding_checklist','interview_types','org_chart_basic','ai_copilot','ai_matching','ai_cv_parse','ai_doc_extract','offers'],
  growth:     ['core_records','basic_search','email_templates','portals_basic','workflows','forms','bulk_actions','csv_export','saved_views','communications_log','tasks','onboarding_checklist','interview_types','org_chart_basic','ai_copilot','ai_matching','ai_cv_parse','ai_doc_extract','campaigns','engagement_scoring','sourcing','skills_ontology','reports_advanced','portals_advanced','scorecards','offers','org_chart_full','duplicate_detection','chrome_extension'],
  pro:        ['core_records','basic_search','email_templates','portals_basic','workflows','forms','bulk_actions','csv_export','saved_views','communications_log','tasks','onboarding_checklist','interview_types','org_chart_basic','ai_copilot','ai_matching','ai_cv_parse','ai_doc_extract','campaigns','engagement_scoring','sourcing','skills_ontology','reports_advanced','portals_advanced','scorecards','offers','org_chart_full','duplicate_detection','chrome_extension','api_access'],
  enterprise: ['core_records','basic_search','email_templates','portals_basic','workflows','forms','bulk_actions','csv_export','saved_views','communications_log','tasks','onboarding_checklist','interview_types','org_chart_basic','ai_copilot','ai_matching','ai_cv_parse','ai_doc_extract','campaigns','engagement_scoring','sourcing','skills_ontology','reports_advanced','portals_advanced','scorecards','offers','org_chart_full','duplicate_detection','chrome_extension','sso','rbac_advanced','audit_log','api_access','custom_objects_unlimited','multi_environment','white_label','dedicated_support','sla_guarantee'],
};

// Returns plan + feature list for the given environment
router.get('/features', (req, res) => {
  try {
    const { environment_id } = req.query;
    const env = environment_id ? findOne('environments', e=>e.id===environment_id) : null;
    const plan = env?.plan || process.env.DEFAULT_PLAN || 'foundation';
    res.json({ plan, features: PLAN_FEATURES[plan] || PLAN_FEATURES.foundation });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Middleware to gate a specific feature — use as:
// app.use('/api/campaigns', requirePlan('campaigns'), require('./routes/campaigns'));
function requirePlan(feature) {
  return (req, res, next) => {
    try {
      const envId = req.query.environment_id || req.body?.environment_id || req.headers['x-environment-id'];
      const env = envId ? findOne('environments', e=>e.id===envId) : null;
      const plan = env?.plan || 'foundation';
      const features = PLAN_FEATURES[plan] || PLAN_FEATURES.foundation;
      if (features.includes(feature)) return next();
      res.status(402).json({ error:`Feature "${feature}" requires a higher plan. Current plan: ${plan}.`, upgrade_required:true, feature });
    } catch(e) { next(); } // fail open — don't block on errors
  };
}

module.exports = { router, requirePlan, PLAN_FEATURES };
