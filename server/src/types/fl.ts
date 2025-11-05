/**
 * FL Type Definitions for Backend
 * (Subset of types from packages/ui/src/fl/types.ts)
 */

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

export interface AggregationConfig {
  algorithm: 'fedavg' | 'weighted-fedavg' | 'median';
  minSubmissions: number;
  weightingStrategy: 'equal' | 'accuracy' | 'dataset-size';
  outlierDetection: boolean;
  outlierThreshold: number;
}
