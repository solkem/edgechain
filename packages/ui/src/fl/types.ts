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
  GlobalModel,
  ModelArchitecture,
  ModelSubmission,
  ModelWeights,
} from '@edgechain/fl';

// ============================================================================
// DATA COLLECTION
// ============================================================================

/**
 * Agricultural data point collected from farmer
 * This is the training data that stays LOCAL on farmer's device
 */
export interface FarmDataPoint {
  // Input features
  rainfall: number;          // mm per season
  temperature: number;       // average celsius
  soilType: string;          // 'loamy' | 'clay' | 'sandy' | 'silty' | 'peaty'
  irrigationType: string;    // 'drip' | 'sprinkler' | 'flood' | 'rainfed'
  farmSize: number;          // hectares
  fertilizer: number;        // kg per hectare
  pesticides: number;        // applications per season

  // Target (what we're predicting)
  yield: number;             // tons per hectare

  // Metadata
  cropType: string;          // 'wheat' | 'corn' | 'rice' | etc.
  season: string;            // '2024-spring' | '2024-fall' etc.
  timestamp: number;         // when data was collected
}

/**
 * Collection of farm data points for training
 */
export interface FarmDataset {
  farmerId: string;          // Midnight wallet address
  dataPoints: FarmDataPoint[];
  privacyLevel: 'basic' | 'enhanced' | 'detailed';
  totalSamples: number;
  crops: string[];           // unique crops in dataset
  dateRange: {
    start: number;
    end: number;
  };
}

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
// INFERENCE
// ============================================================================

/**
 * Input for crop yield prediction
 */
export interface PredictionInput {
  rainfall: number;
  temperature: number;
  soilType: string;
  irrigationType: string;
  farmSize: number;
  fertilizer: number;
  pesticides: number;
  cropType: string;
}

/**
 * Prediction output
 */
export interface PredictionOutput {
  predictedYield: number;    // tons per hectare
  confidence: number;        // 0-1 score
  modelVersion: number;
  timestamp: number;
  explanation?: {
    topFactors: {
      feature: string;
      impact: number;        // relative importance
    }[];
  };
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
