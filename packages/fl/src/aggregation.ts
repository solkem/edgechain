import type {
  AggregationConfig,
  AggregationResult,
  GlobalModel,
  ModelSubmission,
  ModelWeights,
} from './types';

export const DEFAULT_AGGREGATION_CONFIG: AggregationConfig = {
  algorithm: 'weighted-fedavg',
  minSubmissions: 2,
  weightingStrategy: 'dataset-size',
  outlierDetection: true,
  outlierThreshold: 2.5,
};

export function federatedAveraging(
  submissions: ModelSubmission[],
  config: AggregationConfig = DEFAULT_AGGREGATION_CONFIG
): ModelWeights {
  if (submissions.length === 0) {
    throw new Error('No submissions to aggregate');
  }

  const rawWeights = submissions.map((submission) => {
    switch (config.weightingStrategy) {
      case 'dataset-size':
        return submission.datasetSize;
      case 'accuracy':
        return submission.metrics.accuracy;
      case 'equal':
        return 1;
      default:
        return 1;
    }
  });
  const totalWeight = rawWeights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = rawWeights.map((weight) => weight / totalWeight);
  const firstModel = submissions[0].modelWeights;

  const aggregatedWeights: ModelWeights = {
    layers: firstModel.layers.map((layer) => ({
      name: layer.name,
      weights: [],
      biases: [],
    })),
    totalParameters: firstModel.totalParameters,
    architecture: firstModel.architecture,
  };

  for (let layerIdx = 0; layerIdx < firstModel.layers.length; layerIdx++) {
    const layer = firstModel.layers[layerIdx];

    for (let weightIdx = 0; weightIdx < layer.weights.length; weightIdx++) {
      const weightMatrix = layer.weights[weightIdx];
      const rows = weightMatrix.length;
      const cols = weightMatrix[0]?.length || 0;
      const aggregatedMatrix: number[][] = Array(rows)
        .fill(0)
        .map(() => Array(cols).fill(0));

      for (let subIdx = 0; subIdx < submissions.length; subIdx++) {
        const submissionWeightMatrix = submissions[subIdx].modelWeights.layers[layerIdx].weights[weightIdx];
        const contributionWeight = normalizedWeights[subIdx];

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            aggregatedMatrix[row][col] += submissionWeightMatrix[row][col] * contributionWeight;
          }
        }
      }

      aggregatedWeights.layers[layerIdx].weights.push(aggregatedMatrix);
    }

    for (let biasIdx = 0; biasIdx < layer.biases.length; biasIdx++) {
      const biasVector = layer.biases[biasIdx];
      const aggregatedVector: number[] = Array(biasVector.length).fill(0);

      for (let subIdx = 0; subIdx < submissions.length; subIdx++) {
        const submissionBiasVector = submissions[subIdx].modelWeights.layers[layerIdx].biases[biasIdx];
        const contributionWeight = normalizedWeights[subIdx];

        for (let idx = 0; idx < biasVector.length; idx++) {
          aggregatedVector[idx] += submissionBiasVector[idx] * contributionWeight;
        }
      }

      aggregatedWeights.layers[layerIdx].biases.push(aggregatedVector);
    }
  }

  return aggregatedWeights;
}

export function aggregateModelUpdates(
  submissions: ModelSubmission[],
  round: number,
  currentVersion: number,
  config: AggregationConfig = DEFAULT_AGGREGATION_CONFIG
): AggregationResult {
  if (submissions.length < config.minSubmissions) {
    throw new Error(`Not enough submissions (${submissions.length} < ${config.minSubmissions})`);
  }

  const globalWeights = federatedAveraging(submissions, config);
  const totalSamples = submissions.reduce((sum, submission) => sum + submission.datasetSize, 0);

  return {
    round,
    modelVersion: currentVersion + 1,
    globalWeights,
    numSubmissions: submissions.length,
    participatingFarmers: submissions.map((submission) => submission.farmerId),
    aggregationMetrics: {
      averageLoss:
        submissions.reduce((sum, submission) => sum + submission.metrics.loss * submission.datasetSize, 0) /
        totalSamples,
      averageMae:
        submissions.reduce((sum, submission) => sum + submission.metrics.mae * submission.datasetSize, 0) /
        totalSamples,
      weightedAccuracy:
        submissions.reduce(
          (sum, submission) => sum + submission.metrics.accuracy * submission.datasetSize,
          0
        ) / totalSamples,
    },
    timestamp: Date.now(),
  };
}

export function createGlobalModel(
  aggregationResult: AggregationResult,
  submissions: ModelSubmission[]
): GlobalModel {
  const totalSamples = submissions.reduce((sum, submission) => sum + submission.datasetSize, 0);

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
      globalMse: aggregationResult.aggregationMetrics.averageLoss,
      confidence: aggregationResult.aggregationMetrics.weightedAccuracy,
    },
  };
}
