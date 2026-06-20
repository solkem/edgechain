export type {
  ClientUpdate,
  MarsAction,
  MarsScore,
  MarsThresholds,
  MarsWeights,
  PhysicalBounds,
  ScoreRoundOptions,
  TemporalHistory as TemporalHistoryContract,
} from './types';

export {
  clamp,
  cosineSimilarity,
  gini,
} from './math';
export {
  DEFAULT_PHYSICAL_BOUNDS,
  physicalPlausibilityScore,
} from './physical';
export { spatialJuryScore } from './spatial';
export { TemporalHistory } from './temporal';
export {
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHTS,
  actionForComposite,
  compositeScore,
  gradientNormBounds,
  scoreRound,
} from './scoring';
export {
  allocateRewards,
  rewardGini,
} from './rewards';
