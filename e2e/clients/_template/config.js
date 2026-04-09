// e2e/clients/_template/config.js
// Copy this file into your client directory and fill in their details.
module.exports = {
  // ── Environment ─────────────────────────────────────────────────────────────
  baseURL:    'https://client-gamma-ruddy-63.vercel.app', // their Vercel URL
  email:      'admin@theirclient.io',
  password:   'Admin1234!',
  tenantSlug: 'their-slug',   // from the provisioning screen

  // ── Custom fields to verify exist ───────────────────────────────────────────
  // These are field api_keys that were added during their onboarding.
  // Test will verify these fields appear on the People record detail page.
  customFields: [
    // 'department_code',
    // 'approval_level',
  ],

  // ── Workflows to verify ──────────────────────────────────────────────────────
  // Workflow names that should exist in their environment.
  workflows: [
    // 'Application Review',
    // 'Offer Approval',
  ],

  // ── Portal config ────────────────────────────────────────────────────────────
  portalSlug: null,   // e.g. 'acme-careers' — set if they have a portal

  // ── User roles to verify ─────────────────────────────────────────────────────
  roles: [
    // { email: 'recruiter@theirclient.io', password: 'pass', canSeeFinance: false },
  ],
};
