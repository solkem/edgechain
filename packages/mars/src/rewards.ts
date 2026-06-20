import { gini } from './math';
import type { MarsScore } from './types';

export function allocateRewards(scores: MarsScore[], roundBudget: number): Record<string, number> {
  const eligible = scores.filter((score) => score.eligibleForReward && score.hasScore > 0);
  if (eligible.length === 0) {
    return {};
  }

  const total = eligible.reduce((sum, score) => sum + score.composite, 0);
  if (total === 0) {
    return {};
  }

  return Object.fromEntries(
    eligible.map((score) => [score.siteId, (score.composite / total) * roundBudget]),
  );
}

export function rewardGini(scores: MarsScore[], roundBudget: number): number {
  return gini(Object.values(allocateRewards(scores, roundBudget)));
}
