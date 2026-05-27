import numpy as np

from edgechain_lab.attacks.perturbations import scale_attack, sign_flip
from edgechain_lab.attacks.suite import (
    AttackSuiteConfig,
    apply_attack,
    make_baseline_updates,
    run_attack_scenario,
    run_attack_suite,
)
from edgechain_lab.data.schemas import KnownFailureMode, MarsAction, ScenarioName


def test_sign_flip_changes_cosine_direction() -> None:
    update = make_baseline_updates(AttackSuiteConfig(seed=1))[0]
    attacked = sign_flip(update, scale=1.0)

    original = np.asarray(update.update_vector)
    flipped = np.asarray(attacked.update_vector)

    assert np.dot(original, flipped) < 0.0


def test_scale_attack_increases_norm() -> None:
    update = make_baseline_updates(AttackSuiteConfig(seed=1))[0]
    attacked = scale_attack(update, target_norm=25.0)

    assert np.linalg.norm(attacked.update_vector) > np.linalg.norm(update.update_vector)


def test_invalid_attestation_scenario_sets_attestation_false() -> None:
    updates = make_baseline_updates(AttackSuiteConfig(seed=1))
    attacked, attacker_ids = apply_attack(updates, ScenarioName.INVALID_ATTESTATION, seed=1)

    assert attacker_ids == {"site-001"}
    assert attacked[0].has_valid_attestation is False


def test_legitimate_noniid_has_no_true_attackers() -> None:
    updates = make_baseline_updates(AttackSuiteConfig(seed=1))
    _, attacker_ids = apply_attack(updates, ScenarioName.LEGITIMATE_NONIID_DIVERGENCE, seed=1)

    assert attacker_ids == set()


def test_invalid_attestation_forces_rejection_in_report() -> None:
    report = run_attack_scenario(ScenarioName.INVALID_ATTESTATION, AttackSuiteConfig(seed=2))
    invalid_score = next(score for score in report.mars_scores if score.site_id == "site-001")

    assert invalid_score.has_score == 0.0
    assert invalid_score.composite == 0.0
    assert invalid_score.action == MarsAction.REJECT


def test_colluding_majority_is_documented_failure_mode() -> None:
    report = run_attack_scenario(ScenarioName.COLLUDING_MAJORITY, AttackSuiteConfig(seed=42))

    assert report.known_failure_mode == KnownFailureMode.COLLUDING_MAJORITY
    assert report.detected_collusion is False


def test_attack_suite_returns_all_mvp_scenarios() -> None:
    reports = run_attack_suite(AttackSuiteConfig(seed=3))
    scenarios = {report.scenario for report in reports}

    assert ScenarioName.HONEST_BASELINE in scenarios
    assert ScenarioName.INVALID_ATTESTATION in scenarios
    assert ScenarioName.COLLUDING_MAJORITY in scenarios
    assert len(reports) == 8


def test_single_adversary_reports_malicious_metrics() -> None:
    report = run_attack_scenario(ScenarioName.SINGLE_ADVERSARY, AttackSuiteConfig(seed=4))

    assert "accepted_malicious" in report.model_metrics
    assert "rejected_honest" in report.model_metrics
    assert "malicious_reward_share" in report.model_metrics
