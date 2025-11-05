/**
 * Federated Learning Type Definitions
 *
 * This file defines all TypeScript types for the EdgeChain FL system
 */

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
// MODEL ARCHITECTURE
// ============================================================================

/**
 * Neural network architecture for crop yield prediction
 * Simple feedforward network suitable for browser training
 */
export interface ModelArchitecture {
  inputDim: number;          // number of input features
  hiddenLayers: number[];    // neurons per hidden layer [64, 32, 16]
  outputDim: number;         // 1 (yield prediction)
  activation: string;        // 'relu' for hidden, 'linear' for output
  optimizer: string;         // 'adam'
  loss: string;              // 'meanSquaredError'
  metrics: string[];         // ['mae', 'mse']
}

/**
 * Model weights (parameters) that can be serialized
 */
export interface ModelWeights {
  layers: {
    name: string;
    weights: number[][][];   // 3D array of weight matrices
    biases: number[][];      // 2D array of bias vectors
  }[];
  totalParameters: number;
  architecture: ModelArchitecture;
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
// SUBMISSION
// ============================================================================

/**
 * Model update submission to FL aggregator
 * This is what gets sent to the blockchain with ZK-proof
 */
export interface ModelSubmission {
  farmerId: string;          // Midnight wallet address
  modelWeights: ModelWeights;
  weightsHash: string;       // SHA-256 hash of weights
  metrics: {
    loss: number;
    mae: number;
    accuracy: number;        // 1 - (mae / mean_yield)
  };
  datasetSize: number;       // number of samples trained on
  round: number;             // FL round number
  modelVersion: number;      // global model version used
  timestamp: number;

  // ZK-proof related (filled after signing)
  signature?: string;
  txHash?: string;
}

// ============================================================================
// AGGREGATION
// ============================================================================

/**
 * Aggregation algorithm type
 */
export type AggregationAlgorithm = 'fedavg' | 'weighted-fedavg' | 'median';

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
  algorithm: AggregationAlgorithm;
  minSubmissions: number;    // minimum submissions to aggregate
  weightingStrategy: 'equal' | 'accuracy' | 'dataset-size';
  outlierDetection: boolean; // remove outlier submissions
  outlierThreshold: number;  // z-score threshold
}

/**
 * Aggregation result
 */
export interface AggregationResult {
  round: number;
  modelVersion: number;      // new version number
  globalWeights: ModelWeights;
  numSubmissions: number;
  participatingFarmers: string[];
  aggregationMetrics: {
    averageLoss: number;
    averageMae: number;
    weightedAccuracy: number;
  };
  timestamp: number;
  txHash?: string;           // on-chain record
}

// ============================================================================
// MODEL DISTRIBUTION
// ============================================================================

/**
 * Global model package for download
 */
export interface GlobalModel {
  version: number;
  round: number;
  weights: ModelWeights;
  architecture: ModelArchitecture;
  metadata: {
    trainedBy: number;       // number of farmers
    totalSamples: number;    // total training samples
    averageAccuracy: number;
    createdAt: number;
    ipfsHash?: string;       // IPFS storage hash
  };
  performanceMetrics: {
    globalMae: number;
    globalMse: number;
    confidence: number;
  };
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
