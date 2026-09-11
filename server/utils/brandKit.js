// server/utils/brandKit.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for resolving which brand kit a public-facing page
// should use, and shaping it into a consistent `brand` object.
//
// Background: several public pages (AI interview sessions, reschedule links,
// approval links) each need to show the client's branding instead of
// Vercentic's — but "which brand kit, if an environment has several?" was
// answered three different ways across the codebase: ai_interview.js already
// did this correctly (environment-scoped, respects the is_default flag on
// brand_kits); reschedule.js used an older company_profiles.default_brand_kit_id
// pointer AND fell back to brand_kits[0] with no environment filter at all —
// meaning on a shared store, an environment with no default set could show a
// completely different client's logo and colours. That's the kind of bug that
// looks fine in dev with one demo environment and breaks the moment there's
// more than one client's data in the same store.
//
// Rule going forward: always resolve via resolveBrandKit() below — explicit
// override id (if the calling feature supports one) → the environment's
// is_default kit → null. Never fall back to "the first kit in the array."
// If there's no matching kit, the calling page falls back to Vercentic's own
// branding — resolveBrandKit() returns null in that case, it does not
// synthesise a fake brand.
// ─────────────────────────────────────────────────────────────────────────────

// `surface` lets a caller ask "which kit should auto-apply to email /
// career_site / hiring_manager for this environment?" — a kit opts in to a
// surface via its `auto_apply_surfaces` array (e.g. ['email','career_site']).
// Priority is unchanged for existing callers that don't pass a surface:
// explicit id → is_default kit → null. When a surface IS passed, a kit that
// has opted into that surface wins over the plain is_default kit (but an
// explicit id still always wins over both).
function resolveBrandKit(store, environmentId, explicitKitId = null, surface = null) {
  if (!environmentId) return null;
  const kits = (store.brand_kits || []).filter(k => !k.deleted_at && k.environment_id === environmentId);
  if (!kits.length) return null;
  if (explicitKitId) {
    const explicit = kits.find(k => k.id === explicitKitId);
    if (explicit) return explicit;
  }
  if (surface) {
    const autoKit = kits.find(k => Array.isArray(k.auto_apply_surfaces) && k.auto_apply_surfaces.includes(surface));
    if (autoKit) return autoKit;
  }
  return kits.find(k => k.is_default) || null;
}

// Shapes a raw brand_kits row into the flat snake_case object every public
// page consumes (matches the shape InterviewSession.jsx already expects).
//
// Brand kits exist in the store in two different shapes depending on how
// they were created:
//   - wizard-created (CompanySetupWizard.handleApply): flat camelCase fields
//     directly on the kit — kit.primaryColor, kit.fontFamily, kit.logo_url...
//   - BrandKitAgent-created (Portals.jsx saveKit): everything nested under
//     kit.theme — kit.theme.primaryColor, kit.theme.fontFamily... plus a
//     top-level kit.logo for the extracted logo URL.
// Every reader in the app (email builder, portal renderer, interview pages,
// this file) should go through toBrandPayload() rather than reaching into a
// kit directly, so both shapes resolve identically. `pick` returns the first
// defined/non-empty value it's given, so a value on the flat kit always wins
// over the same field nested under kit.theme if somehow both are set.
function toBrandPayload(kit) {
  if (!kit) return null;
  const t = kit.theme || {};
  const pick = (...vals) => {
    for (const v of vals) if (v !== undefined && v !== null && v !== '') return v;
    return null;
  };
  return {
    company_name:    pick(kit.company_name, t.companyName, kit.name),
    company_website: pick(kit.company_website, t.companyWebsite),
    logo_url:        pick(kit.logo_url, kit.logo, t.logo, t.logoUrl),
    logo_dark_url:   pick(kit.logo_dark_url, t.logoDarkUrl),
    favicon_url:     pick(kit.favicon_url, t.faviconUrl),
    primary_color:   pick(kit.primaryColor, t.primaryColor) || '#4361EE',
    secondary_color: pick(kit.secondaryColor, t.secondaryColor),
    accent_color:    pick(kit.accentColor, t.accentColor),
    bg_color:        pick(kit.bgColor, t.bgColor),
    text_color:      pick(kit.textColor, t.textColor),
    font_family:     pick(kit.fontFamily, t.fontFamily),
    heading_font:    pick(kit.headingFont, t.headingFont),
    button_style:    pick(kit.buttonStyle, t.buttonStyle) || 'filled',
    button_radius:   pick(kit.buttonRadius, t.buttonRadius) || '8px',
    border_radius:   pick(kit.borderRadius, t.borderRadius) || '8px',
  };
}

// Convenience: resolve + shape in one call — what most routes actually want.
function resolveBrand(store, environmentId, explicitKitId = null, surface = null) {
  return toBrandPayload(resolveBrandKit(store, environmentId, explicitKitId, surface));
}

module.exports = { resolveBrandKit, toBrandPayload, resolveBrand };
