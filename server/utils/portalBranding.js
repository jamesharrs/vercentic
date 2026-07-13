// server/utils/portalBranding.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for resolving a portal's public-facing branding.
//
// Background: portals originally stored their visual/content config under a
// `theme` object (colours, fonts, company name, tagline). Newer saves — and
// any settings added since (e.g. auto_header_images) — write to a separate
// `branding` object instead. Three different places independently did
// `portal.theme || portal.branding` to reconcile the two, which silently
// discards `branding` entirely whenever a portal has *any* `theme` object,
// even a legacy one missing the newer fields. That's a real bug class: it's
// very easy to fix the two places you remember and miss the third.
//
// Rule going forward: always merge, never pick one wholesale. `branding`
// wins per-key since it reflects whatever was most recently edited; `theme`
// fills in anything `branding` doesn't have (mostly legacy colour/font/
// content fields on older portals).
//
// Used by: routes/portals.js, routes/portal_public.js. The client-side
// equivalent lives at client/src/portals/portalBranding.js — keep both in
// sync if this resolution logic ever changes.
// ─────────────────────────────────────────────────────────────────────────────

function mergePortalBranding(portal) {
  return { ...(portal.theme || {}), ...(portal.branding || {}) };
}

module.exports = { mergePortalBranding };
