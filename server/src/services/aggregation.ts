/**
 * FL Aggregation Service
 *
 * Manages model submissions and performs FedAvg aggregation
 * Uses the same aggregation logic from the UI package
 */

import type {
  ModelSubmission,
  GlobalModel,
  AggregationResult,
  ModelWeights,
  AggregationConfig,
} from '../types/fl';

export class AggregationService {
  private submissions: ModelSubmission[] = [];
  private globalModel: GlobalModel | null = null;
  private currentRound: number = 1;
  private currentVersion: number = 0;
  private minSubmissions: number = 2; // Minimum submissions before aggregating

  constructor() {
    console.log(`⚙️  Aggregation Service initialized`);
    console.log(`📋 Min submissions required: ${this.minSubmissions}`);
  }

  /**
   * Add a farmer's submission and trigger aggregation if threshold reached
   */
  async addSubmission(submission: ModelSubmission): Promise<{
    submissionCount: number;
    aggregated: boolean;
    globalModelVersion: number | null;
  }> {
    // Validate submission
    this.validateSubmission(submission);

    // Add to submissions
    this.submissions.push(submission);

    console.log(`📝 Submission stored (${this.submissions.length}/${this.minSubmissions})`);

    // Check if we have enough submissions to aggregate
    if (this.submissions.length >= this.minSubmissions) {
      await this.runAggregation();
      return {
        submissionCount: this.submissions.length,
        aggregated: true,
        globalModelVersion: this.currentVersion,
      };
    }

    return {
      submissionCount: this.submissions.length,
      aggregated: false,
      globalModelVersion: null,
    };
  }

  /**
   * Run FedAvg aggregation on collected submissions
   */
  private async runAggregation(): Promise<void> {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║   🚀 STARTING FL AGGREGATION 🚀     ║');
    console.log('╔══════════════════════════════════════╗');
    console.log(`Round: ${this.currentRound}`);
    console.log(`Submissions: ${this.submissions.length}`);
    console.log('══════════════════════════════════════\n');

    try {
      // Run FedAvg algorithm
      const result = await this.aggregateModelUpdates(
        this.submissions,
        this.currentRound,
        this.currentVersion
      );

      // Create global model
      this.globalModel = this.createGlobalModel(result, this.submissions);
      this.currentVersion = this.globalModel.version;

      console.log('\n╔══════════════════════════════════════╗');
      console.log('║   ✅ AGGREGATION COMPLETE! ✅        ║');
      console.log('╚══════════════════════════════════════╝');
      console.log(`🌐 Global Model v${this.globalModel.version} created`);
      console.log(`👨‍🌾 Trained by: ${this.globalModel.metadata.trainedBy} farmers`);
      console.log(`📊 Total samples: ${this.globalModel.metadata.totalSamples}`);
      console.log(`🎯 Global MAE: ${this.globalModel.performanceMetrics.globalMae.toFixed(4)}`);
      console.log(`✨ Accuracy: ${(this.globalModel.metadata.averageAccuracy * 100).toFixed(1)}%`);
      console.log('══════════════════════════════════════\n');
      console.log('📢 Farmers can now download the global model!\n');

      // Reset for next round
      this.submissions = [];
      this.currentRound++;
    } catch (error: any) {
      console.error('❌ Aggregation failed:', error.message);
      throw error;
    }
  }

  /**
   * FedAvg aggregation algorithm
   * (Simplified version - in production, import from ../packages/ui/src/fl/aggregation.ts)
   */
  private async aggregateModelUpdates(
    submissions: ModelSubmission[],
    round: number,
    currentVersion: number
  ): Promise<AggregationResult> {
    console.log('🔄 Running FedAvg algorithm...\n');

    // Calculate weights for each submission (by dataset size)
    const totalSamples = submissions.reduce((sum, s) => sum + s.datasetSize, 0);
    const weights = submissions.map(s => s.datasetSize / totalSamples);

    console.log('📊 Submission weights:');
    submissions.forEach((s, i) => {
      console.log(`   Farmer ${i + 1}: ${(weights[i] * 100).toFixed(1)}% (${s.datasetSize} samples)`);
    });

    // Get first model structure
    const firstModel = submissions[0].modelWeights;

    // Initialize aggregated weights
    const aggregatedWeights: ModelWeights = {
      layers: firstModel.layers.map(layer => ({
        name: layer.name,
        weights: [],
        biases: [],
      })),
      totalParameters: firstModel.totalParameters,
      architecture: firstModel.architecture,
    };

    // Aggregate each layer
    console.log('\n🔧 Aggregating layers...');
    for (let layerIdx = 0; layerIdx < firstModel.layers.length; layerIdx++) {
      const layer = firstModel.layers[layerIdx];

      // Aggregate weight matrices
      for (let weightIdx = 0; weightIdx < layer.weights.length; weightIdx++) {
        const weightMatrix = layer.weights[weightIdx];
        const rows = weightMatrix.length;
        const cols = weightMatrix[0]?.length || 0;

        const aggregatedMatrix: number[][] = Array(rows)
          .fill(0)
          .map(() => Array(cols).fill(0));

        // Weighted sum
        for (let subIdx = 0; subIdx < submissions.length; subIdx++) {
          const submission = submissions[subIdx].modelWeights;
          const submissionWeightMatrix = submission.layers[layerIdx].weights[weightIdx];
          const weight = weights[subIdx];

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

        const aggregatedVector: number[] = Array(length).fill(0);

        for (let subIdx = 0; subIdx < submissions.length; subIdx++) {
          const submission = submissions[subIdx].modelWeights;
          const submissionBiasVector = submission.layers[layerIdx].biases[biasIdx];
          const weight = weights[subIdx];

          for (let i = 0; i < length; i++) {
            aggregatedVector[i] += submissionBiasVector[i] * weight;
          }
        }

        aggregatedWeights.layers[layerIdx].biases.push(aggregatedVector);
      }

      console.log(`   ✅ Layer ${layerIdx + 1}/${firstModel.layers.length} aggregated`);
    }

    // Calculate aggregation metrics
    const averageLoss =
      submissions.reduce((sum, s) => sum + s.metrics.loss * s.datasetSize, 0) / totalSamples;
    const averageMae =
      submissions.reduce((sum, s) => sum + s.metrics.mae * s.datasetSize, 0) / totalSamples;
    const weightedAccuracy =
      submissions.reduce((sum, s) => sum + s.metrics.accuracy * s.datasetSize, 0) / totalSamples;

    console.log('\n✅ FedAvg complete!\n');

    return {
      round,
      modelVersion: currentVersion + 1,
      globalWeights: aggregatedWeights,
      numSubmissions: submissions.length,
      participatingFarmers: submissions.map(s => s.farmerId),
      aggregationMetrics: {
        averageLoss,
        averageMae,
        weightedAccuracy,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Create global model package
   */
  private createGlobalModel(
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
        globalMse: aggregationResult.aggregationMetrics.averageLoss,
        confidence: aggregationResult.aggregationMetrics.weightedAccuracy,
      },
    };
  }

  /**
   * Get current global model
   */
  getGlobalModel(): GlobalModel | null {
    return this.globalModel;
  }

  /**
   * Get FL system status
   */
  getStatus() {
    return {
      currentRound: this.currentRound,
      currentVersion: this.currentVersion,
      pendingSubmissions: this.submissions.length,
      minSubmissions: this.minSubmissions,
      globalModelAvailable: this.globalModel !== null,
      globalModelVersion: this.globalModel?.version || null,
    };
  }

  /**
   * Reset aggregation state (for demo)
   */
  reset(): void {
    this.submissions = [];
    this.globalModel = null;
    this.currentRound = 1;
    this.currentVersion = 0;
  }

  /**
   * Validate submission
   */
  private validateSubmission(submission: ModelSubmission): void {
    if (!submission.farmerId) {
      throw new Error('Missing farmerId');
    }
    if (!submission.modelWeights) {
      throw new Error('Missing modelWeights');
    }
    if (!submission.signature) {
      throw new Error('Missing signature');
    }
    if (!submission.datasetSize || submission.datasetSize <= 0) {
      throw new Error('Invalid datasetSize');
    }
  }
}
