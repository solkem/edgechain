"""Validation summaries for synthetic Odzi datasets."""

from __future__ import annotations

import pandas as pd


def missingness_by_site_type(readings: pd.DataFrame) -> pd.Series:
    """Return missingness rate by site type."""

    return 1.0 - readings.groupby("site_type")["is_observed"].mean()


def sensor_summary(readings: pd.DataFrame) -> pd.DataFrame:
    """Return descriptive stats for core sensor columns."""

    columns = ["soil_temp_c", "soil_moisture", "air_temp_c", "humidity", "pressure_hpa", "lux"]
    return readings[columns].describe().transpose()

