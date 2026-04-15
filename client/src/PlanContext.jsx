// client/src/PlanContext.jsx
// Plan-based feature gating for Vercentic.
// Usage: const { plan, can } = usePlan();
//        <PlanGate feature="ai_copilot">...</PlanGate>
import { createContext, useContext, useState, useEffect } from 'react';
import { tFetch } from './apiClient.js';

const PLAN_FEATURES = {
  trial: [
    'core_records','basic_search','email_templates','portals_basic',
  ],
  starter: [
    'core_records','basic_search','email_templates','portals_basic',
    'workflows','forms','bulk_actions','csv_export','saved_views',
    'communications_log','tasks','onboarding_checklist',
    'interview_types','org_chart_basic',
  ],
  growth: [
    'core_records','basic_search','email_templates','portals_basic',
    'workflows','forms','bulk_actions','csv_export','saved_views',
    'communications_log','tasks','onboarding_checklist',
    'interview_types','org_chart_basic',
    'ai_copilot','ai_matching','ai_cv_parse','ai_doc_extract',
    'campaigns','engagement_scoring','sourcing','skills_ontology',
    'reports_advanced','portals_advanced','scorecards','offers',
    'org_chart_full','duplicate_detection','chrome_extension',
  ],
  enterprise: [
    'core_records','basic_search','email_templates','portals_basic',
    'workflows','forms','bulk_actions','csv_export','saved_views',
    'communications_log','tasks','onboarding_checklist',
    'interview_types','org_chart_basic',
    'ai_copilot','ai_matching','ai_cv_parse','ai_doc_extract',
    'campaigns','engagement_scoring','sourcing','skills_ontology',
    'reports_advanced','portals_advanced','scorecards','offers',
    'org_chart_full','duplicate_detection','chrome_extension',
    'sso','rbac_advanced','audit_log','api_access',
    'custom_objects_unlimited','multi_environment','white_label',
    'dedicated_support','sla_guarantee',
  ],
};

const PlanContext = createContext({ plan:'starter', features:PLAN_FEATURES.starter, can:()=>true, loading:false });

export function PlanProvider({ children, environmentId }) {
  const [plan, setPlan]       = useState('starter');
  const [features, setFeatures] = useState(PLAN_FEATURES.starter);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    if (!environmentId) return;
    setLoading(true);
    tFetch(`/api/plan/features?environment_id=${environmentId}`)
      .then(r=>r.json())
      .then(d=>{
        if (d.plan) setPlan(d.plan);
        if (d.features) setFeatures(d.features);
        else setFeatures(PLAN_FEATURES[d.plan]||PLAN_FEATURES.starter);
      })
      .catch(()=>{ /* silently fall back to starter */ })
      .finally(()=>setLoading(false));
  },[environmentId]);

  const can = (feature) => features.includes(feature);

  return (
    <PlanContext.Provider value={{ plan, features, can, loading }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() { return useContext(PlanContext); }

// Wrap any feature in this to hide/disable it on lower plans.
// Set `mode="disable"` to show a greyed-out locked state instead of hiding.
export function PlanGate({ feature, mode='hide', fallback=null, children }) {
  const { can } = usePlan();
  if (can(feature)) return children;
  if (mode==='disable') return (
    <div style={{opacity:.4,pointerEvents:'none',position:'relative',userSelect:'none'}}>
      {children}
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
        background:'rgba(255,255,255,.6)',borderRadius:8}}>
        <span style={{fontSize:11,fontWeight:700,color:'#6b7280',background:'#f3f4f6',padding:'4px 10px',borderRadius:99}}>
          🔒 Upgrade to unlock
        </span>
      </div>
    </div>
  );
  return fallback;
}

export { PLAN_FEATURES };
