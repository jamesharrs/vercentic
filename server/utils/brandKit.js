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

function resolveBrandKit(store, environmentId, explicitKitId = null) {
  if (!environmentId) return null;
  const kits = (store.brand_kits || []).filter(k => !k.deleted_at && k.environment_id === environmentId);
  if (!kits.length) return null;
  const kit = (explicitKitId && kits.find(k => k.id === explicitKitId))
    || kits.find(k => k.is_default)
    || null;
  return kit;
}

// Shapes a raw brand_kits row into the flat snake_case object every public
// page consumes (matches the shape InterviewSession.jsx already expects).
function toBrandPayload(kit) {
  if (!kit) return null;
  return {
    company_name:    kit.company_name  || kit.name || null,
    logo_url:        kit.logo_url      || null,
    logo_dark_url:   kit.logo_dark_url || null,
    favicon_url:     kit.favicon_url   || null,
    primary_color:   kit.primaryColor   || '#4361EE',
    secondary_color: kit.secondaryColor || null,
    accent_color:    kit.accentColor    || null,
    bg_color:        kit.bgColor        || null,
    text_color:      kit.textColor      || null,
    font_family:     kit.fontFamily     || null,
    button_style:    kit.buttonStyle    || 'filled',
    button_radius:   kit.buttonRadius   || '8px',
    border_radius:   kit.borderRadius   || '8px',
  };
}

// Convenience: resolve + shape in one call — what most routes actually want.
function resolveBrand(store, environmentId, explicitKitId = null) {
  return toBrandPayload(resolveBrandKit(store, environmentId, explicitKitId));
}

module.exports = { resolveBrandKit, toBrandPayload, resolveBrand };
