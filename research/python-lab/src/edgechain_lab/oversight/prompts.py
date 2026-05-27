"""Prompt rendering for LLM oversight."""

from __future__ import annotations

import hashlib

from edgechain_lab.data.schemas import OversightCase, VisibleRoundReport

SYSTEM_PROMPT = "\n".join(
    [
        "You are an oversight monitor for a privacy-preserving federated learning system "
        "serving smallholder farmers.",
        "You only see score traces and round metadata. You do not see raw farm data, "
        "farmer identities, attacker labels, or simulator ground truth.",
        "Classify the round as one of: normal, device_failure, non_iid_divergence, "
        "calibration_drift, suspicious, collusion_likely, skip_round.",
        "Return concise JSON with keys: label, confidence, rationale, recommended_action.",
    ]
)


def render_oversight_prompt(case: OversightCase) -> str:
    """Render a monitor prompt without leaking hidden labels."""

    visible = case.visible_round_report
    lines = [
        "FL Round Oversight Case",
        "",
        _format_visible_report(visible),
        "",
        "Assess the round using only the visible information above.",
    ]
    return "\n".join(lines)


def prompt_hash(system_prompt: str, user_prompt: str) -> str:
    """Hash prompt contents for reproducibility metadata."""

    return hashlib.sha256((system_prompt + "\n" + user_prompt).encode("utf-8")).hexdigest()


def _format_visible_report(report: VisibleRoundReport) -> str:
    score_lines = [
        (
            f"- {score.site_id}: composite={score.composite:.3f}, "
            f"HAS={score.has_score:.3f}, PPS={score.physical_plausibility:.3f}, "
            f"SJS={score.spatial_jury:.3f}, TCS={score.temporal_consistency:.3f}, "
            f"GNBS={score.gradient_norm_bounds:.3f}, action={score.action.value}"
        )
        for score in report.mars_scores
    ]
    return "\n".join(
        [
            f"Round: {report.round_id}",
            f"Clients: {report.n_clients}",
            f"Accepted: {report.n_accepted}",
            f"Flagged: {report.n_flagged}",
            f"Rejected: {report.n_rejected}",
            f"Aggregation method: {report.aggregation_method}",
            f"Reward Gini: {report.reward_gini:.3f}",
            f"Cluster summary: {report.cluster_summary}",
            f"Visible failure summary: {report.visible_failure_summary}",
            "MARS scores:",
            *score_lines,
            f"Historical trend: {report.historical_trend}",
        ]
    )
