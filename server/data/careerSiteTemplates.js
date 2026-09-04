'use strict';
/**
 * server/data/careerSiteTemplates.js
 *
 * Career-site template registry. Each template is a full portal page structure
 * (pages -> rows -> cells -> widgets) plus branding defaults, composed from the
 * widgets the portal renderer already supports.
 *
 * Consumed by:
 *   - the portal builder's "Start from a template" picker
 *   - provisioning (Basic seeds 'essential')
 *
 * Each template is a builder: build(uid) => { key, label, branding, pages }
 * where `uid` is a unique-id generator (uuidv4) so every applied copy gets
 * fresh row/cell ids.
 *
 * NOTE: image URLs are free-to-use Unsplash CDN links as sensible defaults —
 * the tenant swaps them via Brand Kits / Media Library. These render on the
 * portal's own domain (no CSP restriction).
 */

const IMG = {
  ess_hero:  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=70',
  ess_life:  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=70',
};

// ── small builders ────────────────────────────────────────────────────────────
const mkRow  = (uid, opts, cells) => ({
  id: uid(), preset: opts.preset || '1', bgColor: opts.bg || '', padding: opts.pad || 'lg', cells,
  ...(opts.fullWidth ? { fullWidth: true } : {}),
  ...(opts.style ? { style: opts.style } : {}),
});
const mkCell = (uid, widgetType, widgetConfig) => ({ id: uid(), widgetType, widgetConfig });

// ─────────────────────────────────────────────────────────────────────────────
// ESSENTIAL — clean, conversion-first. Ships with the Basic environment.
// Stack: hero → rich_text (EVP) → image → featured_jobs → benefits_grid → form
// ─────────────────────────────────────────────────────────────────────────────
function essential(uid) {
  const row = (o, c) => mkRow(uid, o, c);
  const cell = (t, cfg) => mkCell(uid, t, cfg);
  return {
    key: 'essential',
    label: 'Essential',
    branding: {
      primary_color:   '#4361EE',
      secondary_color: '#3451BE',
      accent_color:    '#4361EE',
      background_color:'#FFFFFF',
      text_color:      '#161B22',
      font_family:     "'Hanken Grotesk', -apple-system, sans-serif",
    },
    pages: [{
      id: uid(), name: 'Home', slug: '/',
      rows: [
        row({ pad: 'none', fullWidth: true }, [ cell('hero', {
          eyebrow: "We're hiring across the team",
          headline: 'Do the best work of your career.',
          subheading: 'Join a small, senior team building tools people rely on every day. Remote-first, deliberately calm, quietly ambitious.',
          bgImage: IMG.ess_hero,
          overlayOpacity: 55,
          headingColor: '#FFFFFF',
          bodyColor: 'rgba(255,255,255,0.88)',
          align: 'center',
          primaryCta: 'See open roles',
          primaryCtaLink: '#roles',
          secondaryCta: 'Life here',
          secondaryCtaLink: '#life',
        }) ]),

        // EVP + image as one paired two-column band (image left, text right)
        row({ pad: 'lg', preset: '2' }, [
          cell('image', {
            url: IMG.ess_life,
            alt: 'Our team at work',
            rounded: true,
            fit: 'cover',
            maxHeight: 340,
          }),
          cell('rich_text', {
            label: 'Why join us',
            align: 'left',
            content: "## Small team, real ownership\n\nNo layers, no busywork. You own whole problems end to end, ship every week, and see your work in customers' hands within days — not quarters.",
          }),
        ]),

        row({ bg: '#F7F9FC', pad: 'lg' }, [ cell('featured_jobs', {
          heading: 'Open roles',
          layout: 'grid',
          limit: 6,
          selectionMode: 'auto',
          viewAllText: 'View all roles',
          viewAllHref: '#',
        }) ]),

        row({ pad: 'lg' }, [ cell('benefits_grid', {
          heading: "Why you'll stay",
          columns: 4,
          items: [
            { icon: '🌍', title: 'Remote-first',     body: 'Work from anywhere in your timezone.' },
            { icon: '📚', title: 'Learning budget',  body: 'A yearly budget to grow your craft.' },
            { icon: '🌴', title: '25 days leave',    body: 'Plus your birthday and the bank holidays.' },
            { icon: '🏥', title: 'Health cover',     body: 'Private healthcare for you and family.' },
          ],
        }) ]),

        row({ bg: '#F7F9FC', pad: 'lg', style: { maxWidth: '620px' } }, [ cell('form', {
          title: 'Apply in two minutes',
          fields: [
            { label: 'Full name',                 type: 'text' },
            { label: 'Email',                     type: 'email' },
            { label: 'Which role interests you?', type: 'text' },
            { label: 'Anything we should know?',  type: 'textarea' },
          ],
          submitText: 'Send application',
          successTitle: 'Thanks — application received',
          successMessage: 'We read every application and will be in touch within a week.',
        }) ]),
      ],
    }],
  };
}

// Corporate and Tech are authored next, once Essential is validated live.
const BUILDERS = {
  essential,
};

// Metadata for the picker (no page data — just labels/tiers)
const CATALOGUE = [
  { key: 'essential', label: 'Essential',      tier: 'basic',    description: 'Clean and conversion-first — hero, roles, benefits and a short apply. Ships with Basic.' },
  { key: 'corporate', label: 'Corporate',      tier: 'standard', description: 'Trust signals, stats, divisions, testimonials, DEI and full job search. (Coming soon.)' },
  { key: 'tech',      label: 'Tech / Scale-up', tier: 'standard', description: 'Bold hero, values, find-your-fit, culture gallery and team. (Coming soon.)' },
];

function listCareerTemplates() {
  return CATALOGUE.map(c => ({ ...c, available: !!BUILDERS[c.key] }));
}

function buildCareerTemplate(key, uid) {
  const fn = BUILDERS[key] || BUILDERS.essential;
  return fn(uid);
}

module.exports = { BUILDERS, CATALOGUE, listCareerTemplates, buildCareerTemplate };
