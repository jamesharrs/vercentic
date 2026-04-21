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

const FeatureContext = createContext({ features: DEFAULT_FEATURES, perObject: {}, loading: false, refresh: () => {} });

export function FeatureProvider({ environmentId, children }) {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [perObject, setPerObject] = useState({});
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
      // data is { flag_key: boolean, ..., _perObject: { slug: { panel_key: bool } } }
      const enabled = new Set(['core']);
      const po = data._perObject || {};
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, val]) => {
          if (key === '_perObject') return;
          if (val) enabled.add(key);
        });
      }
      setFeatures(prev => {
        if (prev.size === enabled.size && [...enabled].every(k => prev.has(k))) return prev;
        return enabled;
      });
      setPerObject(po);
    } catch {
      // On error keep the last known good state
    }
    setLoading(false);
  }, [environmentId]);

  useEffect(() => { load(); }, [load]);

  return (
    <FeatureContext.Provider value={{ features, perObject, loading, refresh: load }}>
      {children}
    </FeatureContext.Provider>
  );
}

/** Returns true if the feature pack is enabled for the current environment */
export function useFeature(key) {
  const { features } = useContext(FeatureContext);
  return features.has(key);
}

/** Returns the full feature context including perObject overrides */
export function useFeatures() {
  return useContext(FeatureContext);
}

/**
 * Returns true if a panel is enabled for a specific object slug.
 * Checks slug-specific override first, falls back to global flag.
 * panelKey: e.g. 'panel_notes', slug: e.g. 'talent-pools'
 */
export function usePanelFlag(panelKey, objectSlug) {
  const { features, perObject } = useContext(FeatureContext);
  const slug = (objectSlug || '').toLowerCase().replace(/\s+/g, '-');
  if (slug && perObject[slug] && panelKey in perObject[slug]) {
    return perObject[slug][panelKey];
  }
  return features.has(panelKey);
}

/** Render children only when feature is enabled; fallback otherwise */
export function FeatureGate({ feature, fallback = null, children }) {
  const enabled = useFeature(feature);
  return enabled ? children : fallback;
}

export default useFeature;
