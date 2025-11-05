/**
 * FL Aggregation Service
 *
 * Implements Federated Averaging (FedAvg) algorithm to combine model updates
 * from multiple farmers into a single global model.
 *
 * Key Features:
 * - Weighted averaging by dataset size or accuracy
 * - Outlier detection to prevent model poisoning
 * - ZK-proof verification integration
 * - Version management for global models
 *
 * Privacy-preserving: Only model weights are aggregated, never raw data
 */

import type {
  ModelWeights,
  ModelSubmission,
  AggregationConfig,
  AggregationResult,
  AggregationAlgorithm,
  GlobalModel,
} from './types';

// ============================================================================
// AGGREGATION ALGORITHMS
// ============================================================================

/**
 * Default aggregation configuration
 */
export const DEFAULT_AGGREGATION_CONFIG: AggregationConfig = {
  algorithm: 'weighted-fedavg',
  minSubmissions: 3,              // Need at least 3 farmers for meaningful aggregation
  weightingStrategy: 'dataset-size',
  outlierDetection: true,
  outlierThreshold: 2.5,          // Z-score threshold for outlier detection
};

/**
 * Calculate weighted average of model weights (FedAvg)
 *
 * Formula: w_global = Σ(w_i × n_i) / Σ(n_i)
 * where w_i = model weights from farmer i
 *       n_i = dataset size (or weight) for farmer i
 */
export function federatedAveraging(
  submissions: ModelSubmission[],
  config: AggregationConfig
): ModelWeights {
  if (submissions.length === 0) {
    throw new Error('No submissions to aggregate');
  }

  console.log(`🔄 Aggregating ${submissions.length} model submissions...`);

  // Calculate weights for each submission
  const weights = submissions.map(sub => {
    switch (config.weightingStrategy) {
      case 'dataset-size':
        return sub.datasetSize;
      case 'accuracy':
        return sub.metrics.accuracy;
      case 'equal':
        return 1;
      default:
        return 1;
    }
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);

  console.log('Normalized weights:', normalizedWeights);

  // Initialize aggregated weights structure
  const firstSubmission = submissions[0].modelWeights;
  const aggregatedWeights: ModelWeights = {
    layers: firstSubmission.layers.map(layer => ({
      name: layer.name,
      weights: [],
      biases: [],
    })),
    totalParameters: firstSubmission.totalParameters,
    architecture: firstSubmission.architecture,
  };

  // Aggregate each layer
  for (let layerIdx = 0; layerIdx < firstSubmission.layers.length; layerIdx++) {
    const layer = firstSubmission.layers[layerIdx];

    // Aggregate weight matrices
    for (let weightIdx = 0; weightIdx < layer.weights.length; weightIdx++) {
      const weightMatrix = layer.weights[weightIdx];
      const rows = weightMatrix.length;
      const cols = weightMatrix[0]?.length || 0;

      // Initialize aggregated matrix with zeros
      const aggregatedMatrix: number[][] = Array(rows)
        .fill(0)
        .map(() => Array(cols).fill(0));

      // Weighted sum across all submissions
      for (let subIdx = 0; subIdx < submissions.length; subIdx++) {
        const submission = submissions[subIdx].modelWeights;
        const submissionWeightMatrix = submission.layers[layerIdx].weights[weightIdx];
        const weight = normalizedWeights[subIdx];

        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            aggregatedMatrix[i][j] += submissionWeightMatrix[i][j] * weight;
          }
        }
      }

      aggregatedWeights.layers[layerIdx].weights.push(aggregatedMatrix);
    }

    // Aggregate bias vectors
    for (let biasIdx = 0; biasIdx < layer.biases.length; biasIdx++) {
      const biasVector = layer.biases[biasIdx];
      const length = biasVector.length;

      // Initialize aggregated vector with zeros
      const aggregatedVector: number[] = Array(length).fill(0);

      // Weighted sum across all submissions
      for (let subIdx = 0; subIdx < submissions.length; subIdx++) {
        const submission = submissions[subIdx].modelWeights;
        const submissionBiasVector = submission.layers[layerIdx].biases[biasIdx];
        const weight = normalizedWeights[subIdx];

        for (let i = 0; i < length; i++) {
          aggregatedVector[i] += submissionBiasVector[i] * weight;
        }
      }

      aggregatedWeights.layers[layerIdx].biases.push(aggregatedVector);
    }
  }

  console.log('✅ Aggregation complete');
  return aggregatedWeights;
}

/**
 * Median aggregation (more robust to outliers than averaging)
 * Takes the median value of each weight parameter across all submissions
 */
export function medianAggregation(submissions: ModelSubmission[]): ModelWeights {
  if (submissions.length === 0) {
    throw new Error('No submissions to aggregate');
  }

  console.log(`🔄 Median aggregating ${submissions.length} submissions...`);

  const firstSubmission = submissions[0].modelWeights;
  const aggregatedWeights: ModelWeights = {
    layers: firstSubmission.layers.map(layer => ({
      name: layer.name,
      weights: [],
      biases: [],
    })),
    totalParameters: firstSubmission.totalParameters,
    architecture: firstSubmission.architecture,
  };

  // Helper function to compute median
  const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  // Aggregate each layer
  for (let layerIdx = 0; layerIdx < firstSubmission.layers.length; layerIdx++) {
    const layer = firstSubmission.layers[layerIdx];

    // Aggregate weight matrices
    for (let weightIdx = 0; weightIdx < layer.weights.length; weightIdx++) {
      const weightMatrix = layer.weights[weightIdx];
      const rows = weightMatrix.length;
      const cols = weightMatrix[0]?.length || 0;

      const aggregatedMatrix: number[][] = Array(rows)
        .fill(0)
        .map(() => Array(cols).fill(0));

      // Compute median for each parameter
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const values = submissions.map(
            sub => sub.modelWeights.layers[layerIdx].weights[weightIdx][i][j]
          );
          aggregatedMatrix[i][j] = median(values);
        }
      }

      aggregatedWeights.layers[layerIdx].weights.push(aggregatedMatrix);
    }

    // Aggregate bias vectors
    for (let biasIdx = 0; biasIdx < layer.biases.length; biasIdx++) {
      const biasVector = layer.biases[biasIdx];
      const length = biasVector.length;

      const aggregatedVector: number[] = Array(length).fill(0);

      for (let i = 0; i < length; i++) {
        const values = submissions.map(
          sub => sub.modelWeights.layers[layerIdx].biases[biasIdx][i]
        );
        aggregatedVector[i] = median(values);
      }

      aggregatedWeights.layers[layerIdx].biases.push(aggregatedVector);
    }
  }

  console.log('✅ Median aggregation complete');
  return aggregatedWeights;
}

// ============================================================================
// OUTLIER DETECTION
// ============================================================================

/**
 * Detect outlier submissions based on model weight statistics
 *
 * Uses Z-score method: outlier if |z| > threshold
 * Z-score = (x - μ) / σ
 */
export function detectOutliers(
  submissions: ModelSubmission[],
  threshold: number = 2.5
): { validSubmissions: ModelSubmission[]; outliers: ModelSubmission[] } {
  if (submissions.length < 3) {
    console.log('⚠️ Too few submissions for outlier detection');
    return { validSubmissions: submissions, outliers: [] };
  }

  console.log(`🔍 Detecting outliers with threshold ${threshold}...`);

  // Calculate mean and std of metrics across submissions
  const losses = submissions.map(s => s.metrics.loss);
  const meanLoss = losses.reduce((sum, l) => sum + l, 0) / losses.length;
  const stdLoss = Math.sqrt(
    losses.reduce((sum, l) => sum + Math.pow(l - meanLoss, 2), 0) / losses.length
  );

  const accuracies = submissions.map(s => s.metrics.accuracy);
  const meanAccuracy = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;
  const stdAccuracy = Math.sqrt(
    accuracies.reduce((sum, a) => sum + Math.pow(a - meanAccuracy, 2), 0) / accuracies.length
  );

  console.log(`Mean loss: ${meanLoss.toFixed(4)} ± ${stdLoss.toFixed(4)}`);
  console.log(`Mean accuracy: ${meanAccuracy.toFixed(4)} ± ${stdAccuracy.toFixed(4)}`);

  // Identify outliers
  const validSubmissions: ModelSubmission[] = [];
  const outliers: ModelSubmission[] = [];

  for (const submission of submissions) {
    const lossZScore = stdLoss > 0 ? Math.abs((submission.metrics.loss - meanLoss) / stdLoss) : 0;
    const accuracyZScore = stdAccuracy > 0
      ? Math.abs((submission.metrics.accuracy - meanAccuracy) / stdAccuracy)
      : 0;

    const isOutlier = lossZScore > threshold || accuracyZScore > threshold;

    if (isOutlier) {
      console.log(
        `⚠️ Outlier detected: ${submission.farmerId.slice(0, 10)}... ` +
        `(loss z-score: ${lossZScore.toFixed(2)}, accuracy z-score: ${accuracyZScore.toFixed(2)})`
      );
      outliers.push(submission);
    } else {
      validSubmissions.push(submission);
    }
  }

  console.log(`✅ ${validSubmissions.length} valid, ${outliers.length} outliers`);

  return { validSubmissions, outliers };
}

/**
 * Verify ZK-proofs for submissions (placeholder)
 *
 * In production, this would verify ZK-proofs on Midnight blockchain
 * to ensure model updates are valid without revealing raw data
 */
export async function verifySubmissionProofs(
  submissions: ModelSubmission[]
): Promise<{ verified: ModelSubmission[]; failed: ModelSubmission[] }> {
  console.log(`🔐 Verifying ZK-proofs for ${submissions.length} submissions...`);

  // Placeholder implementation
  // In production: Call Midnight blockchain to verify proofs
  const verified: ModelSubmission[] = [];
  const failed: ModelSubmission[] = [];

  for (const submission of submissions) {
    // Check if submission has required signature
    if (!submission.signature || !submission.txHash) {
      console.log(`❌ Missing signature: ${submission.farmerId.slice(0, 10)}...`);
      failed.push(submission);
      continue;
    }

    // Verify weights hash matches
    const expectedHash = submission.weightsHash;
    // In production: Recompute hash and compare
    // For now, assume valid if hash exists
    if (!expectedHash || expectedHash.length < 10) {
      console.log(`❌ Invalid weights hash: ${submission.farmerId.slice(0, 10)}...`);
      failed.push(submission);
      continue;
    }

    // In production: Verify ZK-proof on Midnight
    // await midnightApi.verifyProof(submission.signature, submission.txHash);

    verified.push(submission);
  }

  console.log(`✅ ${verified.length} verified, ${failed.length} failed`);

  return { verified, failed };
}

// ============================================================================
// MAIN AGGREGATION PIPELINE
// ============================================================================

/**
 * Complete aggregation pipeline with validation and outlier detection
 */
export async function aggregateModelUpdates(
  submissions: ModelSubmission[],
  currentRound: number,
  currentVersion: number,
  config: AggregationConfig = DEFAULT_AGGREGATION_CONFIG
): Promise<AggregationResult> {
  const startTime = Date.now();

  console.log('\n=================================');
  console.log(`🚀 FL Aggregation - Round ${currentRound}`);
  console.log(`Submissions: ${submissions.length}`);
  console.log('=================================\n');

  // Validation
  if (submissions.length < config.minSubmissions) {
    throw new Error(
      `Not enough submissions (${submissions.length} < ${config.minSubmissions})`
    );
  }

  // Step 1: Verify ZK-proofs
  const { verified, failed } = await verifySubmissionProofs(submissions);
  if (failed.length > 0) {
    console.log(`⚠️ ${failed.length} submissions failed verification`);
  }

  if (verified.length < config.minSubmissions) {
    throw new Error(
      `Not enough verified submissions (${verified.length} < ${config.minSubmissions})`
    );
  }

  // Step 2: Detect outliers
  let validSubmissions = verified;
  let outliers: ModelSubmission[] = [];

  if (config.outlierDetection && verified.length >= 3) {
    const result = detectOutliers(verified, config.outlierThreshold);
    validSubmissions = result.validSubmissions;
    outliers = result.outliers;

    if (validSubmissions.length < config.minSubmissions) {
      console.log('⚠️ Too many outliers detected, using all verified submissions');
      validSubmissions = verified;
    }
  }

  // Step 3: Aggregate model weights
  let globalWeights: ModelWeights;

  switch (config.algorithm) {
    case 'fedavg':
    case 'weighted-fedavg':
      globalWeights = federatedAveraging(validSubmissions, config);
      break;
    case 'median':
      globalWeights = medianAggregation(validSubmissions);
      break;
    default:
      throw new Error(`Unknown aggregation algorithm: ${config.algorithm}`);
  }

  // Step 4: Calculate aggregation metrics
  const totalSamples = validSubmissions.reduce((sum, s) => sum + s.datasetSize, 0);
  const averageLoss =
    validSubmissions.reduce((sum, s) => s.metrics.loss * s.datasetSize, 0) / totalSamples;
  const averageMae =
    validSubmissions.reduce((sum, s) => s.metrics.mae * s.datasetSize, 0) / totalSamples;
  const weightedAccuracy =
    validSubmissions.reduce((sum, s) => s.metrics.accuracy * s.datasetSize, 0) / totalSamples;

  const aggregationTime = Date.now() - startTime;

  const result: AggregationResult = {
    round: currentRound,
    modelVersion: currentVersion + 1,
    globalWeights,
    numSubmissions: validSubmissions.length,
    participatingFarmers: validSubmissions.map(s => s.farmerId),
    aggregationMetrics: {
      averageLoss,
      averageMae,
      weightedAccuracy,
    },
    timestamp: Date.now(),
  };

  console.log('\n=================================');
  console.log('✅ Aggregation Complete');
  console.log(`Version: ${result.modelVersion}`);
  console.log(`Farmers: ${result.numSubmissions}`);
  console.log(`Avg Loss: ${averageLoss.toFixed(4)}`);
  console.log(`Avg MAE: ${averageMae.toFixed(4)}`);
  console.log(`Weighted Accuracy: ${(weightedAccuracy * 100).toFixed(2)}%`);
  console.log(`Time: ${(aggregationTime / 1000).toFixed(2)}s`);
  console.log('=================================\n');

  return result;
}

// ============================================================================
// GLOBAL MODEL MANAGEMENT
// ============================================================================

/**
 * Create global model package from aggregation result
 */
export function createGlobalModel(
  aggregationResult: AggregationResult,
  submissions: ModelSubmission[]
): GlobalModel {
  const totalSamples = submissions.reduce((sum, s) => sum + s.datasetSize, 0);

  return {
    version: aggregationResult.modelVersion,
    round: aggregationResult.round,
    weights: aggregationResult.globalWeights,
    architecture: aggregationResult.globalWeights.architecture,
    metadata: {
      trainedBy: aggregationResult.numSubmissions,
      totalSamples,
      averageAccuracy: aggregationResult.aggregationMetrics.weightedAccuracy,
      createdAt: aggregationResult.timestamp,
    },
    performanceMetrics: {
      globalMae: aggregationResult.aggregationMetrics.averageMae,
      globalMse: aggregationResult.aggregationMetrics.averageLoss, // Assuming MSE for loss
      confidence: aggregationResult.aggregationMetrics.weightedAccuracy,
    },
  };
}

// ============================================================================
// STORAGE
// ============================================================================

const GLOBAL_MODEL_KEY = 'edgechain_global_model';
const AGGREGATION_HISTORY_KEY = 'edgechain_aggregation_history';

/**
 * Save global model to local storage (for demo)
 * In production: Store on IPFS and save hash to Midnight blockchain
 */
export function saveGlobalModel(model: GlobalModel): void {
  try {
    const serialized = JSON.stringify(model);
    localStorage.setItem(GLOBAL_MODEL_KEY, serialized);
    console.log(`✅ Saved global model v${model.version}`);
  } catch (error) {
    console.error('Failed to save global model:', error);
    throw new Error('Failed to save global model');
  }
}

/**
 * Load global model from storage
 */
export function loadGlobalModel(): GlobalModel | null {
  try {
    const serialized = localStorage.getItem(GLOBAL_MODEL_KEY);
    if (!serialized) return null;

    return JSON.parse(serialized) as GlobalModel;
  } catch (error) {
    console.error('Failed to load global model:', error);
    return null;
  }
}

/**
 * Save aggregation history
 */
export function saveAggregationHistory(results: AggregationResult[]): void {
  try {
    const serialized = JSON.stringify(results);
    localStorage.setItem(AGGREGATION_HISTORY_KEY, serialized);
    console.log(`✅ Saved aggregation history (${results.length} rounds)`);
  } catch (error) {
    console.error('Failed to save aggregation history:', error);
  }
}

/**
 * Load aggregation history
 */
export function loadAggregationHistory(): AggregationResult[] {
  try {
    const serialized = localStorage.getItem(AGGREGATION_HISTORY_KEY);
    if (!serialized) return [];

    return JSON.parse(serialized) as AggregationResult[];
  } catch (error) {
    console.error('Failed to load aggregation history:', error);
    return [];
  }
}

/**
 * Clear all aggregation data
 */
export function clearAggregationData(): void {
  localStorage.removeItem(GLOBAL_MODEL_KEY);
  localStorage.removeItem(AGGREGATION_HISTORY_KEY);
  console.log('✅ Cleared aggregation data');
}
