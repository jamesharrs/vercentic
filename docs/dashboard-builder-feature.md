# Dashboard Builder — Feature Release Notes
## Vercentic Platform · March 2026

---

## Overview

The Dashboard Builder introduces fully configurable, role-aware dashboards across the Vercentic platform. Administrators and authorised users can create multiple named dashboards, populate them with live data panels, and control exactly who can view or edit each one — with all data access governed by the existing RBAC and org-scoping rules.

---

## Key Features

### Multiple Dashboards
- Create any number of named dashboards per environment
- Each dashboard has a name, description, colour accent, and icon
- One dashboard can be marked as **Default** — what users see first when opening Dashboard
- Dashboards can be **duplicated** (clones the dashboard and all its panels with a single click)

### Panel Types
Each dashboard is built from a 12-column grid of configurable panels:

| Panel Type | Description |
|---|---|
| **KPI Stat** | Single metric with trend indicator vs previous period. Supports field-level filtering (e.g. "Open Jobs only"). |
| **Chart** | Bar, line, or pie chart. Groups any field by value with configurable max items. |
| **Record List** | Live filtered table of records from any object. Column selection, filters, sort, and row limits. |
| **Activity Feed** | Chronological log of recent record creates, edits and deletes across the environment. |
| **Saved Report** | Embeds an existing saved report from the Reports module. |
| **Text / Note** | Free-text panel with optional background colour. For announcements, links, or context. |

### Panel Configuration
Each panel has a settings editor with:
- **Size** — column width (1–12 cols) and row height
- **Title** — optional display label
- **Object** — which object to pull data from (People, Jobs, Talent Pools, or any custom object)
- **Filters** — field + value conditions applied before aggregation
- **Columns** — which fields appear in list panels
- **Chart type** — bar, line, or pie
- **Content** — rich text and background colour for text panels

### AI Dashboard Builder
Click **AI Suggest** in the builder toolbar and describe what you want in plain language:

> *"Show me open jobs by department, candidate pipeline by status, and recent activity"*

The AI reads your live object and field definitions, then automatically creates and configures panels that match your request. Each generated panel is fully editable after creation.

### Access Control
Every dashboard has independent access settings:

**Who can view:**
- **Everyone** — all authenticated users in the environment
- **By role** — select one or more roles (e.g. Recruiter, Hiring Manager)
- **Specific users** — individual user selection

**Who can edit:**
- Select which roles can modify the dashboard's panels and settings
- The dashboard creator always retains edit access
- Super Admins can view and edit all dashboards

**Important:** Dashboard access only controls *who sees the dashboard*. All data inside panels is still governed by the user's RBAC permissions. Object permissions, field visibility, and org unit scoping are enforced at query time for every panel.

---

## How to Use

### Creating a Dashboard
1. Go to **Dashboard → My Dashboards** in the top nav dropdown
2. Click **New Dashboard**
3. Enter a name, optional description, choose a colour
4. Optionally tick **Set as default**
5. Click **Create & Edit** — opens the builder immediately

### Building Panels
1. The **left sidebar** lists all available panel types
2. Click any type to add it to the canvas
3. Click a panel to select it and open the **right-hand config panel**
4. Configure object, filters, columns, and size
5. The canvas shows a **live preview** with real data from your environment
6. Use **AI Suggest** (toolbar button) to generate multiple configured panels at once

### Setting Access
1. Click **Access** in the builder toolbar
2. Choose the viewer rule (Everyone / By role / Specific users)
3. Select which roles can edit the dashboard
4. Changes save immediately on selection

### Managing Dashboards
From the **My Dashboards** list:
- **Edit** — open the builder
- **Set default** — make this the landing dashboard
- **Duplicate** — clone with all panels
- **Delete** — removes the dashboard and all its panels

### Switching Between Dashboards
When multiple dashboards are accessible, a **switcher dropdown** appears top-left of the viewer. Users only see dashboards they have access to.

---

## RBAC & Data Security

The Dashboard Builder enforces security at every layer:

- **Panel data is RBAC-gated server-side** — every panel data request checks the requesting user's role permissions against the object configured for that panel. If the user doesn't have `view` permission, the panel displays "🔒 No access" rather than any data
- **Org unit scoping** — users assigned to an org unit only see records within their subtree, applied automatically to all stat, chart, and list panels
- **Field visibility** — fields hidden by role-level field visibility rules are stripped from list panel rows before the response is returned
- **Dashboard access ≠ data access** — granting view access to a dashboard does not grant any additional record-level permissions. The two systems are independent and both enforced on every request

---

## Admin Setup Notes

### Object Configuration
Panels work against any object in the environment. Fields used for grouping or display must have an `api_key` set — configured in **Settings → Data Model**.

### Setting a Default Dashboard
Each environment supports one default dashboard per environment. Setting a new default automatically clears the previous flag. If no default is configured, users see the first accessible dashboard alphabetically.

### Recommended First Dashboards

| Dashboard | Audience | Suggested Panels |
|---|---|---|
| Recruitment Overview | All recruiters | Open jobs count, Candidates by status chart, Interviews this week stat, Recent activity feed |
| Hiring Manager View | HM role only | Assigned reqs list, Pending scorecards list, Pipeline stat |
| Sourcing Dashboard | Recruiters | Candidates by source pie chart, Time-to-screen trend, Talent pool totals |

Use **AI Suggest** with a plain-language description of each to generate panels automatically.

---

## Copilot Integration

The AI Copilot (✨ button) is aware of the Dashboard Builder. You can:
- Ask it to create a dashboard: *"Create a recruitment overview dashboard"*
- Ask it to describe what panels would suit a given audience
- Use it alongside the builder's own AI Suggest for panel generation

---

## Technical Reference

| Item | Detail |
|---|---|
| Backend route | `server/routes/dashboards.js` |
| Frontend builder | `client/src/DashboardBuilder.jsx` |
| Frontend viewer | `client/src/DashboardViewer.jsx` |
| Hub integration | `client/src/DashboardHub.jsx` — `custom` tab |
| Nav path | Dashboard dropdown → My Dashboards |
| Data collections | `dashboards`, `dashboard_panels` in store |
| Auth | `apiClient.js` — `X-User-Id` + `X-Tenant-Slug` on all requests |
| Charts library | Recharts (bar, area/line, pie) |
| Grid system | 12-column CSS grid, panel sizes configurable per panel |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboards` | List accessible dashboards |
| POST | `/api/dashboards` | Create dashboard |
| GET | `/api/dashboards/:id` | Get dashboard with panels |
| PATCH | `/api/dashboards/:id` | Update dashboard settings |
| DELETE | `/api/dashboards/:id` | Soft-delete dashboard |
| POST | `/api/dashboards/:id/duplicate` | Clone dashboard + panels |
| GET | `/api/dashboards/:id/panels` | List panels |
| POST | `/api/dashboards/:id/panels` | Add panel |
| PATCH | `/api/dashboards/:id/panels/:panelId` | Update panel config |
| DELETE | `/api/dashboards/:id/panels/:panelId` | Remove panel |
| GET | `/api/dashboards/:id/panels/:panelId/data` | Fetch live RBAC-gated panel data |

---

## Known Limitations (v1.5)

- Panel drag-and-drop repositioning is not yet implemented — panels stack in the order added. Resize via the config editor.
- Saved Report panel renders a placeholder; full embedding is planned for v1.6
- AI Suggest requires `ANTHROPIC_API_KEY` to be set in the server environment

---

*Vercentic Platform · Dashboard Builder · Released March 2026*
