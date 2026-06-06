"""Baseline aggregation evaluation for MARS attack scenarios."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from edgechain_lab.attacks.suite import AttackSuiteConfig, apply_attack, make_baseline_updates
from edgechain_lab.data.schemas import ClientUpdate, MarsAction, MarsScore, ScenarioName
from edgechain_lab.fl.aggregation import (
    AggregationStatus,
    fedavg,
    mars_weighted_fedavg,
    median,
    run_krum,
    trimmed_mean,
)
from edgechain_lab.mars.scores import score_round


@dataclass(frozen=True)
class AggregatorConfig:
    """One aggregator configuration."""

    name: str
    params: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class BaselineRunConfig:
    """Run matrix for baseline evaluation."""

    scenarios: tuple[ScenarioName, ...] = (
        ScenarioName.HONEST_BASELINE,
        ScenarioName.LEGITIMATE_NONIID_DIVERGENCE,
        ScenarioName.INVALID_ATTESTATION,
        ScenarioName.SINGLE_ADVERSARY,
        ScenarioName.TWO_ADVERSARIES,
        ScenarioName.COLLUDING_MAJORITY,
        ScenarioName.SENSOR_FAILURE,
        ScenarioName.CALIBRATION_DRIFT,
    )
    # Aggregators are the comparison set: each method turns many client updates
    # into one global update, letting MARS-weighted FedAvg be judged against
    # standard and robust baselines rather than in isolation.
    aggregators: tuple[AggregatorConfig, ...] = (
        AggregatorConfig("fedavg"),
        AggregatorConfig("median"),
        AggregatorConfig("trimmed_mean", {"trim_ratio": 0.2}),
        AggregatorConfig("krum", {"f": 3}),
        AggregatorConfig("mars_weighted_fedavg"),
    )
    seeds: tuple[int, ...] = (1, 2, 3)
    update_dim: int = 12
    n_clients: int = 7


def run_baseline_evaluation(config: BaselineRunConfig | None = None) -> pd.DataFrame:
    """Run the configured baseline matrix and return a result table."""

    config = config or BaselineRunConfig()
    rows: list[dict[str, object]] = []
    for seed in config.seeds:
        suite_config = AttackSuiteConfig(
            seed=seed,
            update_dim=config.update_dim,
            n_clients=config.n_clients,
        )
        baseline = make_baseline_updates(suite_config)
        honest_vector = fedavg(_vectors(baseline))
        for scenario in config.scenarios:
            attacked, attacker_ids = apply_attack(baseline, scenario, seed)
            vectors = _vectors(attacked)
            scores = score_round(attacked, _default_clusters(config.n_clients), seed=seed)
            for aggregator in config.aggregators:
                # Same scenario, same updates, different aggregation rule. The
                # output row makes the methods directly comparable.
                rows.append(
                    _run_one(
                        scenario=scenario,
                        seed=seed,
                        aggregator=aggregator,
                        vectors=vectors,
                        scores=scores,
                        attacker_ids=attacker_ids,
                        honest_vector=honest_vector,
                    )
                )
    return pd.DataFrame(rows)


def write_baseline_artifacts(
    results: pd.DataFrame,
    output_dir: Path = Path("reports/mars_baselines"),
) -> None:
    """Write CSV and Markdown summary artifacts."""

    output_dir.mkdir(parents=True, exist_ok=True)
    results.to_csv(output_dir / "results.csv", index=False)

    summary = _summary_table(results)
    lines = [
        "# MARS Baseline Evaluation",
        "",
        "## Run Summary",
        "",
        "```text",
        summary.to_string(index=False),
        "```",
        "",
        "## Krum Precondition Violations",
        "",
        str(int((results["status"] == AggregationStatus.PRECONDITION_VIOLATED.value).sum())),
        "",
    ]
    (output_dir / "summary.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    """CLI entry point for baseline evaluation."""

    results = run_baseline_evaluation()
    write_baseline_artifacts(results)


def _run_one(
    *,
    scenario: ScenarioName,
    seed: int,
    aggregator: AggregatorConfig,
    vectors: list[np.ndarray],
    scores: list[MarsScore],
    attacker_ids: set[str],
    honest_vector: np.ndarray,
) -> dict[str, object]:
    if aggregator.name == "fedavg":
        status = AggregationStatus.SUCCESS
        output = fedavg(vectors)
        known_failure = None
    elif aggregator.name == "median":
        status = AggregationStatus.SUCCESS
        output = median(vectors)
        known_failure = None
    elif aggregator.name == "trimmed_mean":
        status = AggregationStatus.SUCCESS
        output = trimmed_mean(vectors, trim_ratio=float(aggregator.params["trim_ratio"]))
        known_failure = None
    elif aggregator.name == "krum":
        result = run_krum(vectors, f=int(aggregator.params["f"]))
        status = result.status
        output = np.asarray(result.update_vector, dtype=float)
        known_failure = result.known_failure_mode
    elif aggregator.name == "mars_weighted_fedavg":
        result = mars_weighted_fedavg(vectors, scores, min_eligible=3)
        status = result.status
        output = np.asarray(result.update_vector, dtype=float)
        known_failure = result.known_failure_mode
    else:
        raise ValueError(f"unknown aggregator: {aggregator.name}")

    accepted_malicious = sum(
        1
        for score in scores
        if score.site_id in attacker_ids and score.action == MarsAction.ACCEPT
    )
    rejected_honest = sum(
        1
        for score in scores
        if score.site_id not in attacker_ids and score.action == MarsAction.REJECT
    )
    malicious_reward_share = _malicious_reward_share(scores, attacker_ids)

    return {
        "seed": seed,
        "scenario": scenario.value,
        "aggregator": aggregator.name,
        "status": status.value,
        "known_failure_mode": known_failure.value if known_failure else "",
        "distance_from_honest": float(np.linalg.norm(output - honest_vector)),
        "accepted_malicious": accepted_malicious,
        "rejected_honest": rejected_honest,
        "malicious_reward_share": malicious_reward_share,
        "n_attackers": len(attacker_ids),
    }


def _vectors(updates: list[ClientUpdate]) -> list[np.ndarray]:
    return [np.asarray(update.update_vector, dtype=float) for update in updates]


def _default_clusters(n_clients: int) -> dict[str, str]:
    clusters = ["A", "A", "A", "B", "B", "C", "C"]
    return {f"site-{idx + 1:03d}": clusters[idx] for idx in range(n_clients)}


def _malicious_reward_share(scores: list[MarsScore], attacker_ids: set[str]) -> float:
    rewarded = [score for score in scores if score.eligible_for_reward]
    total = sum(score.composite for score in rewarded)
    if total == 0.0:
        return 0.0
    malicious = sum(score.composite for score in rewarded if score.site_id in attacker_ids)
    return float(malicious / total)


def _summary_table(results: pd.DataFrame) -> pd.DataFrame:
    grouped = (
        results.groupby(["scenario", "aggregator", "status"], dropna=False)
        .agg(
            mean_distance_from_honest=("distance_from_honest", "mean"),
            mean_accepted_malicious=("accepted_malicious", "mean"),
            mean_rejected_honest=("rejected_honest", "mean"),
            mean_malicious_reward_share=("malicious_reward_share", "mean"),
        )
        .reset_index()
    )
    return grouped.sort_values(["scenario", "aggregator", "status"])


if __name__ == "__main__":
    main()
