// portal-renderer/src/portals/portalBranding.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for resolving a portal's public-facing branding in
// this standalone renderer app.
//
// Mirrors client/src/portals/portalBranding.js and, in intent,
// server/utils/portalBranding.js — see those files for the full history.
// This file previously didn't exist: PortalPageRenderer.jsx here computed
// `portal.theme || portal.branding || {}` inline, which is the exact
// wholesale-pick bug already fixed elsewhere — since any non-empty `theme`
// object is truthy, `branding` (the newer, more complete object, and the one
// carrying any server-side auto-applied-brand-kit fallback values) was being
// silently discarded whenever a portal also had a legacy `theme`.
//
// Rule: always merge, never pick one wholesale. `branding` wins per-key.
// ─────────────────────────────────────────────────────────────────────────────

export function mergePortalBranding(portal) {
  return { ...(portal?.theme || {}), ...(portal?.branding || {}) };
}
