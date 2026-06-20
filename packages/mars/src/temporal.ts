import { clamp, cosineSimilarity } from './math';
import type { TemporalHistory as TemporalHistoryContract } from './types';

export class TemporalHistory implements TemporalHistoryContract {
  private readonly maxHistory: number;

  private readonly history = new Map<string, number[][]>();

  constructor(maxHistory = 10) {
    this.maxHistory = maxHistory;
  }

  scoreAndUpdate(siteId: string, update: number[]): number {
    const history = this.history.get(siteId) ?? [];
    if (history.length < 2) {
      this.append(siteId, history, update);
      return 0.7;
    }

    const score = clamp(cosineSimilarity(update, exponentialMovingAverage(history)));
    this.append(siteId, history, update);
    return score;
  }

  private append(siteId: string, history: number[][], update: number[]): void {
    const next = [...history, update].slice(-this.maxHistory);
    this.history.set(siteId, next);
  }
}

function exponentialMovingAverage(history: number[][], decay = 0.8): number[] {
  const ordered = [...history].reverse();
  const rawWeights = ordered.map((_, index) => decay ** index);
  const totalWeight = rawWeights.reduce((sum, weight) => sum + weight, 0);
  const weights = rawWeights.map((weight) => weight / totalWeight);
  const dimension = ordered[0]?.length ?? 0;

  return Array.from({ length: dimension }, (_, dimensionIndex) =>
    ordered.reduce((sum, update, updateIndex) => sum + weights[updateIndex] * (update[dimensionIndex] ?? 0), 0),
  );
}
