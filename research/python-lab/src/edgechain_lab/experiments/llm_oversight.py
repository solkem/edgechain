"""Generate and evaluate LLM oversight cases."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from edgechain_lab.attacks.suite import AttackSuiteConfig, run_attack_suite
from edgechain_lab.data.schemas import OversightCase
from edgechain_lab.oversight.anthropic_monitor import (
    LLMMonitorResult,
    dry_run_monitor,
    run_anthropic_monitor,
)
from edgechain_lab.oversight.evals import results_to_frame
from edgechain_lab.oversight.heuristic_monitor import HeuristicResult, run_heuristic_monitor
from edgechain_lab.oversight.reports import oversight_case_from_round


def build_oversight_cases(seed: int = 42) -> list[OversightCase]:
    """Build oversight cases from the deterministic attack suite."""

    reports = run_attack_suite(AttackSuiteConfig(seed=seed))
    return [
        oversight_case_from_round(report, case_id=f"{report.scenario.value}-{report.seed}")
        for report in reports
    ]


def run_oversight_evaluation(
    live: bool = False,
    seed: int = 42,
) -> tuple[list[OversightCase], list[HeuristicResult], list[LLMMonitorResult], Any]:
    """Run heuristic and dry/live LLM oversight monitors."""

    cases = build_oversight_cases(seed=seed)
    heuristic_results = [run_heuristic_monitor(case.visible_round_report) for case in cases]
    llm_results = [run_anthropic_monitor(case) if live else dry_run_monitor(case) for case in cases]
    frame = results_to_frame(cases, heuristic_results, llm_results)
    return cases, heuristic_results, llm_results, frame


def write_oversight_artifacts(output_dir: Path = Path("reports/llm_oversight")) -> None:
    """Write oversight cases and result artifacts."""

    output_dir.mkdir(parents=True, exist_ok=True)
    eval_dir = Path("evals")
    eval_dir.mkdir(exist_ok=True)
    cases, heuristic_results, llm_results, frame = run_oversight_evaluation()

    with (eval_dir / "oversight_cases_private.jsonl").open("w", encoding="utf-8") as handle:
        for case in cases:
            handle.write(case.model_dump_json() + "\n")
    with (eval_dir / "oversight_cases_visible.jsonl").open("w", encoding="utf-8") as handle:
        for case in cases:
            handle.write(case.visible_round_report.model_dump_json() + "\n")

    frame.to_csv(output_dir / "results.csv", index=False)
    heuristic_accuracy = float(frame["heuristic_correct"].mean()) if not frame.empty else 0.0
    llm_accuracy = float(frame["llm_correct"].mean()) if not frame.empty else 0.0
    lines = [
        "# LLM Oversight Evaluation",
        "",
        "Live Anthropic calls are opt-in with `EDGECHAIN_LIVE_LLM=1`.",
        "",
        f"Heuristic accuracy: {heuristic_accuracy:.3f}",
        f"LLM/dry-run accuracy: {llm_accuracy:.3f}",
        "",
        "## Cases",
        "",
        "```text",
        frame.to_string(index=False),
        "```",
        "",
        "## LLM Metadata",
        "",
        "```json",
        json.dumps(
            [result.metadata.model_dump() if result.metadata else {} for result in llm_results],
            indent=2,
        ),
        "```",
        "",
    ]
    (output_dir / "summary.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    """CLI entry point."""

    write_oversight_artifacts()


if __name__ == "__main__":
    main()
