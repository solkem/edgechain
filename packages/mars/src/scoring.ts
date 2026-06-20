import { clamp, mean, norm, standardDeviation } from './math';
import { DEFAULT_PHYSICAL_BOUNDS, physicalPlausibilityScore } from './physical';
import { spatialJuryScore } from './spatial';
import { TemporalHistory } from './temporal';
import type { ClientUpdate, MarsAction, MarsScore, MarsThresholds, MarsWeights, ScoreRoundOptions } from './types';

export const DEFAULT_THRESHOLDS: MarsThresholds = {
  accept: 0.7,
  flag: 0.5,
  reward: 0.6,
};

export const DEFAULT_WEIGHTS: MarsWeights = {
  physicalPlausibility: 0.36,
  spatialJury: 0.36,
  temporalConsistency: 0.21,
  gradientNormBounds: 0.07,
};

export function scoreRound(
  updates: ClientUpdate[],
  clusterBySite: Record<string, string>,
  options: ScoreRoundOptions,
): MarsScore[] {
  const thresholds = options.thresholds ?? DEFAULT_THRESHOLDS;
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  validateWeights(weights);

  const history = options.history ?? new TemporalHistory();
  const physicalBounds = options.physicalBounds ?? DEFAULT_PHYSICAL_BOUNDS;
  const updatesBySite = Object.fromEntries(updates.map((update) => [update.siteId, update.updateVector]));
  const normScores = gradientNormBounds(updatesBySite);

  return updates.map((update) => {
    const vector = updatesBySite[update.siteId];
    const hasScore = update.hasValidAttestation ? 1 : 0;
    const physicalPlausibility = physicalPlausibilityScore(
      vector,
      physicalBounds,
      options.seed + update.roundId,
    );
    const spatialJury = spatialJuryScore(update.siteId, updatesBySite, clusterBySite);
    const temporalConsistency = history.scoreAndUpdate(update.siteId, vector);
    const gradientNormBoundsScore = normScores[update.siteId] ?? 0;
    const composite = compositeScore(
      hasScore,
      physicalPlausibility,
      spatialJury,
      temporalConsistency,
      gradientNormBoundsScore,
      weights,
    );

    return {
      roundId: update.roundId,
      siteId: update.siteId,
      hasScore,
      physicalPlausibility,
      spatialJury,
      temporalConsistency,
      gradientNormBounds: gradientNormBoundsScore,
      composite,
      action: actionForComposite(composite, thresholds),
      eligibleForReward: composite >= thresholds.reward && hasScore > 0,
    };
  });
}

export function compositeScore(
  hasScore: number,
  physicalPlausibility: number,
  spatialJury: number,
  temporalConsistency: number,
  gradientNormBoundsScore: number,
  weights: MarsWeights = DEFAULT_WEIGHTS,
): number {
  if (hasScore === 0) {
    return 0;
  }

  return clamp(
    hasScore *
      (weights.physicalPlausibility * physicalPlausibility +
        weights.spatialJury * spatialJury +
        weights.temporalConsistency * temporalConsistency +
        weights.gradientNormBounds * gradientNormBoundsScore),
  );
}

export function actionForComposite(composite: number, thresholds: MarsThresholds = DEFAULT_THRESHOLDS): MarsAction {
  if (composite >= thresholds.accept) {
    return 'accept';
  }
  if (composite >= thresholds.flag) {
    return 'flag';
  }
  return 'reject';
}

export function gradientNormBounds(updatesBySite: Record<string, number[]>): Record<string, number> {
  const norms = Object.fromEntries(
    Object.entries(updatesBySite).map(([siteId, update]) => [siteId, norm(update)]),
  );
  const values = Object.values(norms);
  const average = mean(values);
  const std = standardDeviation(values);
  if (std === 0) {
    return Object.fromEntries(Object.keys(updatesBySite).map((siteId) => [siteId, 1]));
  }

  return Object.fromEntries(
    Object.entries(norms).map(([siteId, updateNorm]) => {
      const zScore = Math.abs(updateNorm - average) / std;
      if (zScore <= 2) {
        return [siteId, 1];
      }
      if (zScore <= 3) {
        return [siteId, 1 - (zScore - 2)];
      }
      return [siteId, 0];
    }),
  );
}

function validateWeights(weights: MarsWeights): void {
  const total =
    weights.physicalPlausibility +
    weights.spatialJury +
    weights.temporalConsistency +
    weights.gradientNormBounds;

  if (Math.abs(total - 1) > 1e-6) {
    throw new Error('MARS weights must sum to 1.0');
  }
}
