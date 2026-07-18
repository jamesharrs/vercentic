// client/src/portals/portalBranding.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for resolving a portal's public-facing branding.
//
// Background: portals originally stored their visual/content config under a
// `theme` object (colours, fonts, company name, tagline). Newer saves — and
// any settings added since (e.g. auto_header_images) — write to a separate
// `branding` object instead. Independently reconciling `theme || branding`
// in multiple places is what caused a real bug: any field only present in
// `branding` was silently discarded for portals that also had a `theme`.
//
// Rule going forward: always merge, never pick one wholesale. `branding`
// wins per-key since it reflects whatever was most recently edited; `theme`
// fills in anything `branding` doesn't have (mostly legacy colour/font/
// content fields on older portals).
//
// Server-side equivalent lives at server/utils/portalBranding.js — keep
// both in sync if this resolution logic ever changes.
// ─────────────────────────────────────────────────────────────────────────────

export function mergePortalBranding(portal) {
  return { ...(portal?.theme || {}), ...(portal?.branding || {}) };
}
