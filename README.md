# ZimServicePulse

**Citizen Service Hotspot & Channel Optimizer** — *See the pressure. Act with precision.*

Next.js operations console by PulseForge Zimbabwe. Role-aware homes,
command-center alerts, deeper analysis,
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

Requires `data/01_public_service_requests.csv` (public service-request dataset).

### Local demo accounts

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
2. Follow [LIVE_DEPLOYMENT.md](LIVE_DEPLOYMENT.md) for Neon, Blob, Resend,
   production identity, migration, and cutover configuration.
3. PGlite and shared demo credentials are development-only and are disabled in
   production unless explicitly opted in.
4. Deploy. Framework preset: Next.js.

For the complete live-service architecture, account bootstrap, data activation,
release checklist, incident response, and rollback procedure, see
[LIVE_DEPLOYMENT.md](LIVE_DEPLOYMENT.md). `DEPLOYMENT.md` is retained as the
short demo-era reference.

## Product modules

- **Role homes** — district manager / provincial analyst / channel lead lenses
- **Command center** — alert inbox, severity triage, mark-read, push to workflow
- **Explore** — filters (URL-synced), hotspot map (offline toggle), rankings, presets
- **Analysis** — cohort compare, channel ROI, backlog aging proxy, next-month forecast
- **Workflow** — assign / status / comments + CSV / Markdown / PDF export packs
- **`/briefing`** — 4-step briefing story (Overview → Explore → Insights → Actions)

## Municipal service coverage

The operations console covers service request management, road and infrastructure
inspection follow-up, waste collection tracking, water outage reporting,
performance dashboards, GIS issue mapping, and transparent next-month service
demand forecasting. Roads, waste, and water have dedicated, role-scoped
operations views under `/services`. Asset management and ward/councillor
analytics publish integration-readiness pages and required source schemas; they
remain unpopulated until authoritative council records are connected.

## Who it serves

- **Councils:** request, response-time, hotspot and departmental-performance dashboards.
- **Ministries:** national and provincial comparison of service delivery across councils.
- **Businesses:** appropriately shared anonymized infrastructure and market insights.
- **Researchers:** anonymized historical datasets under licence.
- **Citizens:** free reporting tools with optional premium community features.

External insight and research access requires appropriate anonymization, data governance and licensing.

Authenticated stakeholder workspaces are available under `/stakeholders`:

- Council users can triage citizen reports into the accountable workflow.
- Ministry users receive province and service-category comparison views.
- Business and Researcher users receive aggregate summaries and can submit
  governed data-access requests.
- Citizen users can submit categorized service reports, receive a reference,
  and track status history.
- Admin users review data-access requests under `/governance`.

Raw exports are restricted to internal operational roles and are always scoped
to the signed-in user's assigned districts or provinces.

## Design decisions

- **Weighted metrics.** Rows are aggregates; satisfaction and on-time rates are
  weighted by request volume (`BRIEF.md` §6).
- **Pressure score** (0–100): 50% backlog + 25% late resolution + 25% low
  satisfaction, min-max normalised across districts in view.
- **No invented numbers.** Insights and actions come from a pure rules engine
  over the filtered dataframe.
- **Auth.** Auth.js credentials with individual bcrypt-hashed passwords,
  verified email, invitations, password recovery, roles, and authority membership.

## Project structure

```
src/app/(app)/     # Authenticated console routes
src/app/(auth)/    # Login
src/lib/           # metrics, insights, forecast, analysis, auth, db
data/              # Official CSV (+ local PGlite dir, gitignored)
legacy/streamlit/  # Previous prototype
```
