// client/src/hooks/useFeature.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const FeatureContext = createContext({ features: new Set(['core']), loading: false, refresh: () => {} });

export function FeatureProvider({ environmentId, children }) {
  const [features, setFeatures] = useState(new Set(['core']));
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!environmentId) { setLoading(false); return; }
    try {
      const res  = await fetch(`/api/feature-packs?environment_id=${environmentId}`);
      const data = await res.json();
      const enabled = new Set(Array.isArray(data) ? data.filter(p => p.enabled).map(p => p.key) : []);
      enabled.add('core');
      setFeatures(enabled);
    } catch {
      setFeatures(new Set(['core']));
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
