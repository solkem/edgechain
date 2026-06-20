/**
 * Federated Learning Type Definitions
 *
 * This file defines all TypeScript types for the EdgeChain FL system
 */

import type { GlobalModel, ModelSubmission, ModelWeights } from '@edgechain/fl';

export type {
  AggregationAlgorithm,
  AggregationConfig,
  AggregationResult,
  FarmDataPoint,
  FarmDataset,
  GlobalModel,
  ModelArchitecture,
  ModelSubmission,
  ModelWeights,
  PredictionInput,
  PredictionOutput,
} from '@edgechain/fl';

// ============================================================================
// TRAINING
// ============================================================================

/**
 * Training configuration
 */
export interface TrainingConfig {
  epochs: number;            // number of training iterations
  batchSize: number;         // samples per batch
  validationSplit: number;   // fraction for validation (0.2 = 20%)
  learningRate: number;      // optimizer learning rate
  earlyStopping: boolean;    // stop if no improvement
  patience: number;          // epochs to wait before stopping
}

/**
 * Training metrics collected during local training
 */
export interface TrainingMetrics {
  epoch: number;
  loss: number;              // training loss
  mae: number;               // mean absolute error
  mse: number;               // mean squared error
  valLoss?: number;          // validation loss
  valMae?: number;           // validation MAE
  valMse?: number;           // validation MSE
  timestamp: number;
}

/**
 * Complete training result
 */
export interface TrainingResult {
  farmerId: string;
  modelWeights: ModelWeights;
  metrics: TrainingMetrics[];
  finalMetrics: {
    trainLoss: number;
    trainMae: number;
    trainMse: number;
    valLoss: number;
    valMae: number;
    valMse: number;
  };
  datasetSize: number;
  trainingTime: number;      // milliseconds
  timestamp: number;
}

// ============================================================================
// FL SYSTEM STATE
// ============================================================================

/**
 * Current state of the FL system
 */
export interface FLSystemState {
  currentRound: number;
  currentVersion: number;
  globalModel: GlobalModel | null;
  isTraining: boolean;
  hasSubmittedThisRound: boolean;
  lastSubmission?: ModelSubmission;
  localDataset: FarmDataset | null;
  trainingHistory: TrainingResult[];
}

/**
 * FL statistics for farmer
 */
export interface FarmerFLStats {
  totalSubmissions: number;
  averageAccuracy: number;
  totalSampleContributed: number;
  roundsParticipated: number;
  tokensEarned: number;
  rank?: number;             // leaderboard position
}
