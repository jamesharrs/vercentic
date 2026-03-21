# Vercentic Changelog

---

## 2026-03-21 — Copilot UX & Matching Fixes

### 🐛 Bug Fixes

**Copilot — "Viewing undefined record" subtitle**
- The header subtitle now correctly shows the person/job name and page context in all states
- Previously showed "Viewing undefined record" when `currentObject` hadn't resolved yet
- Now: "Viewing Person: James Harrison", "On Dashboard", "Viewing People", etc.

**Copilot — X button not closing the panel**
- The close button in the header was not reliably firing `setOpen(false)` due to a state-update race condition
- Fixed by simplifying the handler and adding `zIndex:1` so the button sits above the decorative background SVG

**Copilot — Context stale after navigation**
- When navigating from Reports (or any page) to a person record while the copilot was already open, it kept the old greeting and had no awareness of the new record
- The welcome message now refreshes whenever `currentRecord`, `currentObject`, or `activeNav` changes — but only if no real conversation has started (preserves in-progress chats)

**Copilot — Job matching using text search instead of AI scores**
- "Match to jobs" was using `<SEARCH_QUERY>` (a text search returning random jobs) instead of the actual `matchCandidateToJob` scoring engine
- The AI Match widget showed 34 real matches; the copilot incorrectly reported "no open jobs"
- **Fix:** On every person record, all jobs are now pre-fetched and scored client-side using `matchCandidateToJob` — the same algorithm the AI Match panel uses. The top 15 scored results (with scores, reasons, and gaps) are injected directly into the copilot's system context
- The system prompt now explicitly instructs Claude to use these pre-calculated scores and never fall back to `<SEARCH_QUERY>` for job matching
- Copilot answers now match the AI Match widget exactly

### ✨ Improvements

**Copilot — Record-specific quick actions in object colour**
- When viewing a record, the quick action buttons now show record-relevant actions (Summarise, Draft email, Match to jobs, etc.) instead of generic create buttons
- Actions are coloured to match the object (blue for People, green for Jobs, purple for Talent Pools)
- Non-record pages still show the purple create grid (New Person, New Job, etc.)

---

## Previous sessions (summary)

See `README.md` and `ARCHITECTURE.md` for full platform documentation.

Core features shipped across the project:
- Dynamic data model (objects, fields, environments)
- AI Copilot with record creation, search, workflow creation, interview scheduling, form creation, and report building
- AI job/candidate matching engine
- Org chart with people relationships and vacancy nodes
- Workflow builder with automation steps
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
