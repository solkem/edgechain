"""Small numerical metrics used by FL and MARS."""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np


def cosine_similarity(left: np.ndarray, right: np.ndarray) -> float:
    """Numerically safe cosine similarity."""

    left_norm = float(np.linalg.norm(left))
    right_norm = float(np.linalg.norm(right))
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    return float(np.dot(left, right) / (left_norm * right_norm))


def gini(values: Sequence[float]) -> float:
    """Compute Gini coefficient for non-negative values."""

    if len(values) == 0:
        return 0.0
    array = np.asarray(values, dtype=float)
    if np.any(array < 0):
        raise ValueError("gini values must be non-negative")
    if np.all(array == 0):
        return 0.0
    sorted_values = np.sort(array)
    n = sorted_values.size
    index = np.arange(1, n + 1)
    return float((2 * np.sum(index * sorted_values)) / (n * np.sum(sorted_values)) - (n + 1) / n)
