"""Temporal consistency scoring."""

from __future__ import annotations

from collections import defaultdict, deque
from typing import cast

import numpy as np
from numpy.typing import NDArray

from edgechain_lab.fl.metrics import cosine_similarity


class TemporalHistory:
    """Rolling per-site update history."""

    def __init__(self, max_history: int = 10) -> None:
        self._history: defaultdict[str, deque[np.ndarray]] = defaultdict(
            lambda: deque(maxlen=max_history)
        )

    def score_and_update(self, site_id: str, update: np.ndarray) -> float:
        """Score current update against historical direction and then store it."""

        history = self._history[site_id]
        if len(history) < 2:
            history.append(update)
            return 0.7

        ema = _ema(list(history))
        score = float(np.clip(cosine_similarity(update, ema), 0.0, 1.0))
        history.append(update)
        return score


def _ema(history: list[np.ndarray], decay: float = 0.8) -> np.ndarray:
    weights = np.array([decay**idx for idx in range(len(history))], dtype=float)
    weights = weights / weights.sum()
    ordered = list(reversed(history))
    result = np.sum(
        [weight * update for weight, update in zip(weights, ordered, strict=True)],
        axis=0,
    )
    return cast(NDArray[np.float64], result)
