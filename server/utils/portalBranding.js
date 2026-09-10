// server/utils/portalBranding.js
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
// Auto-apply (added alongside email's auto-apply-surfaces feature): a brand
// kit can opt in to automatically branding a portal via its
// `auto_apply_surfaces` array (surface = 'career_site' or 'hiring_manager'),
// resolved live via resolveBrandKit() from server/utils/brandKit.js — the
// same mechanism email templates already use. This is intentionally a
// FALLBACK-ONLY layer: it only fills fields the portal hasn't set itself
// (on either `theme` or `branding`), so an explicit colour/logo/font choice
// on the portal always wins over whatever a kit would auto-apply. Pass the
// in-memory `store` to get this behaviour; omit it and mergePortalBranding
// behaves exactly as before (plain theme+branding merge, no kit lookup).
//
// The real UI/renderer consumers use an inconsistent mix of camelCase and
// snake_case (and in at least one place, `font` instead of `fontFamily`/
// `font_family`) for the same logical field — so every alias actually read
// anywhere in the app is backfilled together, not just one canonical form.
//
// Client-side equivalent lives at client/src/portals/portalBranding.js — it
// has no store access, so it only re-merges whatever theme/branding the
// server already sent; keep the merge behaviour (not the kit-fallback part,
// which is server-only) in sync if it ever changes.
// ─────────────────────────────────────────────────────────────────────────────

const { resolveBrand } = require('./brandKit');

// Concept → every field-name alias actually read by a portal renderer
// somewhere in the codebase (client/src/portals/, portal-renderer/src/portals/).
const FIELD_ALIASES = [
  { kit: 'company_name',    aliases: ['companyName', 'company_name'] },
  { kit: 'company_website', aliases: ['companyWebsite', 'company_website'] },
  { kit: 'logo_url',        aliases: ['logoUrl', 'logo_url', 'logo'] },
  { kit: 'favicon_url',     aliases: ['faviconUrl', 'favicon_url'] },
  { kit: 'primary_color',   aliases: ['primaryColor', 'primary_color'] },
  { kit: 'secondary_color', aliases: ['secondaryColor', 'secondary_color'] },
  { kit: 'accent_color',    aliases: ['accentColor', 'accent_color'] },
  { kit: 'bg_color',        aliases: ['bgColor', 'bg_color'] },
  { kit: 'text_color',      aliases: ['textColor', 'text_color'] },
  // `font` is a real, separately-named alias used by CandidateHubWidget —
  // not just a casing variant of fontFamily/font_family.
  { kit: 'font_family',     aliases: ['fontFamily', 'font_family', 'font'] },
  { kit: 'heading_font',    aliases: ['headingFont', 'heading_font'] },
  { kit: 'button_style',    aliases: ['buttonStyle', 'button_style'] },
  { kit: 'button_radius',   aliases: ['buttonRadius', 'button_radius'] },
  { kit: 'border_radius',   aliases: ['borderRadius', 'border_radius'] },
];

// `store` is optional so any not-yet-updated caller keeps the old plain-merge
// behaviour; pass it to layer in the live auto-applied-kit fallback.
function mergePortalBranding(portal, store = null) {
  const merged = { ...(portal?.theme || {}), ...(portal?.branding || {}) };
  if (!store || !portal) return merged;

  const surface = portal.type === 'hiring_manager' ? 'hiring_manager' : 'career_site';
  const kit = resolveBrand(store, portal.environment_id, portal.brand_kit_id || null, surface);
  if (!kit) return merged;

  for (const { kit: kitField, aliases } of FIELD_ALIASES) {
    const kitValue = kit[kitField];
    if (kitValue === undefined || kitValue === null || kitValue === '') continue;
    const alreadySet = aliases.some(a => merged[a] !== undefined && merged[a] !== null && merged[a] !== '');
    if (alreadySet) continue;
    for (const a of aliases) merged[a] = kitValue;
  }
  return merged;
}

module.exports = { mergePortalBranding };
