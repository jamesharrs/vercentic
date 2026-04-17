# Vercentic Changelog

---

## 2026-04-17 — DevOps & Deployment Controls

**GitHub Actions CI/CD pipeline deployed**
- `ci.yml` — runs on every PR to `main` and `develop`: Vite build check, server syntax + startup check, Playwright E2E suite (PRs to main only)
- `deploy-staging.yml` — auto-deploys Vercel preview on every push to `develop`
- `deploy-production.yml` — gates on CI pass, then auto-deploys Vercel production + Railway health check on merge to `main`
- `develop` branch created and pushed to GitHub

**Backlog**
- [ ] Set GitHub branch protection rules on `main` and `develop` (require PR + status checks, block force pushes)
- [ ] Create Railway staging service connected to `develop` branch with its own volume

---

## 2026-04-02 — Major Feature Release (Post March 21)

---

### 🎯 Workflow Enhancements

**Stage Visibility Rules (Blind Screening)**
- Each workflow step now has a **Visibility** tab in the step editor
- Build rules to hide or show specific fields based on the viewer's role
- Example: *Hide [First Name, Photo, Nationality] when User Role is [Recruiter, Hiring Manager]*
- Rules are evaluated at render time — fields exist in the DB but aren't rendered for restricted roles
- Supports multiple stacked rules; first matching rule wins
- Badge on the tab shows the count of active rules

**Structured Next-Steps / Flow Control**
- Workflow editor now has a **Transition Mode** toggle: **Flexible** (any stage, default) or **Structured** (defined paths only)
- Each step has a **Next Steps** tab to define which stages are allowed to follow
- Supports linear flows (A→B→C only), branching (A→B or A→C), and loops
- The stage mover in the pipeline widget only shows allowed next steps in structured mode

**Recruiting Stage Categories**
- 13 built-in recruiting stage categories: Application, Phone Screen, Assessment, Interview, Offer, etc.
- Category picker appears on each step card; auto-mapped by keyword if no manual assignment
- Category bar on Job records shows proportional funnel visualisation with linked people counts
- Clicking a category shows all people at that stage, filterable by sub-stage

---

### 📢 Campaigns Module

**Campaign Builder (Phase 1)**
- New **Campaigns** section in the main nav
- Create outreach campaigns with AI-generated content (subject, body, CTAs)
- Campaign list view with status, channel, and link tracking

**Campaign Builder (Phase 2)**
- Campaign calendar showing scheduled send dates
- Automation rules (trigger on stage change, date, or manual)
- Channel-specific templates (email, SMS, WhatsApp)
- Merge tags that pull from record fields dynamically

**Campaign Links & A/B Testing**
- Generate tracked campaign links directly from any Job or Talent Pool record
- UTM parameters pre-populated from record context
- A/B variant testing — create multiple link variants, track click-through per variant
- Campaign link builder accessible from the record toolbar

**Richer Campaign Pages**
- One-click portal generation from AI campaign content
- Hero image support, benefits grid, trust bar, rich text blocks, CTA banner
- Campaign pages link directly to the portal editor for customisation

---

### 🌐 Chrome Extension — Talent Sourcing

- Browser extension for AI-powered candidate profile import from any web page
- Works on LinkedIn, company websites, GitHub, and other profile pages
- Extracts name, email, title, skills, location and maps to People fields
- Handles CORS via background worker; imports directly into the active environment

---

### 📅 Calendar View

- New **Calendar** nav item with week, month, day, and agenda views
- Pastel event cards with interviewer photo avatars (fetched from People records)
- Self-loading component — accepts `environment` prop and fetches its own data
- Interviews, scheduled events, and workflow automations all appear on the calendar

---

### 🏗️ Portal Builder v2

**Multi-step Application Forms**
- Build multi-step application forms directly in the portal builder
- Step progress bar, per-step validation, creates a candidate record on submit
- Pre-configured 3-step template (About You / Experience / Documents) in the Section Library

**Nav & Footer Editors**
- Dedicated Nav and Footer tabs in the portal builder
- Logo (text or image URL), sticky option, nav link manager
- Footer: background/text colour, copyright text, multi-column link groups

**Section Library**
- 15+ professionally designed row configurations across 7 categories
- Hero (centred, dark, split+image), Jobs (board, featured), Stats, Content, Team, CTA, Forms
- One-click insert at the bottom of the current page

**Analytics**
- Page views, job clicks, applications, and conversion rate tracked automatically
- Stats strip on each portal card (last 30 days)
- Conversion rate = applications ÷ page views

**Conditional Row Visibility**
- Each row can have a URL parameter condition (show only if `?dept=engineering`)
- Useful for audience segmentation and A/B content testing
- Condition indicator shown in editor

**Clean Portal URLs**
- Portals now served at clean paths: `vercentic.com/careers`, `vercentic.com/apply`
- Auth-exempt paths allow public access without login

---

### 🔐 RBAC — Role-Based Access Control

**Feature Access Tab**
- Settings → Roles → Feature Access tab
- Editable toggles per role for every platform feature (add/edit/delete records, run workflows, access reports, etc.)
- Changes saved per role immediately

**Record Action Permissions**
- Fine-grained control over which roles can create, edit, delete, and export per object type
- Applied at the API level on every record operation

---

### 🤖 Copilot Improvements

**Markdown Renderer**
- Copilot responses now render full markdown: tables, headers, bullets, code blocks, bold/italic

**Context-Awareness**
- Copilot is fully aware of the current page, active record, and object type
- Greeting and quick actions update dynamically as you navigate
- Pre-fetches and scores job matches for person records using the AI matching engine

**Drag-and-Drop File Upload**
- Drop a CV, JD, PDF, or image directly into the copilot chat
- CV files trigger the same parsing flow as the Files panel
- Other files sent as vision/document context for Claude to analyse

**Report Creation from Copilot**
- Say "show me jobs by department as a bar chart" — copilot builds and runs the report
- `<RUN_REPORT>` block navigates to Reports with the config pre-loaded

**Clickable Links on Creation Confirmations**
- After creating a person, job, workflow, or form via the copilot, a clickable link card appears
- Clicking navigates directly to the new record

---

### 📊 Dashboard & Insights

**Global Insights Page**
- Dedicated Insights nav item (also accessible from dashboard dropdown)
- Time-to-fill by department, hiring funnel drop-off, candidate risk indicators
- Source effectiveness breakdown, overdue roles tracker

**Admin Dashboard (Super Admin)**
- AI usage tracking across all routes (copilot, CV parse, translation, doc extraction)
- User activity stats, record counts, communications volume

---

### 🔄 Flow Engine (Integrations)

- New **Integrations** tab in Settings with a full flow/automation engine
- Trigger types: scheduled (cron), webhook, and record event triggers
- 10 step types: HTTP request, send email, update field, create record, run AI prompt, etc.
- Run log with status per execution
- Separate from the per-workflow automation steps — designed for cross-system integrations

---

### 🗃️ PostgreSQL Migration

- Backend now auto-bootstraps a PostgreSQL schema on first boot if `DATABASE_URL` is set
- Falls back to JSON file store if Postgres is unavailable
- Migrates JSON data → Postgres on first successful connection
- Railway PostgreSQL add-on supported; no code changes needed beyond the env var

---

### 🔗 URL-Based Routing

- Full deep-link routing — every page, record, and modal has a shareable URL
- Browser back/forward works correctly across all navigation
- Subdomain tenant detection: `acme.vercentic.com` auto-logs into the Acme environment
- Provisioned clients get a subdomain login URL shown on the success screen

---

### 🎨 UX & Design

**Vercentic Brand Redesign**
- Platform renamed to **Vercentic** throughout (UI text, branding, copilot)
- New logo mark, gradient mesh background in mobile copilot
- Ink colour palette, Space Grotesk + DM Sans typography

**Collapsible Sidebar**
- Click the logo/chevron to collapse the sidebar to icon-only mode
- Hover to temporarily expand; persists to localStorage

**Toast Notification System**
- All `alert()` calls replaced with a non-blocking toast system
- Success, error, warning, and info variants with auto-dismiss

**Communications Panel Redesign**
- Compact single-strip filter bar (replaces full-width tab row)
- Clean timeline items with thin left-border treatment
- Template variable resolution shown in previews

**$me Dynamic User Filter**
- Any field filter can use `$me` as the value to filter by the logged-in user
- Works in list filters, saved lists, and report builder

**File Preview Modal**
- Click any file attachment to preview inline
- PDF multi-page rendering via PDF.js canvas (no browser plugin)
- Image, text, and document formats supported

**Compare Modal**
- Select two records and compare field-by-field
- AI summary panel highlights key differences

**Release Notes (What's New)**
- Bell icon in the top bar shows a "What's New" popover
- Admin-managed release notes in the Super Admin console

**People Field Enhancements**
- Three selection modes: All people, Filter by criteria, Specific people picker
- Filter by person_type, department, or any custom field
- Dynamic field/value dropdowns populated from live data

**Email Template Editor**
- HTML code view/edit tab in the email template builder
- Upload raw HTML; live preview toggle

**Notification Preferences**
- Dedicated Settings section for notification preferences
- 5 categories with per-category toggles, quiet hours, digest scheduling

**Job Context Switcher on Person Records**
- When a person is linked to multiple jobs, a context switcher appears in the record header
- Communications, notes, and files can be filtered per linked job

**Create Record Options**
- New record creation now offers: blank, copy existing, create with AI, or from template
- "Create with AI" opens the copilot with an object-specific prompt pre-loaded

---


---

## 2026-03-21 — Copilot UX & Matching Fixes

### 🐛 Bug Fixes

**Copilot — "Viewing undefined record" subtitle**
- The header subtitle now correctly shows the person/job name and page context in all states
- Previously showed "Viewing undefined record" when `currentObject` hadn't resolved yet

**Copilot — X button not closing the panel**
- The close button was not reliably firing due to a state-update race condition
- Fixed by simplifying the handler and adding `zIndex:1` above the decorative background SVG

**Copilot — Context stale after navigation**
- Welcome message now refreshes whenever `currentRecord`, `currentObject`, or `activeNav` changes
- Only refreshes if no real conversation has started (preserves in-progress chats)

**Copilot — Job matching using text search instead of AI scores**
- "Match to jobs" was using `<SEARCH_QUERY>` (text search) instead of the `matchCandidateToJob` scoring engine
- Fix: all jobs pre-fetched and scored client-side on every person record; top 15 injected into the copilot system context
- Copilot answers now match the AI Match widget exactly

### ✨ Improvements

**Copilot — Record-specific quick actions in object colour**
- Quick action buttons show record-relevant actions when viewing a record
- Actions coloured to match the object (blue = People, green = Jobs, purple = Talent Pools)

---

## Previous sessions (summary)

See `README.md` and `ARCHITECTURE.md` for full platform documentation.

Core features shipped across all sessions:
- Dynamic data model (objects, fields, environments)
- AI Copilot with record creation, search, workflow creation, interview scheduling, form creation, and report building
- AI job/candidate matching engine
- Org chart with people relationships and vacancy nodes
- Workflow builder with automation steps and stage categories
- Portal builder (career site, HM portal, agency portal, onboarding)
- Interview management module
- Offer management module
- Forms builder and renderer
- Communications panel (email, SMS, WhatsApp, call logging)
- File upload with CV parsing and document intelligence
- Reports builder with Recharts visualisations
- Saved lists (column picker, filters, saved views)
- Super Admin console (/superadmin) with client provisioning wizard
- Multi-language support (AI-generated translations, RTL for Arabic)
- Railway persistent storage + Vercel frontend deployment
- PostgreSQL migration support
- Chrome extension for talent sourcing
- Campaign builder with A/B testing
- Flow engine (Integrations) for cross-system automation
- RBAC with feature access flags
- URL-based routing with deep links
- Vercentic brand redesign
