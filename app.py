"""ZimServicePulse – Citizen Service Hotspot & Channel Optimizer.

Prototype for AI4I 2026 – Design Track | PulseForge Zimbabwe
Storytelling flow: 1 Overview -> 2 Exploration -> 3 Insights -> 4 Actions.
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

import insights as insights_engine
from data_loader import PRIORITY_ORDER, load_data, load_province_geojson
from metrics import district_summary, group_summary, kpis, month_trend

PRIMARY = "#1F4E79"
ALERT = "#D64541"
PRESSURE_SCALE = "YlOrRd"  # colour-blind friendly sequential scale

st.set_page_config(
    page_title="ZimServicePulse",
    page_icon="📍",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    f"""
    <style>
      h1, h2, h3 {{ color: {PRIMARY}; }}
      .block-container {{ padding-top: 1.2rem; }}
      .zsp-banner {{
        background: {PRIMARY}; color: white; padding: 0.9rem 1.2rem;
        border-radius: 0.5rem; font-size: 1.02rem; margin-bottom: 0.8rem;
      }}
      .zsp-badge-high, .zsp-badge-medium {{
        display: inline-block; padding: 0.1rem 0.55rem; border-radius: 1rem;
        font-size: 0.75rem; font-weight: 700; color: white; margin-right: 0.4rem;
      }}
      .zsp-badge-high {{ background: {ALERT}; }}
      .zsp-badge-medium {{ background: #E67E22; }}
      .zsp-nav {{ display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 0.4rem 0 1rem 0; }}
      .zsp-nav a {{
        display: inline-flex; align-items: center; gap: 0.45rem;
        padding: 0.42rem 1rem; border-radius: 2rem;
        border: 1px solid {PRIMARY}33; background: {PRIMARY}0D;
        color: {PRIMARY} !important; text-decoration: none !important;
        font-weight: 600; font-size: 0.88rem;
        transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
      }}
      .zsp-nav a:hover {{
        background: {PRIMARY}; color: white !important;
        box-shadow: 0 2px 8px {PRIMARY}55; transform: translateY(-1px);
      }}
      .zsp-nav a span {{
        display: inline-flex; align-items: center; justify-content: center;
        width: 1.35rem; height: 1.35rem; border-radius: 50%;
        background: {PRIMARY}; color: white; font-size: 0.72rem; font-weight: 700;
      }}
      .zsp-nav a:hover span {{ background: white; color: {PRIMARY}; }}
    </style>
    """,
    unsafe_allow_html=True,
)

df, excluded_rows = load_data()
geojson = load_province_geojson()

# ---------------------------------------------------------------- header
st.title("ZimServicePulse")
st.markdown(
    "**Citizen Service Hotspot & Channel Optimizer** — "
    "*See the pressure. Act with precision.*  \n"
    "<small>Prototype for AI4I 2026 – Design Track | PulseForge Zimbabwe</small>",
    unsafe_allow_html=True,
)
st.markdown(
    """
    <div class="zsp-nav">
      <a href="#step-1"><span>1</span>Overview</a>
      <a href="#step-2"><span>2</span>Explore</a>
      <a href="#step-3"><span>3</span>Insights</a>
      <a href="#step-4"><span>4</span>Actions</a>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------- filters
FILTER_KEYS = [
    "f_province", "f_district", "f_settlement", "f_category",
    "f_channel", "f_priority", "f_month",
]

with st.sidebar:
    st.header("Filters")
    st.caption("Empty selection = everything included.")

    provinces = st.multiselect("Province", sorted(df["province"].unique()), key="f_province")
    district_pool = df[df["province"].isin(provinces)] if provinces else df
    districts = st.multiselect(
        "District", sorted(district_pool["district"].unique()), key="f_district"
    )
    settlements = st.multiselect(
        "Settlement type", sorted(df["settlement_type"].unique()), key="f_settlement"
    )
    categories = st.multiselect(
        "Service category", sorted(df["service_category"].unique()), key="f_category"
    )
    channels = st.multiselect(
        "Primary channel", sorted(df["primary_channel"].unique()), key="f_channel"
    )
    priorities = st.multiselect(
        "Priority flag",
        [p for p in PRIORITY_ORDER if p in set(df["priority_flag"])],
        key="f_priority",
    )
    months = st.multiselect("Month", list(df["month"].cat.categories), key="f_month")

    def _reset_filters() -> None:
        for key in FILTER_KEYS:
            st.session_state[key] = []
        st.session_state["drill_district"] = "— Select a district —"
        st.session_state["action_focus"] = "Balanced (default severity)"
        st.session_state["high_only"] = False

    st.button("Reset all filters", on_click=_reset_filters, width="stretch")

    st.divider()
    offline_map = st.toggle(
        "Offline map mode",
        value=False,
        help="Use the bundled province outlines instead of internet map tiles. "
        "Turn on when demoing without Wi-Fi.",
    )
    if excluded_rows:
        st.caption(f"{excluded_rows} row(s) excluded by data validation.")

filtered = df
filter_desc = []
for col, selected in [
    ("province", provinces),
    ("district", districts),
    ("settlement_type", settlements),
    ("service_category", categories),
    ("primary_channel", channels),
    ("priority_flag", priorities),
    ("month", months),
]:
    if selected:
        filtered = filtered[filtered[col].isin(selected)]
        filter_desc.append(f"{col.replace('_', ' ')}: {', '.join(map(str, selected))}")
scope = "; ".join(filter_desc) if filter_desc else "National — all data"

if filtered.empty:
    st.warning(
        "No records match the current filter combination. "
        "Remove one or more filters to continue."
    )
    st.stop()

kpi = kpis(filtered)
districts_view = district_summary(filtered)

with st.sidebar:
    st.caption(f"{len(filtered):,} of {len(df):,} records in view")

# ============================================================ step 1
st.header("1 · Overview: where services are under pressure", anchor="step-1")
st.caption(f"Scope: {scope}")
st.markdown(
    f"""<div class="zsp-banner">Across the current selection, citizens have logged
    <b>{kpi['total_requests']:,}</b> service requests and
    <b>{kpi['backlog']:,}</b> remain unresolved
    ({kpi['backlog_pct']:.1f}%). ZimServicePulse shows <b>where</b> that pressure
    is concentrated — and what to do about it.</div>""",
    unsafe_allow_html=True,
)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total requests", f"{kpi['total_requests']:,}",
          help="Sum of requests_received in the current selection.")
c2.metric("Unresolved backlog", f"{kpi['backlog']:,}",
          delta=f"{kpi['backlog_pct']:.1f}% of requests", delta_color="inverse",
          help="Sum of unresolved_backlog.")
c3.metric("Avg satisfaction", f"{kpi['satisfaction']:.2f} / 5",
          help="Weighted by request volume: Σ(satisfaction × requests) ÷ Σ(requests).")
c4.metric("Resolved on time", f"{kpi['on_time_pct']:.1f}%",
          help="Weighted by request volume: Σ(on-time % × requests) ÷ Σ(requests).")

# Month-over-month trend (respects current filters except when only one month left)
trend = month_trend(filtered)
if len(trend) >= 2:
    st.subheader("Month-over-month trend")
    t1, t2 = st.columns(2)
    with t1:
        fig_backlog = px.line(
            trend,
            x="month",
            y="unresolved_backlog",
            markers=True,
            labels={"month": "Month", "unresolved_backlog": "Unresolved backlog"},
        )
        fig_backlog.update_traces(line_color=ALERT, marker_color=ALERT)
        fig_backlog.update_layout(
            height=220, margin={"l": 0, "r": 10, "t": 10, "b": 0},
            yaxis_title="Backlog",
        )
        st.plotly_chart(fig_backlog, width="stretch")
    with t2:
        fig_quality = go.Figure()
        fig_quality.add_trace(
            go.Scatter(
                x=trend["month"], y=trend["on_time_pct"],
                mode="lines+markers", name="On time %",
                line={"color": PRIMARY},
            )
        )
        fig_quality.add_trace(
            go.Scatter(
                x=trend["month"], y=trend["satisfaction"] * 20,  # scale 0–5 → 0–100 for shared axis
                mode="lines+markers", name="Satisfaction (×20)",
                line={"color": "#E67E22", "dash": "dot"},
                hovertemplate="%{customdata:.2f}/5<extra>Satisfaction</extra>",
                customdata=trend["satisfaction"],
            )
        )
        fig_quality.update_layout(
            height=220, margin={"l": 0, "r": 10, "t": 10, "b": 0},
            yaxis_title="On time % / Satisfaction×20",
            legend={"orientation": "h", "y": 1.15},
        )
        st.plotly_chart(fig_quality, width="stretch")
    st.caption(
        "Satisfaction is shown ×20 so it can share the axis with on-time % "
        "(e.g. 3.5/5 → 70). Hover shows the true /5 value."
    )

# ============================================================ step 2
st.header("2 · Explore: hotspot map and rankings", anchor="step-2")
st.caption(
    "Bubble size = request volume · colour = pressure score "
    "(50% backlog + 25% late resolution + 25% low satisfaction). "
    "Red rings/halos mark districts in the **top quartile** of urgent backlog. "
    "Use the sidebar filters — everything on this page updates together."
)

map_col, charts_col = st.columns([3, 2], gap="medium")

with map_col:
    hover = {
        "province": True,
        "requests_received": ":,",
        "unresolved_backlog": ":,",
        "urgent_backlog": ":,",
        "urgent_flag": True,
        "satisfaction": ":.2f",
        "on_time_pct": ":.1f",
        "pressure_score": ":.0f",
        "latitude": False,
        "longitude": False,
        "has_urgent": False,
        "urgent_share": False,
    }
    if not offline_map:
        fig = px.scatter_map(
            districts_view,
            lat="latitude",
            lon="longitude",
            size="requests_received",
            color="pressure_score",
            color_continuous_scale=PRESSURE_SCALE,
            size_max=40,
            zoom=5.1,
            center={"lat": -19.0, "lon": 29.8},
            hover_name="district",
            hover_data=hover,
            map_style="open-street-map",
        )
        urgent = districts_view[districts_view["has_urgent"]]
        if not urgent.empty:
            fig.add_trace(
                go.Scattermap(
                    lat=urgent["latitude"],
                    lon=urgent["longitude"],
                    mode="markers",
                    marker={
                        "size": 24,
                        "color": ALERT,
                        "opacity": 0.4,
                    },
                    name="Urgent hotspot",
                    text=urgent["district"] + " — Urgent backlog: "
                    + urgent["urgent_backlog"].astype(str),
                    hoverinfo="text",
                    showlegend=True,
                )
            )
    else:
        fig = px.scatter(
            districts_view,
            x="longitude",
            y="latitude",
            size="requests_received",
            color="pressure_score",
            color_continuous_scale=PRESSURE_SCALE,
            size_max=40,
            hover_name="district",
            hover_data=hover,
        )
        if geojson:
            for feature in geojson["features"]:
                geom = feature["geometry"]
                polys = (
                    geom["coordinates"]
                    if geom["type"] == "MultiPolygon"
                    else [geom["coordinates"]]
                )
                for poly in polys:
                    lons, lats = zip(*poly[0])
                    fig.add_trace(
                        go.Scatter(
                            x=lons, y=lats, mode="lines",
                            line={"color": "#9AAABF", "width": 1},
                            hoverinfo="skip", showlegend=False,
                        )
                    )
        urgent = districts_view[districts_view["has_urgent"]]
        if not urgent.empty:
            fig.add_trace(
                go.Scatter(
                    x=urgent["longitude"],
                    y=urgent["latitude"],
                    mode="markers",
                    marker={
                        "size": 28,
                        "color": "rgba(0,0,0,0)",
                        "line": {"width": 2.5, "color": ALERT},
                        "symbol": "circle-open",
                    },
                    name="Urgent hotspot",
                    text=urgent["district"] + " — Urgent: "
                    + urgent["urgent_backlog"].astype(str),
                    hoverinfo="text",
                    showlegend=True,
                )
            )
        fig.update_xaxes(visible=False)
        fig.update_yaxes(visible=False, scaleanchor="x", scaleratio=1)
        fig.update_layout(plot_bgcolor="white")

    fig.update_layout(
        margin={"l": 0, "r": 0, "t": 0, "b": 0},
        height=520,
        coloraxis_colorbar={"title": "Pressure"},
        legend={"orientation": "h", "y": 1.02, "x": 0},
    )
    st.plotly_chart(fig, width="stretch")

with charts_col:
    tab_cat, tab_ch, tab_set = st.tabs(
        ["Service categories", "Channels", "Settlement types"]
    )

    with tab_cat:
        by_cat = group_summary(filtered, "service_category")
        fig_cat = px.bar(
            by_cat.sort_values("unresolved_backlog"),
            x="unresolved_backlog",
            y="service_category",
            orientation="h",
            color="unresolved_backlog",
            color_continuous_scale=PRESSURE_SCALE,
            labels={"unresolved_backlog": "Unresolved backlog", "service_category": ""},
        )
        fig_cat.update_layout(height=480, coloraxis_showscale=False,
                              margin={"l": 0, "r": 10, "t": 10, "b": 0})
        st.plotly_chart(fig_cat, width="stretch")

    with tab_ch:
        by_ch = group_summary(filtered, "primary_channel").sort_values("on_time_pct")
        fig_ch = px.bar(
            by_ch,
            x="on_time_pct",
            y="primary_channel",
            orientation="h",
            color="satisfaction",
            color_continuous_scale=[[0, ALERT], [1, PRIMARY]],
            labels={
                "on_time_pct": "Resolved on time (%)",
                "primary_channel": "",
                "satisfaction": "Satisfaction",
            },
        )
        fig_ch.update_layout(height=480, margin={"l": 0, "r": 10, "t": 10, "b": 0})
        st.plotly_chart(fig_ch, width="stretch")

    with tab_set:
        by_set = group_summary(filtered, "settlement_type")
        fig_set = px.bar(
            by_set.sort_values("unresolved_backlog"),
            x="unresolved_backlog",
            y="settlement_type",
            orientation="h",
            color="satisfaction",
            color_continuous_scale=[[0, ALERT], [1, PRIMARY]],
            labels={
                "unresolved_backlog": "Unresolved backlog",
                "settlement_type": "",
                "satisfaction": "Satisfaction",
            },
        )
        fig_set.update_layout(height=480, margin={"l": 0, "r": 10, "t": 10, "b": 0})
        st.plotly_chart(fig_set, width="stretch")

st.subheader("Top pressure districts")
urgent_count = int(districts_view["has_urgent"].sum())
st.caption(
    f"{urgent_count} of {len(districts_view)} districts are in the **top quartile** "
    f"for unresolved Urgent backlog (Status = Urgent)."
)
table = districts_view.head(10)[
    ["urgent_flag", "district", "province", "settlement_type", "requests_received",
     "unresolved_backlog", "urgent_backlog", "satisfaction", "on_time_pct",
     "pressure_score"]
]
st.dataframe(
    table,
    hide_index=True,
    width="stretch",
    column_config={
        "urgent_flag": st.column_config.TextColumn("Status", width="small"),
        "district": "District",
        "province": "Province",
        "settlement_type": "Settlement",
        "requests_received": st.column_config.NumberColumn("Requests", format="localized"),
        "unresolved_backlog": st.column_config.NumberColumn("Backlog", format="localized"),
        "urgent_backlog": st.column_config.NumberColumn("Urgent backlog", format="localized"),
        "satisfaction": st.column_config.NumberColumn("Satisfaction", format="%.2f"),
        "on_time_pct": st.column_config.NumberColumn("On time %", format="%.1f"),
        "pressure_score": st.column_config.ProgressColumn(
            "Pressure", min_value=0, max_value=100, format="%.0f"
        ),
    },
)

# --- District drill-down ---
st.subheader("District drill-down")
st.caption(
    "Pick a district to inspect its local KPIs, service mix, and channel performance. "
    "Selection stays inside the current filter scope."
)
district_options = districts_view["district"].tolist()
drill_district = st.selectbox(
    "District",
    options=["— Select a district —"] + district_options,
    key="drill_district",
)

if drill_district != "— Select a district —":
    drill_df = filtered[filtered["district"] == drill_district]
    drill_kpi = kpis(drill_df)
    drill_meta = districts_view.loc[
        districts_view["district"] == drill_district
    ].iloc[0]

    st.markdown(
        f"**{drill_district}** · {drill_meta['province']} · "
        f"{drill_meta['settlement_type']}"
        + (
            f" · <span class='zsp-badge-high'>URGENT</span>"
            f"{int(drill_meta['urgent_backlog']):,} urgent unresolved"
            if drill_meta["has_urgent"]
            else ""
        ),
        unsafe_allow_html=True,
    )
    d1, d2, d3, d4, d5 = st.columns(5)
    d1.metric("Requests", f"{drill_kpi['total_requests']:,}")
    d2.metric("Backlog", f"{drill_kpi['backlog']:,}",
              delta=f"{drill_kpi['backlog_pct']:.1f}%", delta_color="inverse")
    d3.metric("Satisfaction", f"{drill_kpi['satisfaction']:.2f} / 5")
    d4.metric("On time", f"{drill_kpi['on_time_pct']:.1f}%")
    d5.metric("Pressure score", f"{drill_meta['pressure_score']:.0f}")

    dc1, dc2 = st.columns(2)
    with dc1:
        by_cat = group_summary(drill_df, "service_category")
        fig_dcat = px.bar(
            by_cat.sort_values("unresolved_backlog"),
            x="unresolved_backlog",
            y="service_category",
            orientation="h",
            color="unresolved_backlog",
            color_continuous_scale=PRESSURE_SCALE,
            labels={"unresolved_backlog": "Backlog", "service_category": ""},
            title="Backlog by service category",
        )
        fig_dcat.update_layout(
            height=320, coloraxis_showscale=False,
            margin={"l": 0, "r": 10, "t": 40, "b": 0},
        )
        st.plotly_chart(fig_dcat, width="stretch")
    with dc2:
        by_ch = group_summary(drill_df, "primary_channel").sort_values("on_time_pct")
        fig_dch = px.bar(
            by_ch,
            x="on_time_pct",
            y="primary_channel",
            orientation="h",
            color="satisfaction",
            color_continuous_scale=[[0, ALERT], [1, PRIMARY]],
            labels={
                "on_time_pct": "On time %",
                "primary_channel": "",
                "satisfaction": "Satisfaction",
            },
            title="Channel on-time performance",
        )
        fig_dch.update_layout(height=320, margin={"l": 0, "r": 10, "t": 40, "b": 0})
        st.plotly_chart(fig_dch, width="stretch")

# ============================================================ step 3
st.header("3 · Key insights", anchor="step-3")
st.caption(f"Auto-generated from the filtered data · scope: {scope}")

insight_list = insights_engine.generate(filtered)
if not insight_list:
    st.info("No rule-based insights fire for this selection — widen the filters.")
else:
    cols = st.columns(min(3, len(insight_list)))
    for i, ins in enumerate(insight_list):
        with cols[i % len(cols)].container(border=True):
            st.markdown(
                f'<span class="zsp-badge-{ins.severity}">{ins.severity.upper()}</span>'
                f"**{ins.title}**",
                unsafe_allow_html=True,
            )
            st.markdown(ins.body)

# ============================================================ step 4
st.header("4 · Recommended actions", anchor="step-4")

if insight_list:
    focus_label = st.selectbox(
        "What-if: prioritise actions by focus",
        options=list(insights_engine.FOCUS_OPTIONS.keys()),
        key="action_focus",
        help="Reorders the same data-driven actions so you can explore "
        "different operational priorities. Does not invent new actions.",
    )
    high_only = st.toggle("Show high-priority actions only", value=False, key="high_only")
    focus_kind = insights_engine.FOCUS_OPTIONS[focus_label]
    ranked = insights_engine.prioritise(insight_list, focus_kind)
    if high_only:
        ranked = [ins for ins in ranked if ins.severity == "high"]

    if focus_kind:
        st.caption(
            f"Focus active: **{focus_label}** — matching actions move to the top. "
            "Numbers stay identical; only the order changes."
        )

    if not ranked:
        st.info("No high-priority actions in this selection — turn off the filter to see all.")
    else:
        for i, ins in enumerate(ranked, 1):
            with st.container(border=True):
                badge = "HIGH PRIORITY" if ins.severity == "high" else "MEDIUM PRIORITY"
                focus_note = (
                    f' <span class="zsp-badge-medium">FOCUS MATCH</span>'
                    if focus_kind and ins.kind == focus_kind
                    else ""
                )
                st.markdown(
                    f'<span class="zsp-badge-{ins.severity}">{badge}</span>'
                    f"{focus_note}"
                    f"**{i}. {ins.action_title}**",
                    unsafe_allow_html=True,
                )
                st.markdown(ins.action_body)
else:
    ranked = []
    focus_label = "Balanced (default severity)"
    st.info("Actions appear once insights are available for the selection.")

st.subheader("Export")
d1, d2, d3 = st.columns(3)
d1.download_button(
    "Download filtered data (CSV)",
    filtered.to_csv(index=False).encode(),
    file_name="zimservicepulse_filtered.csv",
    mime="text/csv",
    width="stretch",
)
d2.download_button(
    "Download summary (Markdown)",
    insights_engine.to_markdown(ranked or insight_list, kpi, scope),
    file_name="zimservicepulse_summary.md",
    mime="text/markdown",
    width="stretch",
)
d3.download_button(
    "Download briefing (PDF)",
    insights_engine.to_pdf(ranked or insight_list, kpi, scope, focus_label),
    file_name="zimservicepulse_briefing.pdf",
    mime="application/pdf",
    width="stretch",
)

st.caption(
    "All figures computed live from data/01_public_service_requests.csv — "
    "nothing is hardcoded. Metric definitions: BRIEF.md §6."
)
