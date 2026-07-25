# ZimServicePulse

**Citizen Service Hotspot & Channel Optimizer** — *See the pressure. Act with precision.*

Next.js operations console for the POTRAZ AI4I 2026 Challenge (Design Track) by
PulseForge Zimbabwe. Role-aware homes, command-center alerts, deeper analysis,
action workflow, and export packs — all computed live from the official CSV.

The previous Streamlit prototype is preserved under [`legacy/streamlit/`](legacy/streamlit/).

## Run

```bash
cp .env.example .env.local
npm install
npm run db:seed   # optional — users also auto-seed on first request
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Requires `data/01_public_service_requests.csv` (official AI4I dataset).

### Demo accounts (PIN `Zim2026!`)

| Email | Role |
|---|---|
| `district@pulse.zw` | District Manager (Chinhoyi) |
| `analyst@pulse.zw` | Provincial Analyst |
| `channels@pulse.zw` | Channel Lead |
| `admin@pulse.zw` | Admin |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development |
| `npm run build` / `start` | Production build |
| `npm run test` | Golden KPI / insights Vitest suite |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `GET /api/health` | Liveness: DB + CSV row count |

## Deploy on Vercel

1. Import the GitHub repo in Vercel.
2. Set env vars: `AUTH_SECRET` (random), `DEMO_PIN`, optional `DATABASE_URL` (Neon Postgres).
3. Without `DATABASE_URL`, the app uses local PGlite (fine for demos; use Neon for production serverless).
4. Deploy. Framework preset: Next.js.

For the full Neon setup, database-release workflow, health check, and rollback
procedure, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Product modules

- **Role homes** — district manager / provincial analyst / channel lead lenses
- **Command center** — alert inbox, severity triage, mark-read, push to workflow
- **Explore** — filters (URL-synced), hotspot map (offline toggle), rankings, presets
- **Analysis** — cohort compare, channel ROI, backlog aging proxy, next-month forecast
- **Workflow** — assign / status / comments + CSV / Markdown / PDF export packs
- **`/briefing`** — AI4I 4-step pitch story (Overview → Explore → Insights → Actions)

## Design decisions

- **Weighted metrics.** Rows are aggregates; satisfaction and on-time rates are
  weighted by request volume (`BRIEF.md` §6).
- **Pressure score** (0–100): 50% backlog + 25% late resolution + 25% low
  satisfaction, min-max normalised across districts in view.
- **No invented numbers.** Insights and actions come from a pure rules engine
  over the filtered dataframe.
- **Auth.** Auth.js credentials with role + PIN (bcrypt).

## Project structure

```
src/app/(app)/     # Authenticated console routes
src/app/(auth)/    # Login
src/lib/           # metrics, insights, forecast, analysis, auth, db
data/              # Official CSV (+ local PGlite dir, gitignored)
legacy/streamlit/  # Previous prototype
```
