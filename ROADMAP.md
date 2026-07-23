# ZimServicePulse – Build Roadmap

> **Status (23 July):** Phases 0–4 complete and verified — dataset
> validated, app built and tested (incl. offline dry run from vendored
> wheels), pitch script in `PITCH.md`, known-good version tagged
> `v1-bootcamp`. Remaining: Phase 5 bootcamp-week iteration.

Timeline reality: today is **Wed 23 July**, the bootcamp runs **25 July –
1 August**. That leaves roughly **two working days** to get a demo-ready
prototype, then the bootcamp week for polish and iteration. The roadmap is
ordered so that every phase ends with something demoable.

---

## Phase 0 — Unblock the data (today, ~1 hour) 🔴 BLOCKER

The repo currently contains **no dataset**. Nothing downstream can be
verified without it.

- [ ] Obtain `01_public_service_requests.csv` from the AI4I organisers'
      pack and place it at `data/01_public_service_requests.csv`
- [ ] First-look validation in a throwaway script/notebook:
      - actual column names vs the data contract in `BRIEF.md` §5
      - value sets for `settlement_type`, `primary_channel`,
        `priority_flag`, `month` format
      - `pct_resolved_on_time` scale (0–1 vs 0–100)
      - coordinate sanity (inside Zimbabwe bounding box)
      - row count, nulls, duplicates
- [ ] Update `BRIEF.md` §5 with any corrections
- [ ] Download a Zimbabwe provinces GeoJSON into `assets/` for the offline
      map fallback

**Exit criteria:** CSV loads clean in pandas; data contract confirmed.

---

## Phase 1 — Skeleton app with real data (today, ~2–3 hours)

- [ ] Scaffold repo: `requirements.txt` (pinned versions), `README.md`,
      `.streamlit/config.toml` with the `#1F4E79` theme, `.gitignore`
- [ ] `data_loader.py`: cached loader, dtype coercion, validation per the
      contract, excluded-row reporting
- [ ] `metrics.py`: weighted KPI functions + pressure score (BRIEF §6),
      written as pure functions on a dataframe
- [ ] `app.py`: title/tagline/prototype note, the four step sections as
      anchored headers, KPI cards wired to `metrics.py`
- [ ] Git: initial commit

**Exit criteria:** `streamlit run app.py` shows correct national KPIs
computed from the real CSV.

---

## Phase 2 — Exploration: filters, map, charts (tomorrow AM, ~3–4 hours)

- [ ] Sidebar filters: Province → dependent District, Settlement Type,
      Service Category, Primary Channel, Priority Flag, Month; single
      `filtered_df` feeds *everything* (KPIs included)
- [ ] Bubble map: Plotly `scatter_map` (open-street-map style), size =
      requests, colour = pressure score on a yellow→red scale, rich hover
- [ ] Offline fallback: auto/toggle to plain scatter over the bundled
      provinces GeoJSON — test with Wi-Fi off
- [ ] Charts: service category ranking (horizontal bars), channel
      performance (weighted on-time % + satisfaction), settlement type
      breakdown, top-10 pressure districts table

**Exit criteria:** changing any filter updates KPIs, map, and all charts
consistently; map renders with Wi-Fi off.

---

## Phase 3 — Insights & actions engine (tomorrow PM, ~2–3 hours)

- [ ] `insights.py`: rules engine per BRIEF §7 — pure function
      `generate(filtered_df) -> list[Insight]`, each insight carrying its
      computed evidence numbers and a linked recommended action with
      priority
- [ ] Render insight cards (Step 3) and the prioritised action list
      (Step 4) with High/Medium badges and named locations
- [ ] Downloads: filtered CSV via `st.download_button` + Markdown summary
      of current insights/actions
- [ ] Sanity-check the engine against a few hand-computed slices of the
      CSV (rural-only, single province, urgent-only)

**Exit criteria:** filters change → different, correct insights/actions;
no card ever shows a number that can't be traced to the CSV.

---

## Phase 4 — Polish & demo hardening (Fri 25 July, before/at bootcamp start)

- [ ] Visual pass: spacing, problem banner, colour discipline (red/orange
      only for alerts), hover tooltips, number formatting
- [ ] Edge cases: empty filter result (friendly message, no crash),
      missing CSV error message
- [ ] Performance: everything cached, filter response feels instant
- [ ] Full offline dry run: fresh venv, Wi-Fi off, `pip install` from
      local wheels if needed, run the whole demo
- [ ] Rehearse the 3-minute pitch against the 4-step flow twice; note
      exactly which filters you'll click during the demo
- [ ] Tag a `v1-bootcamp` git tag as the known-good version

**Exit criteria:** demo runs start-to-finish offline in under 3 minutes
with zero errors.

---

## Phase 5 — Bootcamp week iteration (25 July – 1 Aug)

Work strictly from feedback; keep `v1-bootcamp` as the rollback point.

Backlog, in priority order:
1. Urgent-flag highlighting on map/tables
2. Month-over-month trend line for the filtered selection
3. What-if priority sorting on the actions panel
4. Per-district drill-down view
5. Branding/logo, mobile preview note

Rule for the week: never demo uncommitted changes; commit after each
working improvement.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| CSV unavailable or schema differs | Phase 0 is first; data contract is updated before any UI work |
| No internet at venue | Offline map fallback + offline install dry run (Phase 4) |
| Weighted metrics questioned by judges | Formulas documented in BRIEF §6 and shown in KPI tooltips |
| Filter combo yields empty data | Explicit empty-state handling (Phase 4) |
| Live-coding breaks the demo | `v1-bootcamp` tag; demo only from committed code |

---

## Definition of done (maps to judging criteria)

- Real CSV data, zero hardcoded numbers
- Live filtering across every visual
- Obvious 4-step storytelling flow
- Government-professional design (#1F4E79, WCAG-friendly)
- Works fully offline
- Pitchable in under 3 minutes
