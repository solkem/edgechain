"""MARS reward allocation."""

from __future__ import annotations

from edgechain_lab.data.schemas import MarsScore
from edgechain_lab.fl.metrics import gini


def allocate_rewards(scores: list[MarsScore], round_budget: float) -> dict[str, float]:
    """Allocate rewards proportionally to reward-eligible composite scores."""

    eligible = [score for score in scores if score.eligible_for_reward and score.has_score > 0.0]
    if not eligible:
        return {}

    total = sum(score.composite for score in eligible)
    if total == 0.0:
        return {}

    return {score.site_id: (score.composite / total) * round_budget for score in eligible}


def reward_gini(scores: list[MarsScore], round_budget: float) -> float:
    """Compute Gini coefficient for allocated rewards."""

    rewards = allocate_rewards(scores, round_budget)
    return gini(list(rewards.values()))

