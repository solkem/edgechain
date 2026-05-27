"""Federated aggregation methods."""

from __future__ import annotations

from collections.abc import Sequence
from enum import StrEnum
from typing import cast

import numpy as np
from numpy.typing import NDArray
from pydantic import BaseModel

from edgechain_lab.data.schemas import KnownFailureMode, MarsAction, MarsScore


class AggregationStatus(StrEnum):
    SUCCESS = "success"
    PRECONDITION_VIOLATED = "precondition_violated"
    SKIPPED = "skipped"


class AggregationResult(BaseModel):
    """Structured aggregation result."""

    method: str
    status: AggregationStatus
    update_vector: list[float]
    known_failure_mode: KnownFailureMode | None = None


class KrumPreconditionError(ValueError):
    """Raised when Krum's Byzantine precondition is violated."""


FloatArray = NDArray[np.float64]


def fedavg(updates: Sequence[np.ndarray], weights: Sequence[float] | None = None) -> FloatArray:
    """Weighted federated averaging."""

    _ensure_updates(updates)
    if weights is None:
        weights_array = np.ones(len(updates), dtype=float) / len(updates)
    else:
        weights_array = np.asarray(weights, dtype=float)
        weights_array = weights_array / weights_array.sum()
    result = np.sum(
        [weight * update for weight, update in zip(weights_array, updates, strict=True)],
        axis=0,
    )
    return cast(FloatArray, result)


def median(updates: Sequence[np.ndarray]) -> FloatArray:
    """Coordinate-wise median aggregation."""

    _ensure_updates(updates)
    return cast(FloatArray, np.median(np.stack(updates), axis=0))


def trimmed_mean(updates: Sequence[np.ndarray], trim_ratio: float = 0.2) -> FloatArray:
    """Coordinate-wise trimmed mean."""

    _ensure_updates(updates)
    if not 0.0 <= trim_ratio < 0.5:
        raise ValueError("trim_ratio must be in [0.0, 0.5)")
    stacked = np.sort(np.stack(updates), axis=0)
    trim = int(len(updates) * trim_ratio)
    if trim == 0:
        return cast(FloatArray, np.mean(stacked, axis=0))
    return cast(FloatArray, np.mean(stacked[trim:-trim], axis=0))


def krum(updates: Sequence[np.ndarray], f: int) -> FloatArray:
    """Krum aggregation, selecting the update closest to its non-Byzantine peers."""

    _ensure_updates(updates)
    n = len(updates)
    if n <= 2 * f + 2:
        raise KrumPreconditionError("Krum requires n > 2f + 2")

    scores = []
    for idx, update in enumerate(updates):
        distances = []
        for peer_idx, peer in enumerate(updates):
            if idx == peer_idx:
                continue
            distances.append(float(np.sum((update - peer) ** 2)))
        distances.sort()
        scores.append(sum(distances[: n - f - 2]))
    return cast(FloatArray, updates[int(np.argmin(scores))])


def run_krum(updates: Sequence[np.ndarray], f: int) -> AggregationResult:
    """Run Krum and return structured failure instead of crashing."""

    try:
        output = krum(updates, f=f)
        return AggregationResult(
            method="krum",
            status=AggregationStatus.SUCCESS,
            update_vector=output.tolist(),
        )
    except KrumPreconditionError:
        fallback = np.zeros_like(updates[0]) if updates else np.array([], dtype=float)
        return AggregationResult(
            method="krum",
            status=AggregationStatus.PRECONDITION_VIOLATED,
            update_vector=fallback.tolist(),
            known_failure_mode=KnownFailureMode.KRUM_PRECONDITION_VIOLATED,
        )


def mars_weighted_fedavg(
    updates: Sequence[np.ndarray],
    mars_scores: Sequence[MarsScore],
    min_eligible: int = 3,
) -> AggregationResult:
    """Aggregate accepted and provisionally rewarded MARS updates."""

    eligible = [
        (update, score)
        for update, score in zip(updates, mars_scores, strict=True)
        if score.action in {MarsAction.ACCEPT, MarsAction.FLAG} and score.eligible_for_reward
    ]
    if len(eligible) < min_eligible:
        fallback = np.zeros_like(updates[0]) if updates else np.array([], dtype=float)
        return AggregationResult(
            method="mars_weighted_fedavg",
            status=AggregationStatus.SKIPPED,
            update_vector=fallback.tolist(),
            known_failure_mode=KnownFailureMode.INSUFFICIENT_ELIGIBLE_CLIENTS,
        )

    eligible_updates, scores = zip(*eligible, strict=True)
    weights = [score.composite for score in scores]
    output = fedavg(eligible_updates, weights=weights)
    return AggregationResult(
        method="mars_weighted_fedavg",
        status=AggregationStatus.SUCCESS,
        update_vector=output.tolist(),
    )


def _ensure_updates(updates: Sequence[np.ndarray]) -> None:
    if len(updates) == 0:
        raise ValueError("at least one update is required")
