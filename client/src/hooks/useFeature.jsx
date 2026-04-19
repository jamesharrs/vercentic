// client/src/hooks/useFeature.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// All stable features on by default — prevents flash of missing nav items on load
const DEFAULT_FEATURES = new Set([
  'core','ai_copilot','ai_matching','communications_panel','workflows',
  'portals','reports','org_chart','interviews','offers','forms',
  'bulk_actions','cv_parsing','duplicate_detection',
  // Nav sections
  'access_calendar','access_search','access_chat','access_documents',
  // Record panels — on by default
  'panel_notes','panel_files','panel_activity','panel_forms',
  'panel_recommendations','panel_linked_records',
  'panel_tasks','panel_assessments','panel_engagement',
  'panel_reporting','panel_agents','panel_user',
  'panel_insights','panel_questions',
]);

const FeatureContext = createContext({ features: DEFAULT_FEATURES, loading: false, refresh: () => {} });

export function FeatureProvider({ environmentId, children }) {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!environmentId) { setLoading(false); return; }
    try {
      const sess = (() => { try { return JSON.parse(localStorage.getItem('talentos_session')||'null'); } catch { return null; } })();
      const headers = {};
      if (sess?.tenant_slug) headers['X-Tenant-Slug'] = sess.tenant_slug;
      if (sess?.user?.id)    headers['X-User-Id']     = sess.user.id;
      const res  = await fetch(`/api/feature-flags?environment_id=${environmentId}`, { headers });
      const data = await res.json();
      // data is { flag_key: boolean, ... }
      const enabled = new Set(['core']);
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, val]) => { if (val) enabled.add(key); });
      }
      // Only update state if something actually changed — prevents unnecessary
      // re-renders (and nav flicker) when refresh is called after a flag toggle
      setFeatures(prev => {
        if (prev.size === enabled.size && [...enabled].every(k => prev.has(k))) return prev;
        return enabled;
      });
    } catch {
      // On error keep the last known good state — don't reset to defaults
      // as that would cause nav items to disappear
    }
    setLoading(false);
  }, [environmentId]);

  useEffect(() => { load(); }, [load]);

  return (
    <FeatureContext.Provider value={{ features, loading, refresh: load }}>
      {children}
    </FeatureContext.Provider>
  );
}

/** Returns true if the feature pack is enabled for the current environment */
export function useFeature(key) {
  const { features } = useContext(FeatureContext);
  return features.has(key);
}

/** Returns the full feature context */
export function useFeatures() {
  return useContext(FeatureContext);
}

/** Render children only when feature is enabled; fallback otherwise */
export function FeatureGate({ feature, fallback = null, children }) {
  const enabled = useFeature(feature);
  return enabled ? children : fallback;
}

export default useFeature;
