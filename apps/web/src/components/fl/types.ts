/**
 * Shared types for FL Dashboard components
 */

import type { GlobalModel, TrainingResult, ModelSubmission, TrainingMetrics } from '../../fl/types';

export interface FLState {
  currentRound: number;
  currentVersion: number;
  globalModel: GlobalModel | null;
  isTraining: boolean;
  lastTraining: TrainingResult | null;
  lastSubmission: ModelSubmission | null;
}

export interface TrainingProgress {
  currentEpoch: number;
  totalEpochs: number;
  metrics: TrainingMetrics | null;
}

export interface AggregationProgress {
  running: boolean;
  progress: number;
  message: string;
}

export interface AggregationStatus {
  canAggregate: boolean;
  currentSubmissions: number;
  requiredSubmissions: number;
  message?: string;
}

export interface ZKProofState {
  isGenerating: boolean;
  proofGenerated: boolean;
  proofDetails: {
    txHash?: string;
    signature?: string;
    timestamp?: number;
    proofSize?: number;
    circuitName?: string;
  } | null;
  verificationStatus?: 'pending' | 'verified' | 'failed';
}
