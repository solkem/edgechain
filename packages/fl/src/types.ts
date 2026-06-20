import type { FarmDataset } from './data';

export interface ModelArchitecture {
  inputDim: number;
  hiddenLayers: number[];
  outputDim: number;
  activation: string;
  optimizer: string;
  loss: string;
  metrics: string[];
}

export interface ModelWeights {
  layers: {
    name: string;
    weights: number[][][];
    biases: number[][];
  }[];
  totalParameters: number;
  architecture: ModelArchitecture;
}

export interface ModelSubmission {
  farmerId: string;
  modelWeights: ModelWeights;
  weightsHash: string;
  metrics: {
    loss: number;
    mae: number;
    accuracy: number;
  };
  datasetSize: number;
  round: number;
  modelVersion: number;
  timestamp: number;
  signature?: string;
  txHash?: string;
}

export type AggregationAlgorithm = 'fedavg' | 'weighted-fedavg' | 'median';

export interface AggregationConfig {
  algorithm: AggregationAlgorithm;
  minSubmissions: number;
  weightingStrategy: 'equal' | 'accuracy' | 'dataset-size';
  outlierDetection: boolean;
  outlierThreshold: number;
}

export interface AggregationResult {
  round: number;
  modelVersion: number;
  globalWeights: ModelWeights;
  numSubmissions: number;
  participatingFarmers: string[];
  aggregationMetrics: {
    averageLoss: number;
    averageMae: number;
    weightedAccuracy: number;
  };
  timestamp: number;
  txHash?: string;
}

export interface GlobalModel {
  version: number;
  round: number;
  weights: ModelWeights;
  architecture: ModelArchitecture;
  metadata: {
    trainedBy: number;
    totalSamples: number;
    averageAccuracy: number;
    createdAt: number;
    ipfsHash?: string;
  };
  performanceMetrics: {
    globalMae: number;
    globalMse: number;
    confidence: number;
  };
}

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  validationSplit: number;
  learningRate: number;
  earlyStopping: boolean;
  patience: number;
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  mae: number;
  mse: number;
  valLoss?: number;
  valMae?: number;
  valMse?: number;
  timestamp: number;
}

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
  trainingTime: number;
  timestamp: number;
}

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

export interface FarmerFLStats {
  totalSubmissions: number;
  averageAccuracy: number;
  totalSampleContributed: number;
  roundsParticipated: number;
  tokensEarned: number;
  rank?: number;
}
