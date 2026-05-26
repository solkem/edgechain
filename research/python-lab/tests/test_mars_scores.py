import inspect

import numpy as np

from edgechain_lab.data.schemas import ClientUpdate, MarsAction, ScenarioName
from edgechain_lab.fl.metrics import gini
from edgechain_lab.mars.physical import PhysicalBounds, physical_plausibility_score
from edgechain_lab.mars.rewards import allocate_rewards, reward_gini
from edgechain_lab.mars.scores import score_round
from edgechain_lab.mars.spatial import spatial_jury_score


def test_physical_plausibility_signature_excludes_ground_truth_fields() -> None:
    parameters = set(inspect.signature(physical_plausibility_score).parameters)

    assert "scenario" not in parameters
    assert "true_label" not in parameters
    assert "failure_code" not in parameters
    assert "metadata" not in parameters


def test_physical_plausibility_score_is_bounded() -> None:
    score = physical_plausibility_score(
        update_vector=np.ones(20),
        bounds=PhysicalBounds(),
        seed=42,
    )

    assert 0.0 <= score <= 1.0


def test_spatial_isolated_client_receives_neutral_score() -> None:
    score = spatial_jury_score(
        "site-001",
        {"site-001": np.array([1.0, 0.0])},
        {"site-001": "A"},
    )

    assert score == 0.5


def test_invalid_attestation_forces_zero_composite() -> None:
    updates = [
        ClientUpdate(
            round_id=1,
            site_id="site-001",
            scenario=ScenarioName.INVALID_ATTESTATION,
            update_vector=[1.0, 0.0, 0.5],
            dataset_size=10,
            has_valid_attestation=False,
            true_label="normal",
        ),
        ClientUpdate(
            round_id=1,
            site_id="site-002",
            scenario=ScenarioName.HONEST_BASELINE,
            update_vector=[1.0, 0.1, 0.4],
            dataset_size=10,
            has_valid_attestation=True,
            true_label="normal",
        ),
    ]

    scores = score_round(updates, {"site-001": "A", "site-002": "A"}, seed=42)
    invalid_score = next(score for score in scores if score.site_id == "site-001")

    assert invalid_score.has_score == 0.0
    assert invalid_score.composite == 0.0
    assert invalid_score.action == MarsAction.REJECT


def test_gini_equal_values_is_zero_and_increases_for_unequal_values() -> None:
    assert gini([1.0, 1.0, 1.0]) == 0.0
    assert gini([0.0, 0.0, 3.0]) > 0.0


def test_reward_allocation_and_gini() -> None:
    updates = [
        ClientUpdate(
            round_id=1,
            site_id="site-001",
            scenario=ScenarioName.HONEST_BASELINE,
            update_vector=[1.0, 0.0, 0.5],
            dataset_size=10,
            has_valid_attestation=True,
            true_label="normal",
        ),
        ClientUpdate(
            round_id=1,
            site_id="site-002",
            scenario=ScenarioName.HONEST_BASELINE,
            update_vector=[1.0, 0.1, 0.4],
            dataset_size=10,
            has_valid_attestation=True,
            true_label="normal",
        ),
        ClientUpdate(
            round_id=1,
            site_id="site-003",
            scenario=ScenarioName.INVALID_ATTESTATION,
            update_vector=[9.0, 9.0, 9.0],
            dataset_size=10,
            has_valid_attestation=False,
            true_label="normal",
        ),
    ]
    scores = score_round(updates, {"site-001": "A", "site-002": "A", "site-003": "A"}, seed=42)

    rewards = allocate_rewards(scores, round_budget=100.0)

    assert "site-003" not in rewards
    assert sum(rewards.values()) <= 100.000001
    assert 0.0 <= reward_gini(scores, round_budget=100.0) <= 1.0
