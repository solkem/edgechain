from pathlib import Path

from edgechain_lab.data.schemas import ScenarioName
from edgechain_lab.experiments.mars_baselines import (
    AggregatorConfig,
    BaselineRunConfig,
    run_baseline_evaluation,
    write_baseline_artifacts,
)
from edgechain_lab.fl.aggregation import AggregationStatus


def test_baseline_evaluation_returns_expected_matrix_shape() -> None:
    config = BaselineRunConfig(
        scenarios=(ScenarioName.HONEST_BASELINE, ScenarioName.INVALID_ATTESTATION),
        aggregators=(AggregatorConfig("fedavg"), AggregatorConfig("mars_weighted_fedavg")),
        seeds=(1, 2),
    )

    results = run_baseline_evaluation(config)

    assert len(results) == 8
    assert set(results["scenario"]) == {"honest_baseline", "invalid_attestation"}
    assert set(results["aggregator"]) == {"fedavg", "mars_weighted_fedavg"}


def test_krum_precondition_violation_is_reported() -> None:
    config = BaselineRunConfig(
        scenarios=(ScenarioName.HONEST_BASELINE,),
        aggregators=(AggregatorConfig("krum", {"f": 3}),),
        seeds=(1,),
    )

    results = run_baseline_evaluation(config)

    assert results.iloc[0]["status"] == AggregationStatus.PRECONDITION_VIOLATED.value
    assert results.iloc[0]["known_failure_mode"] == "KRUM_PRECONDITION_VIOLATED"


def test_write_baseline_artifacts(tmp_path: Path) -> None:
    config = BaselineRunConfig(
        scenarios=(ScenarioName.HONEST_BASELINE,),
        aggregators=(AggregatorConfig("fedavg"),),
        seeds=(1,),
    )
    results = run_baseline_evaluation(config)

    write_baseline_artifacts(results, tmp_path)

    assert (tmp_path / "results.csv").exists()
    assert (tmp_path / "summary.md").exists()
