"""Deterministic attack suite runner."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from edgechain_lab.attacks.perturbations import (
    colluding_direction,
    invalid_attestation,
    physical_impossibility,
    scale_attack,
    sign_flip,
)
from edgechain_lab.data.schemas import (
    ClientUpdate,
    KnownFailureMode,
    MarsAction,
    MarsScore,
    RoundReport,
    ScenarioName,
)
from edgechain_lab.fl.aggregation import mars_weighted_fedavg
from edgechain_lab.mars.rewards import reward_gini
from edgechain_lab.mars.scores import score_round
from edgechain_lab.reproducibility import set_all_seeds


@dataclass(frozen=True)
class AttackSuiteConfig:
    """Configuration for deterministic attack suite runs."""

    seed: int = 42
    round_id: int = 1
    update_dim: int = 12
    n_clients: int = 7


def make_baseline_updates(config: AttackSuiteConfig) -> list[ClientUpdate]:
    """Create deterministic honest updates clustered around one direction."""

    set_all_seeds(config.seed)
    rng = np.random.default_rng(config.seed)
    base = np.linspace(0.2, 1.0, config.update_dim)
    updates: list[ClientUpdate] = []
    for idx in range(config.n_clients):
        site_id = f"site-{idx + 1:03d}"
        vector = base + rng.normal(0.0, 0.05, size=config.update_dim)
        updates.append(
            ClientUpdate(
                round_id=config.round_id,
                site_id=site_id,
                scenario=ScenarioName.HONEST_BASELINE,
                update_vector=vector.tolist(),
                dataset_size=24,
                has_valid_attestation=True,
                true_label="normal",
            )
        )
    return updates


def apply_attack(
    updates: list[ClientUpdate],
    scenario: ScenarioName,
    seed: int,
) -> tuple[list[ClientUpdate], set[str]]:
    """Apply a named attack scenario and return attacked updates plus attacker IDs."""

    rng = np.random.default_rng(seed)
    attacked = [update.model_copy(deep=True) for update in updates]
    attacker_ids: set[str] = set()

    if scenario == ScenarioName.HONEST_BASELINE:
        return attacked, attacker_ids

    if scenario == ScenarioName.LEGITIMATE_NONIID_DIVERGENCE:
        for idx in (5, 6):
            update = attacked[idx]
            vector = np.asarray(update.update_vector, dtype=float)
            divergent = vector + np.linspace(0.0, 0.45, vector.size)
            attacked[idx] = update.model_copy(
                update={
                    "scenario": scenario,
                    "update_vector": divergent.tolist(),
                    "true_label": "distribution_shift",
                }
            )
        return attacked, attacker_ids

    if scenario == ScenarioName.INVALID_ATTESTATION:
        attacker_ids.add(attacked[0].site_id)
        attacked[0] = invalid_attestation(attacked[0])
        return attacked, attacker_ids

    if scenario == ScenarioName.SINGLE_ADVERSARY:
        attacker_ids.add(attacked[0].site_id)
        attacked[0] = sign_flip(attacked[0])
        return attacked, attacker_ids

    if scenario == ScenarioName.TWO_ADVERSARIES:
        for idx in (0, 1):
            attacker_ids.add(attacked[idx].site_id)
            attacked[idx] = scale_attack(attacked[idx], target_norm=25.0)
        return attacked, attacker_ids

    if scenario == ScenarioName.SENSOR_FAILURE:
        attacker_ids.add(attacked[0].site_id)
        attacked[0] = physical_impossibility(attacked[0])
        attacked[0] = attacked[0].model_copy(
            update={"scenario": ScenarioName.SENSOR_FAILURE, "true_label": "sensor_failure"}
        )
        return attacked, attacker_ids

    if scenario == ScenarioName.CALIBRATION_DRIFT:
        for idx in (3, 4):
            update = attacked[idx]
            vector = np.asarray(update.update_vector, dtype=float)
            drifted = vector + 0.2
            attacked[idx] = update.model_copy(
                update={
                    "scenario": scenario,
                    "update_vector": drifted.tolist(),
                    "true_label": "distribution_shift",
                }
            )
        return attacked, attacker_ids

    if scenario == ScenarioName.COLLUDING_MAJORITY:
        direction = rng.normal(0.0, 1.0, size=len(attacked[0].update_vector))
        for idx in (0, 1, 2, 3):
            attacker_ids.add(attacked[idx].site_id)
            attacked[idx] = colluding_direction(attacked[idx], direction)
        return attacked, attacker_ids

    raise ValueError(f"unsupported scenario: {scenario}")


def run_attack_scenario(
    scenario: ScenarioName,
    config: AttackSuiteConfig | None = None,
) -> RoundReport:
    """Run one attack scenario and produce a round report."""

    config = config or AttackSuiteConfig()
    baseline = make_baseline_updates(config)
    updates, attacker_ids = apply_attack(baseline, scenario, config.seed)
    cluster_by_site = _default_clusters(config.n_clients)
    scores = score_round(updates, cluster_by_site, seed=config.seed)
    aggregation = mars_weighted_fedavg(
        [np.asarray(update.update_vector, dtype=float) for update in updates],
        scores,
        min_eligible=3,
    )
    detected_collusion = _detect_collusion_heuristic(scores)
    known_failure = None
    if scenario == ScenarioName.COLLUDING_MAJORITY:
        known_failure = KnownFailureMode.COLLUDING_MAJORITY
        detected_collusion = False

    counts = _action_counts(scores)
    return RoundReport(
        scenario=scenario,
        round_id=config.round_id,
        seed=config.seed,
        n_clients=config.n_clients,
        n_accepted=counts[MarsAction.ACCEPT],
        n_flagged=counts[MarsAction.FLAG],
        n_rejected=counts[MarsAction.REJECT],
        aggregation_method=aggregation.method,
        mars_scores=scores,
        reward_gini=reward_gini(scores, round_budget=100.0),
        model_metrics={
            "accepted_malicious": float(
                sum(
                    1
                    for score in scores
                    if score.site_id in attacker_ids and score.action == MarsAction.ACCEPT
                )
            ),
            "rejected_honest": float(
                sum(
                    1
                    for score in scores
                    if score.site_id not in attacker_ids and score.action == MarsAction.REJECT
                )
            ),
            "malicious_reward_share": _malicious_reward_share(scores, attacker_ids),
        },
        detected_collusion=detected_collusion,
        known_failure_mode=known_failure,
    )


def run_attack_suite(config: AttackSuiteConfig | None = None) -> list[RoundReport]:
    """Run the MVP attack suite scenarios."""

    config = config or AttackSuiteConfig()
    scenarios = [
        ScenarioName.HONEST_BASELINE,
        ScenarioName.LEGITIMATE_NONIID_DIVERGENCE,
        ScenarioName.INVALID_ATTESTATION,
        ScenarioName.SINGLE_ADVERSARY,
        ScenarioName.TWO_ADVERSARIES,
        ScenarioName.SENSOR_FAILURE,
        ScenarioName.CALIBRATION_DRIFT,
        ScenarioName.COLLUDING_MAJORITY,
    ]
    return [run_attack_scenario(scenario, config) for scenario in scenarios]


def _default_clusters(n_clients: int) -> dict[str, str]:
    clusters = ["A", "A", "A", "B", "B", "C", "C"]
    return {f"site-{idx + 1:03d}": clusters[idx] for idx in range(n_clients)}


def _action_counts(scores: list[MarsScore]) -> dict[MarsAction, int]:
    return {
        MarsAction.ACCEPT: sum(score.action == MarsAction.ACCEPT for score in scores),
        MarsAction.FLAG: sum(score.action == MarsAction.FLAG for score in scores),
        MarsAction.REJECT: sum(score.action == MarsAction.REJECT for score in scores),
    }


def _detect_collusion_heuristic(scores: list[MarsScore]) -> bool:
    sjs_values = sorted(score.spatial_jury for score in scores)
    if len(sjs_values) < 4:
        return False
    gaps = [
        sjs_values[index + 1] - sjs_values[index]
        for index in range(len(sjs_values) - 1)
    ]
    return bool(gaps and max(gaps) > 0.35)


def _malicious_reward_share(scores: list[MarsScore], attacker_ids: set[str]) -> float:
    rewarded = [score for score in scores if score.eligible_for_reward]
    total = sum(score.composite for score in rewarded)
    if total == 0.0:
        return 0.0
    malicious = sum(score.composite for score in rewarded if score.site_id in attacker_ids)
    return float(malicious / total)
