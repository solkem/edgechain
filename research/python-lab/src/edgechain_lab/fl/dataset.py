"""PyTorch datasets and feature extraction for synthetic EdgeChain readings."""

from __future__ import annotations

import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset

from edgechain_lab.data.schemas import ScenarioName

LABEL_TO_ID = {
    "normal": 0,
    "sensor_failure": 1,
    "physical_impossible": 2,
    "distribution_shift": 3,
}
ID_TO_LABEL = {value: key for key, value in LABEL_TO_ID.items()}


class SensorDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    """Torch dataset for sensor anomaly classification."""

    def __init__(self, features: torch.Tensor, labels: torch.Tensor) -> None:
        if len(features) != len(labels):
            raise ValueError("features and labels must have the same length")
        self.features = features.float()
        self.labels = labels.long()

    def __len__(self) -> int:
        return int(self.features.shape[0])

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        return self.features[idx], self.labels[idx]


def featurize_readings(readings: pd.DataFrame) -> tuple[torch.Tensor, torch.Tensor]:
    """Convert readings to normalized feature and label tensors."""

    rows = readings[readings["is_observed"]].copy()
    if rows.empty:
        raise ValueError("cannot featurize an empty observed dataset")

    features = np.column_stack(
        [
            _normalize(rows["soil_temp_c"].to_numpy(dtype=float), 8.0, 42.0),
            _normalize(rows["soil_moisture"].to_numpy(dtype=float), 0.05, 0.95),
            _normalize(rows["air_temp_c"].to_numpy(dtype=float), 12.0, 38.0),
            _normalize(rows["humidity"].to_numpy(dtype=float), 0.0, 100.0),
            _normalize(rows["pressure_hpa"].to_numpy(dtype=float), 895.0, 925.0),
            _normalize(rows["lux"].to_numpy(dtype=float), 0.0, 110_000.0),
            rows["rain"].to_numpy(dtype=float),
        ]
    )
    labels = np.array([LABEL_TO_ID[_label_row(row)] for _, row in rows.iterrows()], dtype=np.int64)
    return torch.tensor(features, dtype=torch.float32), torch.tensor(labels, dtype=torch.long)


def dataset_for_site(readings: pd.DataFrame, site_id: str) -> SensorDataset:
    """Build a `SensorDataset` for one site."""

    features, labels = featurize_readings(readings[readings["site_id"] == site_id])
    return SensorDataset(features, labels)


def _normalize(values: np.ndarray, low: float, high: float) -> np.ndarray:
    return np.clip((values - low) / (high - low), 0.0, 1.0)


def _label_row(row: pd.Series) -> str:
    failure_code = row.get("failure_code")
    if isinstance(failure_code, str) and failure_code:
        return "sensor_failure"

    if (
        row["soil_temp_c"] < 8.0
        or row["soil_temp_c"] > 42.0
        or row["soil_moisture"] < 0.05
        or row["soil_moisture"] > 0.95
        or row["air_temp_c"] < 12.0
        or row["air_temp_c"] > 38.0
    ):
        return "physical_impossible"

    if row["scenario"] in {
        ScenarioName.CALIBRATION_DRIFT.value,
        ScenarioName.LEGITIMATE_NONIID_DIVERGENCE.value,
    }:
        return "distribution_shift"

    return "normal"

