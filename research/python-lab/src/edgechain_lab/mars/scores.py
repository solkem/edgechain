"""Composite MARS scoring."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from edgechain_lab.data.schemas import ClientUpdate, MarsAction, MarsScore
from edgechain_lab.mars.physical import PhysicalBounds, physical_plausibility_score
from edgechain_lab.mars.spatial import spatial_jury_score
from edgechain_lab.mars.temporal import TemporalHistory


@dataclass(frozen=True)
class MarsThresholds:
    """Thresholds for MARS actions and rewards."""

    accept: float = 0.70
    flag: float = 0.50
    reward: float = 0.60


@dataclass(frozen=True)
class MarsWeights:
    """MARS weights after HAS multiplicative gating."""

    physical_plausibility: float = 0.36
    spatial_jury: float = 0.36
    temporal_consistency: float = 0.21
    gradient_norm_bounds: float = 0.07

    def __post_init__(self) -> None:
        total = (
            self.physical_plausibility
            + self.spatial_jury
            + self.temporal_consistency
            + self.gradient_norm_bounds
        )
        if abs(total - 1.0) > 1e-6:
            raise ValueError("MARS weights must sum to 1.0")


DEFAULT_THRESHOLDS = MarsThresholds()
DEFAULT_WEIGHTS = MarsWeights()


def score_round(
    updates: list[ClientUpdate],
    cluster_by_site: dict[str, str],
    *,
    seed: int,
    history: TemporalHistory | None = None,
    thresholds: MarsThresholds | None = None,
    weights: MarsWeights | None = None,
) -> list[MarsScore]:
    """Score all updates in one FL round."""

    history = history or TemporalHistory()
    thresholds = thresholds or DEFAULT_THRESHOLDS
    weights = weights or DEFAULT_WEIGHTS
    updates_by_site = {
        update.site_id: np.asarray(update.update_vector, dtype=float) for update in updates
    }
    norm_scores = _gradient_norm_bounds(updates_by_site)
    scores: list[MarsScore] = []

    for update in updates:
        vector = updates_by_site[update.site_id]
        has_score = 1.0 if update.has_valid_attestation else 0.0
        pps = physical_plausibility_score(
            update_vector=vector,
            bounds=PhysicalBounds(),
            seed=seed + update.round_id,
        )
        sjs = spatial_jury_score(update.site_id, updates_by_site, cluster_by_site)
        tcs = history.score_and_update(update.site_id, vector)
        gnbs = norm_scores[update.site_id]
        composite = _composite(has_score, pps, sjs, tcs, gnbs, weights)
        action = _action(composite, thresholds)
        scores.append(
            MarsScore(
                round_id=update.round_id,
                site_id=update.site_id,
                has_score=has_score,
                physical_plausibility=pps,
                spatial_jury=sjs,
                temporal_consistency=tcs,
                gradient_norm_bounds=gnbs,
                composite=composite,
                action=action,
                eligible_for_reward=composite >= thresholds.reward and has_score > 0.0,
            )
        )
    return scores


def _composite(
    has_score: float,
    pps: float,
    sjs: float,
    tcs: float,
    gnbs: float,
    weights: MarsWeights,
) -> float:
    if has_score == 0.0:
        return 0.0
    value = has_score * (
        weights.physical_plausibility * pps
        + weights.spatial_jury * sjs
        + weights.temporal_consistency * tcs
        + weights.gradient_norm_bounds * gnbs
    )
    return float(np.clip(value, 0.0, 1.0))


def _action(composite: float, thresholds: MarsThresholds) -> MarsAction:
    if composite >= thresholds.accept:
        return MarsAction.ACCEPT
    if composite >= thresholds.flag:
        return MarsAction.FLAG
    return MarsAction.REJECT


def _gradient_norm_bounds(updates_by_site: dict[str, np.ndarray]) -> dict[str, float]:
    norms = {site_id: float(np.linalg.norm(update)) for site_id, update in updates_by_site.items()}
    values = np.asarray(list(norms.values()), dtype=float)
    mean = float(np.mean(values))
    std = float(np.std(values))
    if std == 0.0:
        return {site_id: 1.0 for site_id in updates_by_site}

    scores: dict[str, float] = {}
    for site_id, norm in norms.items():
        z_score = abs(norm - mean) / std
        if z_score <= 2.0:
            scores[site_id] = 1.0
        elif z_score <= 3.0:
            scores[site_id] = float(1.0 - (z_score - 2.0))
        else:
            scores[site_id] = 0.0
    return scores
