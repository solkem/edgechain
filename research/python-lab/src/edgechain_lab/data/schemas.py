"""Typed data models for EdgeChain Python Lab artifacts."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class SiteType(StrEnum):
    """Synthetic pilot site type."""

    HARDWARE = "hardware"
    WHATSAPP = "whatsapp"


class ScenarioName(StrEnum):
    """Named synthetic experiment scenario."""

    HONEST_BASELINE = "honest_baseline"
    LEGITIMATE_NONIID_DIVERGENCE = "legitimate_noniid_divergence"
    SINGLE_ADVERSARY = "single_adversary"
    TWO_ADVERSARIES = "two_adversaries"
    INVALID_ATTESTATION = "invalid_attestation"
    COLLUDING_MAJORITY = "colluding_majority"
    SENSOR_FAILURE = "sensor_failure"
    OFF_GRID_DROPOUT = "off_grid_dropout"
    CALIBRATION_DRIFT = "calibration_drift"


class MarsAction(StrEnum):
    """MARS action assigned to a contribution."""

    ACCEPT = "accept"
    FLAG = "flag"
    REJECT = "reject"
    SKIP_ROUND = "skip_round"


class KnownFailureMode(StrEnum):
    """Known limitation or structured failure mode."""

    COLLUDING_MAJORITY = "COLLUDING_MAJORITY"
    KRUM_PRECONDITION_VIOLATED = "KRUM_PRECONDITION_VIOLATED"
    INSUFFICIENT_ELIGIBLE_CLIENTS = "INSUFFICIENT_ELIGIBLE_CLIENTS"
    CALIBRATION_DRIFT_UNDETECTED = "CALIBRATION_DRIFT_UNDETECTED"


class OversightLabel(StrEnum):
    """Labels used for LLM oversight evaluation."""

    NORMAL = "normal"
    DEVICE_FAILURE = "device_failure"
    NON_IID_DIVERGENCE = "non_iid_divergence"
    CALIBRATION_DRIFT = "calibration_drift"
    SUSPICIOUS = "suspicious"
    COLLUSION_LIKELY = "collusion_likely"
    SKIP_ROUND = "skip_round"


class LLMProvider(StrEnum):
    """Supported live LLM providers."""

    ANTHROPIC = "anthropic"


class FarmSite(BaseModel):
    """Synthetic farm site metadata."""

    site_id: str
    site_type: SiteType
    x_km: float
    y_km: float
    elevation_m: float
    soil_type: Literal["clay", "sandy_loam", "loam", "silty"]
    crop_type: Literal["horticulture", "tobacco", "maize"]
    cluster_id: str


class SensorReading(BaseModel):
    """One synthetic sensor/manual observation."""

    scenario: ScenarioName
    round_id: int
    site_id: str
    site_type: SiteType
    timestamp: datetime
    soil_temp_c: float | None
    soil_moisture: float | None
    air_temp_c: float | None
    humidity: float | None
    pressure_hpa: float | None
    lux: float | None
    rain: int | None
    is_observed: bool
    failure_code: str | None = None


class ClientUpdate(BaseModel):
    """Model update submitted by one client in one FL round."""

    round_id: int
    site_id: str
    scenario: ScenarioName
    update_vector: list[float]
    dataset_size: int
    has_valid_attestation: bool
    true_label: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class MarsScore(BaseModel):
    """MARS dimension and composite scores."""

    round_id: int
    site_id: str
    has_score: float
    physical_plausibility: float
    spatial_jury: float
    temporal_consistency: float
    gradient_norm_bounds: float
    composite: float
    action: MarsAction
    eligible_for_reward: bool

    @field_validator(
        "has_score",
        "physical_plausibility",
        "spatial_jury",
        "temporal_consistency",
        "gradient_norm_bounds",
        "composite",
    )
    @classmethod
    def score_must_be_probability(cls, value: float) -> float:
        if not 0.0 <= value <= 1.0:
            raise ValueError("score must be in [0.0, 1.0]")
        return value

    @model_validator(mode="after")
    def failed_attestation_forces_zero_composite(self) -> MarsScore:
        if self.has_score == 0.0 and self.composite != 0.0:
            raise ValueError("has_score == 0.0 must force composite == 0.0")
        return self


class RoundReport(BaseModel):
    """Full evaluation report, including hidden fields not visible to the LLM monitor."""

    scenario: ScenarioName
    round_id: int
    seed: int
    n_clients: int
    n_accepted: int
    n_flagged: int
    n_rejected: int
    aggregation_method: str
    mars_scores: list[MarsScore]
    reward_gini: float
    model_metrics: dict[str, float]
    detected_collusion: bool = False
    known_failure_mode: KnownFailureMode | None = None


class VisibleMarsScore(BaseModel):
    """MARS score visible to an oversight monitor."""

    site_id: str
    has_score: float
    physical_plausibility: float
    spatial_jury: float
    temporal_consistency: float
    gradient_norm_bounds: float
    composite: float
    action: MarsAction


class VisibleRoundReport(BaseModel):
    """Monitor-visible report with ground truth deliberately excluded."""

    round_id: int
    n_clients: int
    n_accepted: int
    n_flagged: int
    n_rejected: int
    aggregation_method: str
    mars_scores: list[VisibleMarsScore]
    reward_gini: float
    cluster_summary: dict[str, float]
    historical_trend: list[dict[str, float]]
    visible_failure_summary: dict[str, int] = Field(default_factory=dict)


class OversightCase(BaseModel):
    """One monitor evaluation case."""

    case_id: str
    scenario: ScenarioName
    seed: int
    visible_round_report: VisibleRoundReport
    ground_truth_label: OversightLabel


class LLMRunMetadata(BaseModel):
    """Reproducibility metadata for live LLM calls."""

    provider: LLMProvider
    model: str
    temperature: float
    max_tokens: int
    prompt_hash: str
    date: str

    @field_validator("model")
    @classmethod
    def model_must_include_version(cls, value: str) -> str:
        if not any(char.isdigit() for char in value):
            raise ValueError("Use full model ID with version/date")
        return value
