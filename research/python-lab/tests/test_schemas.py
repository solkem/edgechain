import pytest
from pydantic import ValidationError

from edgechain_lab.data.schemas import (
    LLMProvider,
    LLMRunMetadata,
    MarsAction,
    MarsScore,
    VisibleRoundReport,
)


def test_has_score_zero_forces_zero_composite() -> None:
    with pytest.raises(ValidationError):
        MarsScore(
            round_id=1,
            site_id="site-1",
            has_score=0.0,
            physical_plausibility=1.0,
            spatial_jury=1.0,
            temporal_consistency=1.0,
            gradient_norm_bounds=1.0,
            composite=0.70,
            action=MarsAction.FLAG,
            eligible_for_reward=True,
        )


def test_visible_round_report_excludes_ground_truth_fields() -> None:
    fields = set(VisibleRoundReport.model_fields)
    assert "scenario" not in fields
    assert "seed" not in fields
    assert "known_failure_mode" not in fields
    assert "ground_truth_label" not in fields


def test_llm_metadata_rejects_unversioned_model_string() -> None:
    with pytest.raises(ValidationError):
        LLMRunMetadata(
            provider=LLMProvider.ANTHROPIC,
            model="claude",
            temperature=0.0,
            max_tokens=1024,
            prompt_hash="abc123",
            date="2026-05-26",
        )
