/**
 * FL Aggregation Service
 *
 * Manages model submissions and performs FedAvg aggregation
 * Uses canonical aggregation logic from @edgechain/fl.
 */

import {
  aggregateModelUpdates,
  createGlobalModel,
  ModelSubmission,
  GlobalModel,
  DEFAULT_AGGREGATION_CONFIG,
} from '@edgechain/fl';

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
      const result = aggregateModelUpdates(
        this.submissions,
        this.currentRound,
        this.currentVersion,
        {
          ...DEFAULT_AGGREGATION_CONFIG,
          minSubmissions: this.minSubmissions,
        }
      );

      this.globalModel = createGlobalModel(result, this.submissions);
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
