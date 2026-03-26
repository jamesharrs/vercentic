# Vercentic — AI-native Talent Acquisition Platform

## Stack
- **Frontend**: React + Vite (`client/`, port 3000)
- **Backend**: Express + JSON file store (`server/`, port 3001)
- **Portal renderer**: Vite React app (`portal-renderer/`, port 5173)
- **AI**: Anthropic Claude (Sonnet) via server proxy at `/api/ai/chat`
- **Deploy**: Vercel (client) + Railway (server)

## Live URLs
- App: https://www.vercentic.com
- API: https://talentos-production-4045.up.railway.app
- Repo: https://github.com/jamesharrs/talentos

## Local dev
```bash
cd server && node index.js          # API on :3001
cd client && npm run dev            # App on :3000
bash deploy.sh "commit message"     # Deploy both
```

## Login
- Email: admin@talentos.io  Password: Admin1234!
- Super admin console: /superadmin  Password: talentos-internal-2026

## Key files
- `client/src/App.jsx` — main shell, routing, nav
- `client/src/AI.jsx` — copilot, all action blocks (CREATE_RECORD, SCHEDULE_INTERVIEW etc.)
- `client/src/Records.jsx` — record list + detail panel
- `client/src/Settings.jsx` — all settings sections
- `client/src/OrgChart.jsx` — org chart + people graph
- `server/index.js` — route registration
- `server/db/init.js` — JSON store helpers (query, insert, update, remove)
- `server/routes/` — all API routes

## Architecture notes
- Data stored in `data/talentos.json` (JSON file store, not SQL)
- Records have a `data: {}` blob for all field values
- Multi-environment: every record scoped to `environment_id`
- Branding: platform is called **Vercentic** (not TalentOS)
- Icons: custom SVG path `Ic` component — no external icon library
- Theme: CSS variables (`var(--t-accent)`, `var(--t-bg)` etc.) via ThemeProvider
- i18n: `client/src/i18n/` — AI-generated translations, Arabic RTL supported

## Copilot action blocks
Claude returns tagged JSON blocks that the client parses:
`CREATE_RECORD`, `CREATE_WORKFLOW`, `CREATE_USER`, `CREATE_ROLE`,
`SCHEDULE_INTERVIEW`, `CREATE_FORM`, `RUN_REPORT`, `CREATE_OFFER`
