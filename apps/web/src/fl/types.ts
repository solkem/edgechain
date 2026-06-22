/**
 * Compatibility re-exports for web FL modules.
 *
 * Canonical FL data, model, prediction, and training types live in
 * @edgechain/fl. Keeping this local facade lets React components import from
 * one web-owned path while the shared package remains the source of truth.
 */

export type {
  AggregationAlgorithm,
  AggregationConfig,
  AggregationResult,
  FarmDataPoint,
  FarmDataset,
  FarmerFLStats,
  FLSystemState,
  GlobalModel,
  ModelArchitecture,
  ModelSubmission,
  ModelWeights,
  PredictionInput,
  PredictionOutput,
  TrainingConfig,
  TrainingMetrics,
  TrainingResult,
} from '@edgechain/fl';
