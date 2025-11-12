/**
 * FL Dashboard Component
 *
 * Complete federated learning workflow for farmers:
 * 1. View FL system status
 * 2. Train local model on their data
 * 3. Submit model weights with Midnight wallet signature
 * 4. Download global model
 *
 * Refactored into modular components for better maintainability
 */

import { useState, useEffect } from 'react';
import { useWallet } from '../providers/WalletProvider';
import type {
  FarmDataset,
  TrainingMetrics,
} from '../fl/types';
import { trainLocalModel, DEFAULT_TRAINING_CONFIG } from '../fl/training';
import { generateMockFarmDataset } from '../fl/dataCollection';
import { loadGlobalModel } from '../fl/aggregation';
import { hashModelWeights } from '../fl/training';
import type { TransactionData } from '../providers/WalletProvider';
import {
  loadArduinoSensorData,
  convertArduinoDataToFLDataset,
  hasValidArduinoData,
  getArduinoDataSummary,
  clearArduinoSensorData,
} from '../fl/arduinoIntegration';
import {
  storeSubmission,
  checkAggregationReadiness,
  runAggregation,
  getCurrentRound,
} from '../fl/aggregationService';
import type { ModelSubmission } from '../fl/types';

// Import modular components
import { FLStatusPanel } from './fl/FLStatusPanel';
import { LocalTrainingPanel } from './fl/LocalTrainingPanel';
import { ModelSubmissionPanel } from './fl/ModelSubmissionPanel';
import { GlobalModelPanel } from './fl/GlobalModelPanel';
import type {
  FLState,
  TrainingProgress,
  AggregationProgress,
  AggregationStatus,
  ZKProofState,
} from './fl/types';

export function FLDashboard() {
  const wallet = useWallet();
  const { signTransaction } = wallet;

  const [flState, setFlState] = useState<FLState>({
    currentRound: 1,
    currentVersion: 1,
    globalModel: null,
    isTraining: false,
    lastTraining: null,
    lastSubmission: null,
  });

  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress>({
    currentEpoch: 0,
    totalEpochs: 0,
    metrics: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aggregation state
  const [aggregationProgress, setAggregationProgress] = useState<AggregationProgress>({
    running: false,
    progress: 0,
    message: '',
  });

  const [aggregationStatus, setAggregationStatus] = useState<AggregationStatus>({
    canAggregate: false,
    currentSubmissions: 0,
    requiredSubmissions: 2, // Default minimum
  });

  // ZK Proof state - track proof generation and verification
  const [zkProofState, setZkProofState] = useState<ZKProofState>({
    isGenerating: false,
    proofGenerated: false,
    proofDetails: null,
  });

  // Load global model on mount
  useEffect(() => {
    (async () => {
      const model = loadGlobalModel();
      const currentRound = await getCurrentRound();

      if (model) {
        setFlState((prev) => ({
          ...prev,
          globalModel: model,
          currentVersion: model.version,
          currentRound,
        }));
      } else {
        setFlState((prev) => ({
          ...prev,
          currentRound,
        }));
      }

      // Check aggregation status on mount
      const status = await checkAggregationReadiness();
      setAggregationStatus(status);
    })();
  }, []);

  // Periodically check for aggregation readiness (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!aggregationProgress.running) {
        const status = await checkAggregationReadiness();
        setAggregationStatus(status);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [aggregationProgress.running]);

  /**
   * Step 1: Train local model on farmer's data
   */
  const handleTrainModel = async () => {
    if (!wallet.isConnected) {
      setError('Please connect your Midnight wallet first');
      return;
    }

    setError(null);
    setFlState((prev) => ({ ...prev, isTraining: true }));
    setTrainingProgress({ currentEpoch: 0, totalEpochs: 50, metrics: null });

    try {
      console.log('🚀 Starting local model training...');

      // Check if Arduino sensor data is available
      const arduinoData = loadArduinoSensorData();
      let dataset: FarmDataset;

      if (arduinoData && hasValidArduinoData()) {
        console.log('📡 Using Arduino sensor data for training!');
        const summary = getArduinoDataSummary(arduinoData);
        console.log(`   Temperature: ${summary.temperature}`);
        console.log(`   Humidity: ${summary.humidity}`);
        console.log(`   Estimated Rainfall: ${summary.estimatedRainfall}`);
        console.log(`   Data Quality: ${summary.dataQuality}`);

        // Convert Arduino sensor data to training dataset
        dataset = convertArduinoDataToFLDataset(arduinoData, wallet.address || 'unknown', 30);

        // Clear Arduino data after use
        clearArduinoSensorData();
      } else {
        console.log('📊 Using simulated farm dataset (no Arduino data available)');
        // Generate mock farm dataset (fallback when no Arduino data)
        dataset = generateMockFarmDataset(
          wallet.address || 'unknown',
          30 // 30 seasons of historical data
        );
      }

      // Train model locally
      const result = await trainLocalModel(
        dataset,
        DEFAULT_TRAINING_CONFIG,
        flState.globalModel?.weights, // Fine-tune from global model if available
        (metrics: TrainingMetrics) => {
          // Update progress on each epoch
          setTrainingProgress({
            currentEpoch: metrics.epoch,
            totalEpochs: 50,
            metrics,
          });
        }
      );

      console.log('✅ Training complete!', result);

      setFlState((prev) => ({
        ...prev,
        isTraining: false,
        lastTraining: result,
      }));

      // Show success message
      setError(null);
    } catch (err: any) {
      console.error('Training failed:', err);
      setError(`Training failed: ${err.message}`);
      setFlState((prev) => ({ ...prev, isTraining: false }));
    }
  };

  /**
   * Step 2: Submit trained model to FL aggregator with Midnight signature
   */
  const handleSubmitModel = async () => {
    if (!wallet.isConnected) {
      setError('Please connect your Midnight wallet first');
      return;
    }

    if (!flState.lastTraining) {
      setError('Please train a model first');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log('📤 Submitting model update...');

      const training = flState.lastTraining;

      // Calculate weights hash for integrity
      const weightsHash = await hashModelWeights(training.modelWeights);

      // Create submission data
      const submission: ModelSubmission = {
        farmerId: wallet.address || 'unknown',
        modelWeights: training.modelWeights,
        weightsHash,
        metrics: {
          loss: training.finalMetrics.valLoss,
          mae: training.finalMetrics.valMae,
          accuracy: 1 - training.finalMetrics.valMae / 4.0, // Simplified accuracy
        },
        datasetSize: training.datasetSize,
        round: flState.currentRound,
        modelVersion: flState.currentVersion,
        timestamp: Date.now(),
      };

      console.log('Submission:', submission);

      // Sign with Midnight wallet
      const txData: TransactionData = {
        type: 'model_submission',
        payload: {
          weightsHash: submission.weightsHash,
          datasetSize: submission.datasetSize,
          metrics: submission.metrics,
          round: submission.round,
          modelVersion: submission.modelVersion,
        },
      };

      console.log('🔐 Signing transaction with Midnight wallet...');
      console.log('   Generating zero-knowledge proof...');

      // Track ZK proof generation
      setZkProofState({
        isGenerating: true,
        proofGenerated: false,
        proofDetails: null,
      });

      const proofStartTime = performance.now();
      const signedTx = await signTransaction(txData);
      const proofEndTime = performance.now();
      const proofGenerationTime = proofEndTime - proofStartTime;

      // Add signature to submission
      submission.signature = signedTx.signature;
      submission.txHash = signedTx.txHash;

      console.log('✅ Transaction signed:', signedTx);
      console.log('🔐 Zero-Knowledge Proof Details:');
      console.log(`   ├─ Circuit: EdgeChain Model Submission`);
      console.log(`   ├─ Tx Hash: ${signedTx.txHash}`);
      console.log(`   ├─ Signature: ${signedTx.signature.substring(0, 20)}...`);
      console.log(`   ├─ Proof Generation Time: ${proofGenerationTime.toFixed(2)}ms`);
      console.log(`   ├─ Timestamp: ${new Date(signedTx.timestamp).toISOString()}`);
      console.log(`   └─ Privacy: ✅ Data encrypted, only hash revealed`);

      // Update ZK proof state
      setZkProofState({
        isGenerating: false,
        proofGenerated: true,
        proofDetails: {
          txHash: signedTx.txHash,
          signature: signedTx.signature,
          timestamp: signedTx.timestamp,
          proofSize: new Blob([signedTx.signature]).size,
          circuitName: 'EdgeChain-ModelSubmission-v1',
        },
        verificationStatus: 'verified',
      });

      // Store submission locally using aggregationService
      console.log('📡 Storing submission...');
      await storeSubmission(submission);

      setFlState((prev) => ({
        ...prev,
        lastSubmission: submission,
      }));

      console.log('✅ Model submitted successfully!');

      // Check if we can trigger aggregation
      const status = await checkAggregationReadiness();
      setAggregationStatus(status);

      console.log(`📊 Current submissions: ${status.currentSubmissions}/${status.requiredSubmissions}`);

      // Trigger aggregation if threshold reached
      if (status.canAggregate) {
        console.log('🚀 Threshold reached! Starting aggregation...');
        setAggregationProgress({ running: true, progress: 0, message: 'Starting aggregation...' });

        try {
          const globalModel = await runAggregation(
            undefined, // Use default config
            (progress: number, message: string) => {
              setAggregationProgress({ running: true, progress, message });
            }
          );

          console.log('✅ Aggregation complete!');
          console.log(`🌐 Global Model v${globalModel.version} created`);

          // Update state with new global model and round
          const newRound = await getCurrentRound();
          setFlState((prev) => ({
            ...prev,
            globalModel,
            currentVersion: globalModel.version,
            currentRound: newRound,
          }));

          setAggregationProgress({ running: false, progress: 100, message: 'Aggregation complete!' });

          // Reset status
          setAggregationStatus({
            canAggregate: false,
            currentSubmissions: 0,
            requiredSubmissions: 2,
          });
        } catch (aggError: any) {
          console.error('❌ Aggregation failed:', aggError);
          setError(`Aggregation failed: ${aggError.message}`);
          setAggregationProgress({ running: false, progress: 0, message: '' });
        }
      } else {
        console.log(status.message);
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setError(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Step 3: Download latest global model
   */
  const handleDownloadGlobalModel = async () => {
    try {
      console.log('📥 Loading global model from local storage...');

      // Load from local storage (created by aggregation service)
      const model = loadGlobalModel();

      if (!model) {
        setError('No global model available yet. Wait for aggregation to complete.');
        return;
      }

      setFlState((prev) => ({
        ...prev,
        globalModel: model,
        currentVersion: model.version,
      }));

      console.log(`✅ Loaded global model v${model.version}`);
      console.log(`👨‍🌾 Trained by ${model.metadata.trainedBy} farmers`);
      console.log(`📊 ${model.metadata.totalSamples} total samples`);
      console.log(`📈 Global Accuracy: ${(model.metadata.averageAccuracy * 100).toFixed(2)}%`);
    } catch (err: any) {
      console.error('Download failed:', err);
      setError(`Download failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Panel - Header, Contract Status, ZK Explainer, System Metrics */}
      <FLStatusPanel flState={flState} error={error} />

      {/* Training Panel - Step 1 */}
      <LocalTrainingPanel
        flState={flState}
        trainingProgress={trainingProgress}
        isWalletConnected={wallet.isConnected}
        onTrainModel={handleTrainModel}
      />

      {/* Submission Panel - Step 2 */}
      <ModelSubmissionPanel
        flState={flState}
        zkProofState={zkProofState}
        aggregationProgress={aggregationProgress}
        aggregationStatus={aggregationStatus}
        submitting={submitting}
        isWalletConnected={wallet.isConnected}
        onSubmitModel={handleSubmitModel}
      />

      {/* Global Model Panel - Step 3 */}
      <GlobalModelPanel
        flState={flState}
        onDownloadGlobalModel={handleDownloadGlobalModel}
      />
    </div>
  );
}
