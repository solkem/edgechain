"""Scenario definitions for the attack suite."""

from __future__ import annotations

from dataclasses import dataclass

from edgechain_lab.data.schemas import ScenarioName


@dataclass(frozen=True)
class AttackScenario:
    """Attack scenario configuration."""

    name: ScenarioName
    attacker_count: int
    description: str


SCENARIOS: dict[ScenarioName, AttackScenario] = {
    ScenarioName.HONEST_BASELINE: AttackScenario(
        ScenarioName.HONEST_BASELINE, 0, "No adversarial clients."
    ),
    ScenarioName.LEGITIMATE_NONIID_DIVERGENCE: AttackScenario(
        ScenarioName.LEGITIMATE_NONIID_DIVERGENCE,
        0,
        "Honest high-divergence farms; measures false positives.",
    ),
    ScenarioName.INVALID_ATTESTATION: AttackScenario(
        ScenarioName.INVALID_ATTESTATION, 1, "One client fails simulated HAS gate."
    ),
    ScenarioName.SINGLE_ADVERSARY: AttackScenario(
        ScenarioName.SINGLE_ADVERSARY, 1, "One poisoned update."
    ),
    ScenarioName.TWO_ADVERSARIES: AttackScenario(
        ScenarioName.TWO_ADVERSARIES, 2, "Two poisoned updates."
    ),
    ScenarioName.COLLUDING_MAJORITY: AttackScenario(
        ScenarioName.COLLUDING_MAJORITY, 4, "Four coordinated poisoned updates."
    ),
    ScenarioName.SENSOR_FAILURE: AttackScenario(
        ScenarioName.SENSOR_FAILURE, 1, "One sensor-failure-style update."
    ),
    ScenarioName.CALIBRATION_DRIFT: AttackScenario(
        ScenarioName.CALIBRATION_DRIFT, 0, "Slow drift that may evade static bounds."
    ),
}

