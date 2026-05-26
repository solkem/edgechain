import numpy as np
import pytest

from edgechain_lab.data.schemas import MarsAction, MarsScore, ScenarioName
from edgechain_lab.data.synthetic_odzi import build_default_sites, generate_readings
from edgechain_lab.fl.aggregation import (
    AggregationStatus,
    KrumPreconditionError,
    fedavg,
    krum,
    mars_weighted_fedavg,
    median,
)
from edgechain_lab.fl.client import TrainingConfig, train_client_model
from edgechain_lab.fl.dataset import SensorDataset, dataset_for_site, featurize_readings
from edgechain_lab.fl.model import SensorAnomalyModel
from edgechain_lab.reproducibility import set_all_seeds


def test_featurize_readings_returns_feature_and_label_tensors() -> None:
    sites = build_default_sites(seed=42)
    readings = generate_readings(sites, ScenarioName.HONEST_BASELINE, n_rounds=12, seed=42)

    features, labels = featurize_readings(readings)

    assert features.shape[1] == 7
    assert features.shape[0] == labels.shape[0]


def test_sensor_dataset_rejects_mismatched_lengths() -> None:
    features, labels = featurize_readings(
        generate_readings(build_default_sites(seed=42), ScenarioName.HONEST_BASELINE, 4, 42)
    )
    with pytest.raises(ValueError):
        SensorDataset(features, labels[:-1])


def test_train_client_model_returns_update_vector() -> None:
    set_all_seeds(7)
    sites = build_default_sites(seed=42)
    readings = generate_readings(sites, ScenarioName.HONEST_BASELINE, n_rounds=24, seed=42)
    dataset = dataset_for_site(readings, "site-001")
    model = SensorAnomalyModel()

    update = train_client_model(
        model,
        dataset,
        TrainingConfig(epochs=1, batch_size=8),
        round_id=1,
        site_id="site-001",
        scenario=ScenarioName.HONEST_BASELINE,
    )

    assert update.dataset_size == len(dataset)
    assert len(update.update_vector) > 0
    assert any(abs(value) > 0 for value in update.update_vector)


def test_fedavg_of_identical_vectors_returns_same_vector() -> None:
    vector = np.array([1.0, 2.0, 3.0])

    result = fedavg([vector, vector.copy()])

    np.testing.assert_allclose(result, vector)


def test_median_resists_one_large_outlier() -> None:
    result = median(
        [
            np.array([1.0, 1.0]),
            np.array([1.1, 1.0]),
            np.array([100.0, 100.0]),
        ]
    )

    np.testing.assert_allclose(result, np.array([1.1, 1.0]))


def test_krum_rejects_invalid_precondition() -> None:
    updates = [np.array([float(idx), 0.0]) for idx in range(7)]

    with pytest.raises(KrumPreconditionError):
        krum(updates, f=3)


def test_mars_weighted_fedavg_excludes_rejected_clients() -> None:
    updates = [np.array([1.0]), np.array([3.0]), np.array([100.0])]
    scores = [
        _score("a", 0.8, MarsAction.ACCEPT),
        _score("b", 0.6, MarsAction.FLAG),
        _score("c", 0.1, MarsAction.REJECT),
    ]

    result = mars_weighted_fedavg(updates, scores, min_eligible=2)

    assert result.status == AggregationStatus.SUCCESS
    assert result.update_vector[0] < 3.0


def _score(site_id: str, composite: float, action: MarsAction) -> MarsScore:
    return MarsScore(
        round_id=1,
        site_id=site_id,
        has_score=1.0,
        physical_plausibility=composite,
        spatial_jury=composite,
        temporal_consistency=composite,
        gradient_norm_bounds=composite,
        composite=composite,
        action=action,
        eligible_for_reward=composite >= 0.6,
    )
