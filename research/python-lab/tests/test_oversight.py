import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from edgechain_lab.attacks.suite import AttackSuiteConfig, run_attack_scenario
from edgechain_lab.data.schemas import LLMProvider, LLMRunMetadata, OversightLabel, ScenarioName
from edgechain_lab.experiments.llm_oversight import build_oversight_cases, write_oversight_artifacts
from edgechain_lab.oversight.anthropic_monitor import (
    LLMMonitorResult,
    _parse_json_result,
    dry_run_monitor,
)
from edgechain_lab.oversight.heuristic_monitor import run_heuristic_monitor
from edgechain_lab.oversight.prompts import SYSTEM_PROMPT, prompt_hash, render_oversight_prompt
from edgechain_lab.oversight.reports import oversight_case_from_round, visible_report_from_round


def test_prompt_rendering_excludes_ground_truth_label_and_scenario() -> None:
    report = run_attack_scenario(ScenarioName.COLLUDING_MAJORITY, AttackSuiteConfig(seed=7))
    case = oversight_case_from_round(report, "case-1")

    prompt = render_oversight_prompt(case)

    assert case.ground_truth_label.value not in prompt
    assert case.scenario.value not in prompt
    assert "COLLUDING_MAJORITY" not in prompt


def test_visible_report_excludes_hidden_fields() -> None:
    report = run_attack_scenario(ScenarioName.SINGLE_ADVERSARY, AttackSuiteConfig(seed=7))
    visible = visible_report_from_round(report)
    payload = visible.model_dump()

    assert "scenario" not in payload
    assert "seed" not in payload
    assert "known_failure_mode" not in payload
    assert "ground_truth_label" not in payload


def test_prompt_hash_changes_when_prompt_changes() -> None:
    first = prompt_hash(SYSTEM_PROMPT, "one")
    second = prompt_hash(SYSTEM_PROMPT, "two")

    assert first != second


def test_heuristic_monitor_is_deterministic() -> None:
    report = run_attack_scenario(ScenarioName.HONEST_BASELINE, AttackSuiteConfig(seed=7))
    visible = visible_report_from_round(report)

    first = run_heuristic_monitor(visible)
    second = run_heuristic_monitor(visible)

    assert first == second


def test_parser_rejects_invalid_llm_label() -> None:
    with pytest.raises(ValueError):
        _parse_json_result(
            json.dumps(
                {
                    "label": "not_a_label",
                    "confidence": 0.5,
                    "rationale": "bad label",
                    "recommended_action": "review",
                }
            )
        )


def test_llm_metadata_rejects_unversioned_model() -> None:
    with pytest.raises(ValidationError):
        LLMRunMetadata(
            provider=LLMProvider.ANTHROPIC,
            model="claude",
            temperature=0.0,
            max_tokens=100,
            prompt_hash="abc",
            date="2026-05-26",
        )


def test_dry_run_monitor_returns_metadata() -> None:
    case = build_oversight_cases(seed=5)[0]
    result = dry_run_monitor(case)

    assert isinstance(result, LLMMonitorResult)
    assert result.metadata is not None
    assert result.label == OversightLabel.SUSPICIOUS


def test_write_oversight_artifacts_visible_file_excludes_hidden_fields(tmp_path: Path) -> None:
    output_dir = tmp_path / "reports"
    cwd = Path.cwd()
    try:
        import os

        os.chdir(tmp_path)
        write_oversight_artifacts(output_dir)
    finally:
        os.chdir(cwd)

    visible_path = tmp_path / "evals" / "oversight_cases_visible.jsonl"
    private_path = tmp_path / "evals" / "oversight_cases_private.jsonl"

    assert visible_path.exists()
    assert private_path.exists()
    first_visible = json.loads(visible_path.read_text(encoding="utf-8").splitlines()[0])
    assert "scenario" not in first_visible
    assert "ground_truth_label" not in first_visible
