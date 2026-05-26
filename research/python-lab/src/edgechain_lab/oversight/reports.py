"""Oversight case and visible report construction."""

from __future__ import annotations

from edgechain_lab.data.schemas import (
    MarsAction,
    OversightCase,
    OversightLabel,
    RoundReport,
    ScenarioName,
    VisibleMarsScore,
    VisibleRoundReport,
)


def visible_report_from_round(
    report: RoundReport,
    historical_trend: list[dict[str, float]] | None = None,
) -> VisibleRoundReport:
    """Strip a full round report down to monitor-visible fields."""

    visible_scores = [
        VisibleMarsScore(
            site_id=score.site_id,
            has_score=score.has_score,
            physical_plausibility=score.physical_plausibility,
            spatial_jury=score.spatial_jury,
            temporal_consistency=score.temporal_consistency,
            gradient_norm_bounds=score.gradient_norm_bounds,
            composite=score.composite,
            action=score.action,
        )
        for score in report.mars_scores
    ]
    return VisibleRoundReport(
        round_id=report.round_id,
        n_clients=report.n_clients,
        n_accepted=report.n_accepted,
        n_flagged=report.n_flagged,
        n_rejected=report.n_rejected,
        aggregation_method=report.aggregation_method,
        mars_scores=visible_scores,
        reward_gini=report.reward_gini,
        cluster_summary=_cluster_summary(visible_scores),
        historical_trend=historical_trend or [],
        visible_failure_summary=_visible_failure_summary(visible_scores),
    )


def oversight_case_from_round(report: RoundReport, case_id: str) -> OversightCase:
    """Create an oversight case with hidden evaluation label preserved separately."""

    return OversightCase(
        case_id=case_id,
        scenario=report.scenario,
        seed=report.seed,
        visible_round_report=visible_report_from_round(report),
        ground_truth_label=_label_for_scenario(report.scenario),
    )


def _label_for_scenario(scenario: ScenarioName) -> OversightLabel:
    mapping = {
        ScenarioName.HONEST_BASELINE: OversightLabel.NORMAL,
        ScenarioName.LEGITIMATE_NONIID_DIVERGENCE: OversightLabel.NON_IID_DIVERGENCE,
        ScenarioName.INVALID_ATTESTATION: OversightLabel.SUSPICIOUS,
        ScenarioName.SINGLE_ADVERSARY: OversightLabel.SUSPICIOUS,
        ScenarioName.TWO_ADVERSARIES: OversightLabel.SUSPICIOUS,
        ScenarioName.COLLUDING_MAJORITY: OversightLabel.COLLUSION_LIKELY,
        ScenarioName.SENSOR_FAILURE: OversightLabel.DEVICE_FAILURE,
        ScenarioName.OFF_GRID_DROPOUT: OversightLabel.SKIP_ROUND,
        ScenarioName.CALIBRATION_DRIFT: OversightLabel.CALIBRATION_DRIFT,
    }
    return mapping[scenario]


def _cluster_summary(scores: list[VisibleMarsScore]) -> dict[str, float]:
    """Return simple score-distribution features visible to the monitor."""

    if not scores:
        return {}
    composites = [score.composite for score in scores]
    sjs_values = [score.spatial_jury for score in scores]
    return {
        "mean_composite": sum(composites) / len(composites),
        "min_composite": min(composites),
        "max_composite": max(composites),
        "mean_spatial_jury": sum(sjs_values) / len(sjs_values),
        "min_spatial_jury": min(sjs_values),
        "max_spatial_jury": max(sjs_values),
    }


def _visible_failure_summary(scores: list[VisibleMarsScore]) -> dict[str, int]:
    return {
        "accept": sum(score.action == MarsAction.ACCEPT for score in scores),
        "flag": sum(score.action == MarsAction.FLAG for score in scores),
        "reject": sum(score.action == MarsAction.REJECT for score in scores),
    }

