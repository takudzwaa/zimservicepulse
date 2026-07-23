"""Cached, validated loading of the official AI4I dataset.

All numbers shown in the app trace back to this single CSV. If the file is
missing or malformed we fail loudly rather than substitute fabricated data.
"""

from pathlib import Path

import json
import pandas as pd
import streamlit as st

DATA_PATH = Path(__file__).parent / "data" / "01_public_service_requests.csv"
GEOJSON_PATH = Path(__file__).parent / "assets" / "zw_provinces.geojson"

# Rough bounding box of Zimbabwe; rows outside are excluded from the map.
LAT_BOUNDS = (-22.5, -15.5)
LON_BOUNDS = (25.2, 33.1)

NUMERIC_COLS = {
    "latitude": float,
    "longitude": float,
    "requests_received": int,
    "requests_resolved": int,
    "avg_resolution_days": float,
    "pct_resolved_on_time": float,
    "unresolved_backlog": int,
    "citizen_satisfaction_1_5": float,
}

CATEGORICAL_COLS = [
    "month",
    "province",
    "district",
    "settlement_type",
    "service_category",
    "primary_channel",
    "priority_flag",
]

PRIORITY_ORDER = ["Urgent", "Watch", "Normal"]


@st.cache_data(show_spinner="Loading service request data…")
def load_data() -> tuple[pd.DataFrame, int]:
    """Return (clean dataframe, number of rows excluded by validation)."""
    if not DATA_PATH.exists():
        st.error(
            f"Dataset not found at `{DATA_PATH}`. Place the official "
            "`01_public_service_requests.csv` in the `data/` folder and reload."
        )
        st.stop()

    df = pd.read_csv(DATA_PATH)

    missing = (set(CATEGORICAL_COLS) | set(NUMERIC_COLS)) - set(df.columns)
    if missing:
        st.error(f"Dataset is missing expected columns: {sorted(missing)}")
        st.stop()

    for col in CATEGORICAL_COLS:
        df[col] = df[col].astype(str).str.strip()

    for col in NUMERIC_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    before = len(df)
    df = df.dropna(subset=list(NUMERIC_COLS))
    df = df[
        df["latitude"].between(*LAT_BOUNDS)
        & df["longitude"].between(*LON_BOUNDS)
        & (df["requests_received"] >= 0)
    ]
    excluded = before - len(df)

    df["month"] = pd.Categorical(df["month"], sorted(df["month"].unique()), ordered=True)
    return df.reset_index(drop=True), excluded


@st.cache_data
def load_province_geojson() -> dict | None:
    """Province outlines used by the offline map fallback."""
    if not GEOJSON_PATH.exists():
        return None
    with open(GEOJSON_PATH) as f:
        return json.load(f)
