"""Deterministic baseline oversight monitor."""

from __future__ import annotations

from pydantic import BaseModel, Field

from edgechain_lab.data.schemas import OversightLabel, VisibleRoundReport


class HeuristicMonitorConfig(BaseModel):
    """Configurable deterministic monitor thresholds."""

    rejection_rate_threshold: float = Field(default=0.40, ge=0.0, le=1.0)
    sjs_gap_threshold: float = Field(default=0.25, ge=0.0, le=1.0)
    min_group_size_for_gap: int = Field(default=2, ge=1)
    min_eligible_clients: int = Field(default=3, ge=1)


class HeuristicResult(BaseModel):
    """Monitor result."""

    label: OversightLabel
    confidence: float
    rationale: str
    recommended_action: str


def run_heuristic_monitor(
    report: VisibleRoundReport,
    config: HeuristicMonitorConfig | None = None,
) -> HeuristicResult:
    """Classify a visible report with deterministic rules."""

    config = config or HeuristicMonitorConfig()
    rejection_rate = report.n_rejected / max(report.n_clients, 1)
    eligible = report.n_accepted + report.n_flagged

    if eligible < config.min_eligible_clients:
        return HeuristicResult(
            label=OversightLabel.SKIP_ROUND,
            confidence=0.85,
            rationale="Fewer than the minimum eligible clients remain.",
            recommended_action="skip_round",
        )

    if rejection_rate > config.rejection_rate_threshold:
        return HeuristicResult(
            label=OversightLabel.SUSPICIOUS,
            confidence=0.75,
            rationale="High rejection rate in a small-client round.",
            recommended_action="investigate",
        )

    if _sjs_is_bimodal(report, config):
        return HeuristicResult(
            label=OversightLabel.COLLUSION_LIKELY,
            confidence=0.65,
            rationale="Spatial jury scores split into two separated groups.",
            recommended_action="investigate",
        )

    if report.n_flagged > report.n_accepted:
        return HeuristicResult(
            label=OversightLabel.SUSPICIOUS,
            confidence=0.55,
            rationale="More clients were flagged than accepted.",
            recommended_action="review",
        )

    return HeuristicResult(
        label=OversightLabel.NORMAL,
        confidence=0.60,
        rationale="No deterministic warning rule fired.",
        recommended_action="proceed",
    )


def _sjs_is_bimodal(report: VisibleRoundReport, config: HeuristicMonitorConfig) -> bool:
    values = sorted(score.spatial_jury for score in report.mars_scores)
    if len(values) < config.min_group_size_for_gap * 2:
        return False

    best_gap = 0.0
    best_index = 0
    for index in range(len(values) - 1):
        gap = values[index + 1] - values[index]
        if gap > best_gap:
            best_gap = gap
            best_index = index

    left_size = best_index + 1
    right_size = len(values) - left_size
    return (
        best_gap >= config.sjs_gap_threshold
        and left_size >= config.min_group_size_for_gap
        and right_size >= config.min_group_size_for_gap
    )

