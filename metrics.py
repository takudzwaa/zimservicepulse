"""Weighted KPI and pressure-score computations.

Every row of the dataset is an aggregate, so satisfaction and on-time rates
are weighted by request volume — naive row means would let a district with
five requests skew national figures. Formulas are documented in BRIEF.md §6.
"""

import numpy as np
import pandas as pd


def weighted_mean(df: pd.DataFrame, value_col: str, weight_col: str = "requests_received") -> float:
    weights = df[weight_col]
    if weights.sum() == 0:
        return float("nan")
    return float(np.average(df[value_col], weights=weights))


def kpis(df: pd.DataFrame) -> dict:
    total = int(df["requests_received"].sum())
    backlog = int(df["unresolved_backlog"].sum())
    return {
        "total_requests": total,
        "backlog": backlog,
        "backlog_pct": backlog / total * 100 if total else float("nan"),
        "resolution_rate": (
            df["requests_resolved"].sum() / total * 100 if total else float("nan")
        ),
        "satisfaction": weighted_mean(df, "citizen_satisfaction_1_5"),
        "on_time_pct": weighted_mean(df, "pct_resolved_on_time"),
    }


def _minmax(s: pd.Series) -> pd.Series:
    rng = s.max() - s.min()
    if rng == 0 or pd.isna(rng):
        return pd.Series(0.0, index=s.index)
    return (s - s.min()) / rng


def district_summary(df: pd.DataFrame) -> pd.DataFrame:
    """One row per district with weighted KPIs and a 0-100 pressure score.

    Pressure score = 50% backlog share + 25% (1 - on-time) + 25% (1 - satisfaction),
    each component min-max normalised across the districts in view.
    """
    groups = []
    for (district, province), g in df.groupby(["district", "province"], observed=True):
        groups.append(
            {
                "district": district,
                "province": province,
                "settlement_type": g["settlement_type"].mode().iat[0],
                "latitude": g["latitude"].mean(),
                "longitude": g["longitude"].mean(),
                "requests_received": int(g["requests_received"].sum()),
                "unresolved_backlog": int(g["unresolved_backlog"].sum()),
                "satisfaction": weighted_mean(g, "citizen_satisfaction_1_5"),
                "on_time_pct": weighted_mean(g, "pct_resolved_on_time"),
                "avg_resolution_days": weighted_mean(g, "avg_resolution_days"),
                "urgent_backlog": int(
                    g.loc[g["priority_flag"] == "Urgent", "unresolved_backlog"].sum()
                ),
            }
        )
    out = pd.DataFrame(groups)
    if out.empty:
        return out

    out["pressure_score"] = (
        0.50 * _minmax(out["unresolved_backlog"])
        + 0.25 * _minmax(100 - out["on_time_pct"])
        + 0.25 * _minmax(5 - out["satisfaction"])
    ) * 100
    out["urgent_share"] = (
        out["urgent_backlog"] / out["unresolved_backlog"].replace(0, pd.NA) * 100
    ).fillna(0.0)
    # Highlight the worst urgent concentrations (top quartile in the current view),
    # not every district that has any urgent case — otherwise the map lights up fully.
    if out["urgent_backlog"].gt(0).any():
        threshold = float(out["urgent_backlog"].quantile(0.75))
        out["has_urgent"] = out["urgent_backlog"] >= max(threshold, 1)
    else:
        out["has_urgent"] = False
    out["urgent_flag"] = out["has_urgent"].map({True: "Urgent", False: "—"})
    return out.sort_values("pressure_score", ascending=False).reset_index(drop=True)


def month_trend(df: pd.DataFrame) -> pd.DataFrame:
    """One row per month with weighted KPIs for sparkline / trend charts."""
    rows = []
    for month, g in df.groupby("month", observed=True, sort=True):
        k = kpis(g)
        rows.append(
            {
                "month": str(month),
                "requests_received": k["total_requests"],
                "unresolved_backlog": k["backlog"],
                "satisfaction": k["satisfaction"],
                "on_time_pct": k["on_time_pct"],
            }
        )
    return pd.DataFrame(rows)


def group_summary(df: pd.DataFrame, by: str) -> pd.DataFrame:
    """Weighted KPI summary grouped by an arbitrary categorical column."""
    rows = []
    for key, g in df.groupby(by, observed=True):
        rows.append(
            {
                by: key,
                "requests_received": int(g["requests_received"].sum()),
                "unresolved_backlog": int(g["unresolved_backlog"].sum()),
                "satisfaction": weighted_mean(g, "citizen_satisfaction_1_5"),
                "on_time_pct": weighted_mean(g, "pct_resolved_on_time"),
                "avg_resolution_days": weighted_mean(g, "avg_resolution_days"),
            }
        )
    return pd.DataFrame(rows).sort_values("unresolved_backlog", ascending=False)
