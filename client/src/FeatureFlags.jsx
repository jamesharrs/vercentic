/**
 * FeatureFlags — legacy compatibility shim
 *
 * The canonical feature flag system is in hooks/useFeature.jsx (FeatureProvider).
 * This file exists for backward-compat imports — it re-exports from that module
 * and keeps invalidateFlagCache() as a no-op (the new provider manages its own state).
 */
import { useFeature, useFeatures, FeatureGate, FeatureProvider } from './hooks/useFeature.jsx';

export { useFeature, useFeatures, FeatureGate, FeatureProvider };

/** @deprecated — the new FeatureProvider manages its own reload via refresh(). */
export function invalidateFlagCache() {
  // No-op — retained for import compatibility in FeatureFlagsSettings.jsx
}

/** Thin wrapper matching the old useFlag() API (fail-open while loading) */
export function useFlag(flagKey) {
  const { features, loading } = useFeatures();
  if (loading) return true;
  return features.has(flagKey);
}

/** Full flags as a plain object — matches old useFeatureFlags() shape */
export function useFeatureFlags() {
  const { features } = useFeatures();
  const obj = {};
  features.forEach(k => { obj[k] = true; });
  return obj;
}

/** @deprecated — use FeatureProvider from hooks/useFeature.jsx directly */
export function FeatureFlagsProvider({ environmentId, children }) {
  // Just render children — FeatureProvider is now mounted at AppRoot level
  return children;
}
