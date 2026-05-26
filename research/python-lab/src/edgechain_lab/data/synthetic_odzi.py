"""Synthetic Odzi-like microclimate data generation."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal, cast

import numpy as np
import pandas as pd

from edgechain_lab.config import ReliabilityConfig
from edgechain_lab.data.schemas import FarmSite, ScenarioName, SiteType

SOIL_TEMP_C = (8.0, 42.0)
SOIL_MOISTURE = (0.05, 0.95)
AIR_TEMP_C = (12.0, 38.0)
PRESSURE_HPA = (895.0, 925.0)
LUX = (0.0, 110_000.0)


def build_default_sites(seed: int = 42) -> list[FarmSite]:
    """Build the seven synthetic Phase A pilot sites."""

    rng = np.random.default_rng(seed)
    site_specs: list[
        tuple[
            str,
            SiteType,
            str,
            Literal["clay", "sandy_loam", "loam", "silty"],
            Literal["horticulture", "tobacco", "maize"],
        ]
    ] = [
        ("site-001", SiteType.HARDWARE, "A", "loam", "horticulture"),
        ("site-002", SiteType.WHATSAPP, "A", "sandy_loam", "horticulture"),
        ("site-003", SiteType.WHATSAPP, "A", "loam", "horticulture"),
        ("site-004", SiteType.WHATSAPP, "B", "clay", "horticulture"),
        ("site-005", SiteType.WHATSAPP, "B", "silty", "maize"),
        ("site-006", SiteType.WHATSAPP, "C", "clay", "tobacco"),
        ("site-007", SiteType.WHATSAPP, "C", "sandy_loam", "tobacco"),
    ]

    cluster_centers = {
        "A": np.array([0.45, 0.55]),
        "B": np.array([1.55, 1.25]),
        "C": np.array([2.45, 2.25]),
    }

    sites: list[FarmSite] = []
    for site_id, site_type, cluster_id, soil_type, crop_type in site_specs:
        xy = cluster_centers[cluster_id] + rng.normal(0.0, 0.12, size=2)
        elevation = 990.0 + (xy[1] * 18.0) + rng.normal(0.0, 4.0)
        sites.append(
            FarmSite(
                site_id=site_id,
                site_type=site_type,
                x_km=float(np.clip(xy[0], 0.0, 3.0)),
                y_km=float(np.clip(xy[1], 0.0, 3.0)),
                elevation_m=float(elevation),
                soil_type=soil_type,
                crop_type=crop_type,
                cluster_id=cluster_id,
            )
        )
    return sites


def generate_readings(
    sites: list[FarmSite],
    scenario: ScenarioName,
    n_rounds: int,
    seed: int,
    reliability: ReliabilityConfig | None = None,
) -> pd.DataFrame:
    """Generate synthetic readings for the requested scenario."""

    if n_rounds <= 0:
        raise ValueError("n_rounds must be positive")

    reliability = reliability or ReliabilityConfig()
    rng = np.random.default_rng(seed)
    start = datetime(2026, 5, 26, tzinfo=UTC)
    rows: list[dict[str, object]] = []

    global_weather = _global_weather_series(n_rounds, rng)
    cluster_weather = {
        cluster_id: _global_weather_series(n_rounds, rng) * 0.7 for cluster_id in {"A", "B", "C"}
    }

    for round_id in range(n_rounds):
        timestamp = start + timedelta(hours=round_id)
        for site in sites:
            weather = global_weather[round_id] + cluster_weather[site.cluster_id][round_id]
            row = _site_reading(site, scenario, round_id, timestamp, weather, rng)
            _apply_observation_model(row, site, reliability, rng)
            rows.append(row)

    return pd.DataFrame(rows)


def _global_weather_series(n_rounds: int, rng: np.random.Generator) -> np.ndarray:
    """Generate temporally autocorrelated shared weather factors."""

    factors = np.zeros((n_rounds, 4), dtype=float)
    factors[0] = rng.normal(0.0, 1.0, size=4)
    for idx in range(1, n_rounds):
        factors[idx] = 0.82 * factors[idx - 1] + rng.normal(0.0, 0.55, size=4)
    return factors


def _site_reading(
    site: FarmSite,
    scenario: ScenarioName,
    round_id: int,
    timestamp: datetime,
    weather: np.ndarray,
    rng: np.random.Generator,
) -> dict[str, object]:
    soil_offset = {
        "clay": (-0.8, 0.08),
        "sandy_loam": (0.6, -0.07),
        "loam": (0.0, 0.02),
        "silty": (-0.3, 0.04),
    }[site.soil_type]
    crop_moisture = {"horticulture": 0.04, "maize": 0.0, "tobacco": -0.03}[site.crop_type]
    elevation_cooling = (site.elevation_m - 1000.0) * -0.006
    spatial = _spatial_factor(site)
    hour_angle = 2.0 * np.pi * (round_id % 24) / 24.0

    air_temp = 25.0 + 6.0 * np.sin(hour_angle - 0.8) + weather[0] * 1.6 + elevation_cooling
    air_temp += spatial * 0.8 + rng.normal(0.0, 0.45)
    soil_temp = air_temp - 2.3 + soil_offset[0] + weather[1] * 0.6 + rng.normal(0.0, 0.35)
    humidity = 62.0 - (air_temp - 25.0) * 1.4 + weather[2] * 4.0 + rng.normal(0.0, 2.0)
    moisture = 0.48 + soil_offset[1] + crop_moisture + weather[3] * 0.035
    moisture += -0.0025 * max(air_temp - 28.0, 0.0) + rng.normal(0.0, 0.025)
    pressure = 1013.25 * (1.0 - 2.25577e-5 * site.elevation_m) ** 5.25588
    pressure += weather[2] * 1.1 + rng.normal(0.0, 0.45)
    daylight = max(0.0, np.sin(hour_angle))
    lux = daylight * (78_000.0 + weather[0] * 3_000.0) + rng.normal(0.0, 1_500.0)
    rain = int(weather[3] > 1.1 or (humidity > 80 and rng.random() < 0.18))

    row: dict[str, object] = {
        "scenario": scenario.value,
        "round_id": round_id,
        "site_id": site.site_id,
        "site_type": site.site_type.value,
        "timestamp": timestamp,
        "soil_temp_c": float(np.clip(soil_temp, *SOIL_TEMP_C)),
        "soil_moisture": float(np.clip(moisture, *SOIL_MOISTURE)),
        "air_temp_c": float(np.clip(air_temp, *AIR_TEMP_C)),
        "humidity": float(np.clip(humidity, 20.0, 100.0)),
        "pressure_hpa": float(np.clip(pressure, *PRESSURE_HPA)),
        "lux": float(np.clip(lux, *LUX)),
        "rain": rain,
        "is_observed": True,
        "failure_code": None,
        "x_km": site.x_km,
        "y_km": site.y_km,
        "cluster_id": site.cluster_id,
    }

    _apply_scenario(row, site, scenario, round_id, rng)
    return row


def _spatial_factor(site: FarmSite) -> float:
    distance_from_origin = float(np.sqrt(site.x_km**2 + site.y_km**2))
    return float(np.exp(-distance_from_origin / 1.0))


def _apply_scenario(
    row: dict[str, object],
    site: FarmSite,
    scenario: ScenarioName,
    round_id: int,
    rng: np.random.Generator,
) -> None:
    if (
        scenario == ScenarioName.SENSOR_FAILURE
        and site.site_type == SiteType.HARDWARE
        and round_id % 6 == 0
    ):
        row["soil_temp_c"] = -127.0
        row["failure_code"] = "ds18b20_missing_pullup"

    if scenario == ScenarioName.LEGITIMATE_NONIID_DIVERGENCE and site.cluster_id == "C":
        row["soil_moisture"] = float(np.clip(_as_float(row["soil_moisture"]) - 0.14, 0.05, 0.95))
        row["air_temp_c"] = float(np.clip(_as_float(row["air_temp_c"]) + 2.2, 12.0, 38.0))

    if scenario == ScenarioName.CALIBRATION_DRIFT and site.site_id in {"site-004", "site-005"}:
        drift = min(round_id * 0.015, 0.25)
        row["soil_moisture"] = float(np.clip(_as_float(row["soil_moisture"]) + drift, 0.05, 0.95))

    if (
        scenario == ScenarioName.OFF_GRID_DROPOUT
        and site.site_type == SiteType.HARDWARE
        and rng.random() < 0.15
    ):
        row["is_observed"] = False


def _apply_observation_model(
    row: dict[str, object],
    site: FarmSite,
    reliability: ReliabilityConfig,
    rng: np.random.Generator,
) -> None:
    missing_probability = 0.04 if site.site_type == SiteType.HARDWARE else 0.18
    if site.site_type == SiteType.HARDWARE:
        missing_probability += 1.0 - reliability.lora_delivery_rate
        missing_probability += reliability.battery_low_dropout_probability
    else:
        row["timestamp"] = _as_datetime(row["timestamp"]) + timedelta(
            hours=reliability.whatsapp_delay_hours
        )

    missing_probability += reliability.outage_probability

    if rng.random() < min(missing_probability, 1.0):
        row["is_observed"] = False

    if not bool(row["is_observed"]):
        for key in (
            "soil_temp_c",
            "soil_moisture",
            "air_temp_c",
            "humidity",
            "pressure_hpa",
            "lux",
            "rain",
        ):
            row[key] = None
        row["failure_code"] = row["failure_code"] or "missing_observation"
        return

    if site.site_type == SiteType.WHATSAPP:
        row["soil_temp_c"] = round(_as_float(row["soil_temp_c"]), 1)
        row["soil_moisture"] = round(_as_float(row["soil_moisture"]), 2)
        row["air_temp_c"] = round(_as_float(row["air_temp_c"]), 1)
        row["humidity"] = round(_as_float(row["humidity"]))
        row["pressure_hpa"] = round(_as_float(row["pressure_hpa"]), 1)
        row["lux"] = round(_as_float(row["lux"]) / 500.0) * 500.0


def _as_float(value: object) -> float:
    return float(cast(float, value))


def _as_datetime(value: object) -> datetime:
    return cast(datetime, value)
