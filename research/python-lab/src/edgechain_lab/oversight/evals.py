"""Oversight evaluation helpers."""

from __future__ import annotations

from collections.abc import Iterable

import pandas as pd

from edgechain_lab.data.schemas import OversightCase, OversightLabel
from edgechain_lab.oversight.anthropic_monitor import LLMMonitorResult
from edgechain_lab.oversight.heuristic_monitor import HeuristicResult


def results_to_frame(
    cases: Iterable[OversightCase],
    heuristic_results: Iterable[HeuristicResult],
    llm_results: Iterable[LLMMonitorResult],
) -> pd.DataFrame:
    """Create a tabular evaluation result."""

    rows = []
    for case, heuristic, llm in zip(cases, heuristic_results, llm_results, strict=True):
        rows.append(
            {
                "case_id": case.case_id,
                "scenario": case.scenario.value,
                "ground_truth_label": case.ground_truth_label.value,
                "heuristic_label": heuristic.label.value,
                "heuristic_correct": heuristic.label == case.ground_truth_label,
                "llm_label": llm.label.value,
                "llm_correct": llm.label == case.ground_truth_label,
                "llm_confidence": llm.confidence,
            }
        )
    return pd.DataFrame(rows)


def accuracy(labels: list[OversightLabel], predictions: list[OversightLabel]) -> float:
    """Simple accuracy over oversight labels."""

    if len(labels) != len(predictions):
        raise ValueError("labels and predictions must have same length")
    if not labels:
        return 0.0
    return sum(label == pred for label, pred in zip(labels, predictions, strict=True)) / len(labels)

