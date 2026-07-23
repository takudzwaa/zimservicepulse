# ZimServicePulse

**Citizen Service Hotspot & Channel Optimizer** — *See the pressure. Act with precision.*

Prototype for the POTRAZ AI4I 2026 Challenge (Design Track) by PulseForge
Zimbabwe. An interactive decision-support dashboard that shows Zimbabwean
local authorities where public services are under pressure and generates
prioritised, location-aware recommended actions — all computed live from the
official dataset.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

Requires `data/01_public_service_requests.csv` (official AI4I dataset).

## Demoing without internet

The default map uses OpenStreetMap tiles. At a venue without Wi-Fi, switch on
**Offline map mode** in the sidebar — it renders district bubbles over the
bundled province outlines (`assets/zw_provinces.geojson`) with no network
access. Everything else (Plotly, fonts, data) is already served locally.

If the environment ever needs rebuilding offline, install from the vendored
wheels (kept on the demo laptop in `vendor/wheels/`, not in git):

```bash
pip install --no-index --find-links vendor/wheels -r requirements.txt
```

To refresh the wheel cache while online: `pip download -r requirements.txt -d vendor/wheels`.

## Project structure

| File | Purpose |
|---|---|
| `app.py` | Layout and the 4-step storytelling flow (Overview → Explore → Insights → Actions) |
| `data_loader.py` | Cached CSV loading and validation |
| `metrics.py` | Weighted KPIs and the district pressure score |
| `insights.py` | Deterministic rules engine for insight cards and actions (+ PDF export) |
| `BRIEF.md` | Refined project brief incl. data contract and metric definitions |
| `ROADMAP.md` | Build roadmap and bootcamp plan |

## Key design decisions

- **Weighted metrics.** Rows are aggregates, so satisfaction and on-time
  rates are weighted by request volume (see `BRIEF.md` §6).
- **Pressure score** (0–100): 50% backlog + 25% late resolution + 25% low
  satisfaction, min-max normalised across districts in view.
- **No invented numbers.** Insights and actions come from a pure rules
  engine over the filtered dataframe; a rule that finds nothing shows
  nothing.
