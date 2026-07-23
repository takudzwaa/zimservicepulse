# ZimServicePulse – Prototype Build Brief (Refined)

**AI4I 2026 Design Track | Shortlisted Project**
**Team:** PulseForge Zimbabwe
**Lead Innovator:** Taku Gondo
**Date:** 23 July 2026 (refined)
**Bootcamp:** 25 July – 1 August 2026

---

## 1. Project Overview

**Project Name:** ZimServicePulse
**Full Title:** Citizen Service Hotspot & Channel Optimizer
**Tagline:** *See the pressure. Act with precision.*

ZimServicePulse is an interactive decision-support dashboard that helps local
authorities and government planners in Zimbabwe quickly see where public
services are failing and what actions they should take. It turns public
service request data into clear visual intelligence and prioritised,
location-aware recommendations.

---

## 2. The Problem

Citizens report problems across six service areas: water & sanitation, roads
& transport, waste management, business licensing, social protection, and
citizen documentation.

Current challenges:

- High unresolved backlogs in some districts
- Low citizen satisfaction in certain areas
- Some channels (WhatsApp, Walk-in, Call Centre, Community Officer) perform
  better than others
- Managers cannot easily see **where** the biggest problems are concentrated

ZimServicePulse solves this by showing **hotspots** on a map and generating
clear recommended actions from the data.

---

## 3. Target Users

1. District Service Manager / Local Authority Operations Lead
2. Provincial / National Policy Analyst
3. Digital Channels & Citizen Engagement Lead
4. Community Officer / Field Supervisor

---

## 4. Required Storytelling Flow (Must Follow Exactly)

The prototype follows the 4-step Design Track structure, presented as four
clearly labelled sections on one scrolling page (with an anchor nav), so the
whole story can be demoed in under 3 minutes without page reloads.

### Step 1 – Overview / Problem Statement
- Problem banner: one-sentence framing of the national service pressure
- 4 national KPI cards (see §6 for exact metric definitions):
  1. Total Requests Received
  2. Unresolved Backlog (count + % of received)
  3. Average Citizen Satisfaction (weighted, out of 5)
  4. % Resolved On Time (weighted)
- Interactive map of Zimbabwe showing hotspot intensity

### Step 2 – Data Exploration
- Sidebar filters (all multi-select unless noted):
  Province, District (dependent on Province), Settlement Type,
  Service Category, Primary Channel, Priority Flag, **Month**
- Map, KPIs, charts, and tables all update live from the same filtered frame
- Ranking charts: service category ranking, channel performance comparison,
  settlement type breakdown, top-10 pressure districts table

### Step 3 – Key Insights
- 3–6 auto-generated insight cards produced by a deterministic rules engine
  (see §7). Every number on a card is computed from the currently filtered
  data — nothing hardcoded.

### Step 4 – Recommended Actions
- Prioritised action list (High / Medium priority) generated from the same
  rules engine, each action named to a specific district/category/channel
- Real export: download filtered data as CSV and download the insight +
  action summary as text/Markdown (no simulated buttons)

---

## 5. Dataset & Data Contract

**Primary file:** `data/01_public_service_requests.csv`
**Status: VALIDATED 23 July** — 720 rows, no nulls, no duplicates, all
coordinates inside Zimbabwe, `requests_resolved` ≤ `requests_received`
everywhere.

Each row is a monthly aggregate for one (month, district, service_category)
combination with its dominant channel. Coverage: 6 months (2026-01 to
2026-06), 10 provinces, 20 districts, 6 service categories.

| Column | Type | Validated values / notes |
|---|---|---|
| `month` | str | `2026-01` … `2026-06` (120 rows each) |
| `province` | str | 10 provinces (matches geoBoundaries ADM1 names exactly) |
| `district` | str | 20 districts; child of province |
| `latitude` | float | −22.22 to −16.84 (all in-bounds) |
| `longitude` | float | 26.50 to 32.67 (all in-bounds) |
| `settlement_type` | str | Urban (396) / Rural (252) / Peri-urban (36) / Border (36) |
| `service_category` | str | The 6 categories in §2 |
| `primary_channel` | str | **5 values:** WhatsApp / Call centre / Community officer / Walk-in / Web portal |
| `requests_received` | int | Weighting basis for all averages |
| `requests_resolved` | int | Always ≤ requests_received |
| `avg_resolution_days` | float | 1.0 – 11.1 |
| `pct_resolved_on_time` | float | **0–100 scale** (39.1 – 97.0) |
| `unresolved_backlog` | int | ≥ 0 |
| `citizen_satisfaction_1_5` | float | 2.3 – 4.9 |
| `priority_flag` | str | **3 levels:** Normal (322) / Watch (311) / Urgent (87) |

Load rules:
- `st.cache_data` on the loader; coerce dtypes explicitly; strip whitespace
  from categoricals
- Rows with unparseable numerics or out-of-bounds coordinates are excluded
  from the map but kept in tabular aggregates, with a small caption noting
  how many were excluded
- If the CSV is missing, show a clear error with instructions — never
  substitute fabricated data

---

## 6. Metric Definitions (exact — this fixes the main ambiguity in v1)

Because rows are aggregates, satisfaction and on-time rates **must be
weighted by request volume**, never taken as naive row means.

- **Total Requests** = Σ `requests_received`
- **Unresolved Backlog** = Σ `unresolved_backlog`
- **Resolution Rate** = Σ `requests_resolved` ÷ Σ `requests_received`
- **Avg Satisfaction** = Σ (`citizen_satisfaction_1_5` × `requests_received`)
  ÷ Σ `requests_received`
- **% Resolved On Time** = Σ (`pct_resolved_on_time` × `requests_received`)
  ÷ Σ `requests_received`
- **Pressure Score** (hotspot intensity, 0–100): min-max normalised blend
  per district = 50% backlog share + 25% (1 − on-time rate) +
  25% (1 − satisfaction/5). Used for map colour/size and the top-district
  table. The formula is shown in a tooltip so judges see it is transparent.

All of these are computed on the *filtered* dataframe so every step of the
story stays consistent.

---

## 7. Insight & Action Rules Engine (deterministic, data-driven)

A pure function takes the filtered dataframe and returns ranked insight and
action objects. Example rules (each fires only when its condition holds in
the data):

1. **Backlog leader:** service category with the largest backlog share,
   overall and within the dominant settlement type
   → *Action:* deploy targeted task-force / resource shift to the named
   category in the named districts.
2. **Channel gap:** channel whose weighted on-time rate exceeds the worst
   channel by ≥ X points (report the actual gap)
   → *Action:* promote/migrate demand toward the better channel in the
   affected settlement types.
3. **Urgent concentration:** districts holding the top N% of
   priority-flagged backlog
   → *Action:* escalation list naming those districts.
4. **Satisfaction floor:** districts with weighted satisfaction below a
   threshold and above a minimum request volume
   → *Action:* citizen-engagement follow-up in named districts.
5. **Slow resolution:** category/district pairs with the highest weighted
   `avg_resolution_days`
   → *Action:* process review for the named pair.

Cards show the computed numbers ("Waste management holds 34% of unresolved
backlog in rural districts") and actions inherit priority from the size of
the gap. If a rule's condition isn't met after filtering, it simply doesn't
render — no filler text.

---

## 8. Design Guidelines

- Clean, modern, professional government-dashboard feel
- Primary: deep blue `#1F4E79`; alert accent: red/orange reserved
  exclusively for hotspots, urgent flags, and worst-performer highlights
- WCAG-friendly contrast; hotspot scale readable for colour-blind users
  (use a sequential yellow→orange→red scale, not red/green)
- Clear typography, generous white space
- Note at top: *"Prototype for AI4I 2026 – Design Track | PulseForge Zimbabwe"*

### Map
- Bubble map on district `latitude`/`longitude`: bubble size = request
  volume, colour = Pressure Score (or backlog), hover shows district KPIs
- **Online mode:** Plotly `scatter_map` with `open-street-map` style —
  free, no API token
- **Offline fallback (bootcamp requirement):** the basemap tiles need
  internet, so ship a toggle/auto-fallback to a plain Plotly scatter over a
  bundled Zimbabwe province outline GeoJSON. Demo must not break without
  Wi-Fi.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ZimServicePulse            [step anchors]   [Export]   │
│  Sidebar: filters                                       │
├─────────────────────────────────────────────────────────┤
│  Problem banner                                         │
│  KPI 1    KPI 2    KPI 3    KPI 4                       │
├──────────────────────────────┬──────────────────────────┤
│      MAP OF ZIMBABWE         │  Rankings / Charts       │
├──────────────────────────────┴──────────────────────────┤
│  Key Insights (cards)                                   │
├─────────────────────────────────────────────────────────┤
│  Recommended Actions  +  Download buttons               │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Technical Stack (decided)

**Streamlit + pandas + Plotly.** Fastest to build, easy live filtering,
professional output, and improvable live during the bootcamp. (React/Leaflet,
Power BI, and Looker Studio were considered and rejected for build speed.)

Repo structure (small modules instead of one monolith — still simple, but
the insight engine stays testable):

```
zimservicepulse/
├── app.py                  # layout + storytelling flow
├── data_loader.py          # cached CSV load, validation, dtypes
├── metrics.py              # weighted KPI + pressure score functions
├── insights.py             # rules engine → insight/action objects
├── assets/zw_provinces.geojson   # offline map fallback
├── data/01_public_service_requests.csv
├── .streamlit/config.toml  # theme (#1F4E79), light default
├── requirements.txt
└── README.md
```

Theming: set the deep-blue theme in `.streamlit/config.toml`; Streamlit's
built-in settings menu already provides the dark/light toggle — do not build
a custom one.

Run:

```bash
pip install -r requirements.txt
streamlit run app.py
```

---

## 10. Feature Checklist

### Must have
- [ ] Live binding to `data/01_public_service_requests.csv` (validated, cached)
- [ ] 4 KPI cards with weighted metrics (§6)
- [ ] Interactive lat/long bubble map with hotspot colour scale + offline fallback
- [ ] Sidebar multi-select filters incl. **Month** and dependent District list
- [ ] Service category ranking chart
- [ ] Channel performance comparison chart
- [ ] Settlement type breakdown
- [ ] Rules-engine insight cards that update with filters
- [ ] Prioritised, location-aware Recommended Actions panel
- [ ] Real CSV + summary downloads
- [ ] Government-style theme, responsive on a laptop

### Nice to have (only after must-haves pass)
- [ ] Urgent-flag visual highlighting on map and tables
- [ ] Priority sorting / simple what-if on the actions panel
- [ ] Month-over-month trend sparkline
- [ ] Top-10 pressure districts table with drill hint

---

## 11. Bootcamp Preparation (25 July – 1 August)

Must bring: laptop with the prototype **running offline**, the CSV, this
brief, a 3-minute pitch, simple branding.

Pitch structure (3 min): Problem (30s) → live dashboard walkthrough
following the 4 steps (90s) → impact & next steps (60s).

Key message: *"ZimServicePulse helps local authorities see exactly where
public services are under pressure and gives them clear, prioritised actions
to improve citizen experience."*

---

## 12. Success Criteria

- Loads real data from the CSV; every number traceable to it
- All visuals update when filters change, consistently
- 4-step storytelling flow is obvious without explanation
- Professional, government-ready look
- Full demo works without internet
- Explainable in under 3 minutes

---

**End of brief. See `ROADMAP.md` for the build plan.**
