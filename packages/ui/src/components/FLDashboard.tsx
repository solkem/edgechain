/**
 * FL Dashboard Component
 *
 * Complete federated learning workflow for farmers:
 * 1. View FL system status
 * 2. Train local model on their data
 * 3. Submit model weights with Midnight wallet signature
 * 4. Download global model
 * 5. Make predictions
 */

import { useState, useEffect } from 'react';
import { useWallet } from '../providers/WalletProvider';
import { useContract } from '../providers/ContractProvider';
import type {
  FarmDataset,
  TrainingResult,
  ModelSubmission,
  TrainingMetrics,
  GlobalModel,
} from '../fl/types';
import { trainLocalModel, DEFAULT_TRAINING_CONFIG } from '../fl/training';
import { generateMockFarmDataset } from '../fl/dataCollection';
import { loadGlobalModel, saveGlobalModel } from '../fl/aggregation'; // saveGlobalModel used in download function
import { hashModelWeights } from '../fl/training';
import type { TransactionData } from '../providers/WalletProvider';

export function FLDashboard() {
  const wallet = useWallet();
  const { signTransaction } = wallet;
  const contract = useContract();
  const [flState, setFlState] = useState<{
    currentRound: number;
    currentVersion: number;
    globalModel: GlobalModel | null;
    isTraining: boolean;
    lastTraining: TrainingResult | null;
    lastSubmission: ModelSubmission | null;
  }>({
    currentRound: 1,
    currentVersion: 1,
    globalModel: null,
    isTraining: false,
    lastTraining: null,
    lastSubmission: null,
  });

  const [trainingProgress, setTrainingProgress] = useState<{
    currentEpoch: number;
    totalEpochs: number;
    metrics: TrainingMetrics | null;
  }>({
    currentEpoch: 0,
    totalEpochs: 0,
    metrics: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load global model on mount
  useEffect(() => {
    const model = loadGlobalModel();
    if (model) {
      setFlState((prev) => ({
        ...prev,
        globalModel: model,
        currentVersion: model.version,
      }));
    }
  }, []);

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

      // Generate mock farm dataset (in production: use real IoT data)
      const dataset: FarmDataset = generateMockFarmDataset(
        wallet.address || 'unknown',
        30 // 30 seasons of historical data
      );

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
      const signedTx = await signTransaction(txData);

      // Add signature to submission
      submission.signature = signedTx.signature;
      submission.txHash = signedTx.txHash;

      console.log('✅ Transaction signed:', signedTx);

      // Submit to FL aggregation service (backend)
      console.log('📡 Submitting to aggregation server...');
      const response = await fetch('http://localhost:3001/api/fl/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      const result = await response.json();
      console.log('🎉 Submission response:', result);

      setFlState((prev) => ({
        ...prev,
        lastSubmission: submission,
        currentVersion: result.globalModelVersion || prev.currentVersion,
      }));

      // If aggregation happened, notify user
      if (result.aggregated) {
        console.log('🌐 Global model was aggregated! You can now download it.');
      } else {
        console.log(`📊 Submission ${result.submissionCount} received, waiting for more farmers...`);
      }

      console.log('✅ Model submitted successfully!');
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
      console.log('📥 Downloading global model from server...');

      const response = await fetch('http://localhost:3001/api/fl/global-model');

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'No global model available yet');
        return;
      }

      const model = await response.json();

      // Save to local storage for inference
      saveGlobalModel(model);

      setFlState((prev) => ({
        ...prev,
        globalModel: model,
        currentVersion: model.version,
      }));

      console.log(`✅ Downloaded global model v${model.version}`);
      console.log(`👨‍🌾 Trained by ${model.metadata.trainedBy} farmers`);
      console.log(`📊 ${model.metadata.totalSamples} total samples`);
    } catch (err: any) {
      console.error('Download failed:', err);
      setError(`Download failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6 border border-purple-500/30">
        <h2 className="text-2xl font-bold text-white mb-2">
          🌐 Federated Learning Dashboard
        </h2>
        <p className="text-purple-200 text-sm">
          Train locally, contribute globally, improve collectively
        </p>
      </div>

      {/* Contract Deployment Status */}
      {!contract.isDeployed && (
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-blue-400 text-3xl">📦</span>
            <div>
              <p className="text-blue-300 font-bold text-lg">Contract Deployment Required</p>
              <p className="text-blue-200 text-sm">
                The EdgeChain smart contract needs to be deployed to Midnight devnet before you can participate in federated learning
              </p>
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-4 space-y-3">
            <h4 className="text-white font-semibold mb-2">📋 Deployment Steps:</h4>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✅</span>
                <span className="text-gray-300">
                  <strong className="text-white">Step 1:</strong> Install Lace Midnight Preview wallet
                  <br />
                  <a
                    href="https://chromewebstore.google.com/detail/lace-midnight-preview/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline ml-6"
                  >
                    → Download from Chrome Web Store
                  </a>
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">⏳</span>
                <span className="text-gray-300">
                  <strong className="text-white">Step 2:</strong> Get tDUST test tokens
                  <br />
                  <a
                    href="https://faucet.devnet.midnight.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline ml-6"
                  >
                    → Visit Midnight Faucet
                  </a>
                  <span className="text-gray-400 ml-2">(Paste your wallet address)</span>
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">⏳</span>
                <span className="text-gray-300">
                  <strong className="text-white">Step 3:</strong> Deploy contract via CLI
                  <br />
                  <code className="bg-gray-800 px-2 py-1 rounded text-xs ml-6 inline-block mt-1">
                    cd packages/contract && yarn deploy
                  </code>
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">⏳</span>
                <span className="text-gray-300">
                  <strong className="text-white">Step 4:</strong> Save contract address to .env
                  <br />
                  <code className="bg-gray-800 px-2 py-1 rounded text-xs ml-6 inline-block mt-1">
                    VITE_CONTRACT_ADDRESS=your_address_here
                  </code>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <span className="text-gray-400 text-sm">💡 For development, the FL system currently works in demo mode using HTTP. Contract integration is the next step for production.</span>
          </div>
        </div>
      )}

      {/* Wallet Status */}
      {!wallet.isConnected && (
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 text-2xl">⚠️</span>
            <div>
              <p className="text-yellow-300 font-semibold">Wallet Not Connected</p>
              <p className="text-yellow-200 text-sm">
                Connect your Midnight wallet to participate in federated learning
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FL System Status */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Current Round</p>
          <p className="text-white text-2xl font-bold">{flState.currentRound}</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Model Version</p>
          <p className="text-white text-2xl font-bold">
            v{flState.currentVersion}
          </p>
        </div>
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Global Model</p>
          <p className="text-white text-2xl font-bold">
            {flState.globalModel ? '✅ Available' : '❌ None'}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Step 1: Train Local Model */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              1️⃣ Train Local Model
            </h3>
            <p className="text-gray-400 text-sm">
              Train on your private farm data (never leaves your device)
            </p>
          </div>
          <button
            onClick={handleTrainModel}
            disabled={flState.isTraining || !wallet.isConnected}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {flState.isTraining ? '⏳ Training...' : '🚀 Train Model'}
          </button>
        </div>

        {/* Training Progress */}
        {flState.isTraining && (
          <div className="bg-black/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-300">
                Epoch {trainingProgress.currentEpoch} / {trainingProgress.totalEpochs}
              </span>
              <span className="text-gray-400">
                {Math.round((trainingProgress.currentEpoch / trainingProgress.totalEpochs) * 100)}%
              </span>
            </div>

            <div className="h-2 bg-gray-800 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                style={{
                  width: `${(trainingProgress.currentEpoch / trainingProgress.totalEpochs) * 100}%`,
                }}
              />
            </div>

            {trainingProgress.metrics && (
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-500">Loss</p>
                  <p className="text-white font-semibold">
                    {trainingProgress.metrics.loss.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">MAE</p>
                  <p className="text-white font-semibold">
                    {trainingProgress.metrics.mae.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Val Loss</p>
                  <p className="text-white font-semibold">
                    {trainingProgress.metrics.valLoss?.toFixed(4) || 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Training Result */}
        {flState.lastTraining && !flState.isTraining && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-400 text-xl">✅</span>
              <p className="text-green-300 font-semibold">Training Complete!</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-green-300/70">Dataset Size</p>
                <p className="text-white font-semibold">
                  {flState.lastTraining.datasetSize} samples
                </p>
              </div>
              <div>
                <p className="text-green-300/70">Final MAE</p>
                <p className="text-white font-semibold">
                  {flState.lastTraining.finalMetrics.valMae.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-green-300/70">Training Time</p>
                <p className="text-white font-semibold">
                  {(flState.lastTraining.trainingTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Submit Model */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              2️⃣ Submit to Global Model
            </h3>
            <p className="text-gray-400 text-sm">
              Sign with Midnight wallet and contribute to federated learning
            </p>
          </div>
          <button
            onClick={handleSubmitModel}
            disabled={submitting || !flState.lastTraining || !wallet.isConnected}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '⏳ Submitting...' : '📤 Submit Model'}
          </button>
        </div>

        {flState.lastSubmission && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-400 text-xl">✅</span>
              <p className="text-blue-300 font-semibold">Model Submitted!</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-blue-300/70">Transaction Hash:</span>
                <span className="text-white font-mono">
                  {flState.lastSubmission.txHash?.slice(0, 20)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300/70">Weights Hash:</span>
                <span className="text-white font-mono">
                  {flState.lastSubmission.weightsHash.slice(0, 20)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300/70">Accuracy:</span>
                <span className="text-white font-semibold">
                  {(flState.lastSubmission.metrics.accuracy * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Download Global Model */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              3️⃣ Download Global Model
            </h3>
            <p className="text-gray-400 text-sm">
              Get the latest aggregated model for improved predictions
            </p>
          </div>
          <button
            onClick={handleDownloadGlobalModel}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition"
          >
            📥 Download Model
          </button>
        </div>

        {flState.globalModel && (
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-purple-400 text-xl">🌐</span>
              <p className="text-purple-300 font-semibold">
                Global Model v{flState.globalModel.version}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-purple-300/70">Trained By</p>
                <p className="text-white font-semibold">
                  {flState.globalModel.metadata.trainedBy} farmers
                </p>
              </div>
              <div>
                <p className="text-purple-300/70">Total Samples</p>
                <p className="text-white font-semibold">
                  {flState.globalModel.metadata.totalSamples}
                </p>
              </div>
              <div>
                <p className="text-purple-300/70">Global MAE</p>
                <p className="text-white font-semibold">
                  {flState.globalModel.performanceMetrics.globalMae.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-purple-400 text-xl">🔒</span>
          <div>
            <p className="text-purple-300 font-semibold text-sm mb-1">
              Privacy-Preserving Federated Learning
            </p>
            <ul className="text-purple-200 text-xs space-y-1">
              <li>• Your raw farm data never leaves your device</li>
              <li>• Only encrypted model weights are shared</li>
              <li>• ZK-proofs verify contributions without revealing data</li>
              <li>• Midnight blockchain ensures decentralized trust</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
