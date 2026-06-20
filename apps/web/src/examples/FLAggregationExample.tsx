/**
 * FL Aggregation Example
 *
 * Demonstrates how the FL aggregation service works in EdgeChain
 * Shows the complete flow from multiple farmer submissions to global model
 */

import React, { useState } from 'react';
import type { ModelSubmission, AggregationResult, GlobalModel } from '../fl/types';
import {
  aggregateModelUpdates,
  createGlobalModel,
  saveGlobalModel,
  loadGlobalModel,
  DEFAULT_AGGREGATION_CONFIG,
} from '../fl/aggregation';

export function FLAggregationExample() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AggregationResult | null>(null);
  const [globalModel, setGlobalModel] = useState<GlobalModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Simulate FL aggregation with mock farmer submissions
   */
  const handleAggregateModels = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock submissions from 5 different farmers
      const mockSubmissions: ModelSubmission[] = [
        {
          farmerId: 'mn_shield-addr_test1farmer1abc...',
          modelWeights: generateMockWeights(),
          weightsHash: '0x1234567890abcdef...',
          metrics: {
            loss: 0.42,
            mae: 0.35,
            accuracy: 0.88,
          },
          datasetSize: 50, // 50 seasons of data
          round: 1,
          modelVersion: 0,
          timestamp: Date.now() - 3600000, // 1 hour ago
          signature: 'sig_farmer1_...',
          txHash: '0xabc123...',
        },
        {
          farmerId: 'mn_shield-addr_test1farmer2def...',
          modelWeights: generateMockWeights(),
          weightsHash: '0xfedcba0987654321...',
          metrics: {
            loss: 0.38,
            mae: 0.32,
            accuracy: 0.91,
          },
          datasetSize: 75, // More data = higher weight
          round: 1,
          modelVersion: 0,
          timestamp: Date.now() - 3000000,
          signature: 'sig_farmer2_...',
          txHash: '0xdef456...',
        },
        {
          farmerId: 'mn_shield-addr_test1farmer3ghi...',
          modelWeights: generateMockWeights(),
          weightsHash: '0x111222333444555...',
          metrics: {
            loss: 0.45,
            mae: 0.38,
            accuracy: 0.85,
          },
          datasetSize: 30,
          round: 1,
          modelVersion: 0,
          timestamp: Date.now() - 2400000,
          signature: 'sig_farmer3_...',
          txHash: '0xghi789...',
        },
        {
          farmerId: 'mn_shield-addr_test1farmer4jkl...',
          modelWeights: generateMockWeights(),
          weightsHash: '0x666777888999000...',
          metrics: {
            loss: 0.40,
            mae: 0.34,
            accuracy: 0.89,
          },
          datasetSize: 60,
          round: 1,
          modelVersion: 0,
          timestamp: Date.now() - 1800000,
          signature: 'sig_farmer4_...',
          txHash: '0xjkl012...',
        },
        {
          farmerId: 'mn_shield-addr_test1farmer5mno...',
          modelWeights: generateMockWeights(),
          weightsHash: '0xaaabbbcccdddee...',
          metrics: {
            loss: 0.44,
            mae: 0.37,
            accuracy: 0.86,
          },
          datasetSize: 45,
          round: 1,
          modelVersion: 0,
          timestamp: Date.now() - 1200000,
          signature: 'sig_farmer5_...',
          txHash: '0xmno345...',
        },
      ];

      console.log('📊 Starting FL aggregation with 5 farmer submissions...');

      // Run aggregation pipeline
      const aggregationResult = await aggregateModelUpdates(
        mockSubmissions,
        1, // Round 1
        0, // Version 0 (first global model)
        {
          ...DEFAULT_AGGREGATION_CONFIG,
          weightingStrategy: 'dataset-size', // Weight by data quality
        }
      );

      setResult(aggregationResult);

      // Create global model package
      const newGlobalModel = createGlobalModel(aggregationResult, mockSubmissions);

      // Save to storage (in production: IPFS + blockchain)
      saveGlobalModel(newGlobalModel);
      setGlobalModel(newGlobalModel);

      console.log('✅ Global model v1 created and saved!');
    } catch (err: any) {
      console.error('Aggregation failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load existing global model from storage
   */
  const handleLoadGlobalModel = () => {
    const model = loadGlobalModel();
    if (model) {
      setGlobalModel(model);
      console.log(`✅ Loaded global model v${model.version}`);
    } else {
      setError('No global model found');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg p-6 border border-purple-500/30">
        <h2 className="text-2xl font-bold text-white mb-2">
          🌐 FL Aggregation Service
        </h2>
        <p className="text-purple-200 text-sm">
          Combines model updates from multiple farmers into a single global model
          using Federated Averaging (FedAvg)
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleAggregateModels}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Aggregating...' : '🚀 Run Aggregation (5 Farmers)'}
        </button>

        <button
          onClick={handleLoadGlobalModel}
          className="px-6 py-3 bg-purple-800/50 text-white rounded-lg font-semibold hover:bg-purple-800/70 transition border border-purple-500/30"
        >
          📥 Load Existing Model
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Aggregation Result */}
      {result && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-bold text-white">
            ✅ Aggregation Complete - Round {result.round}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/30">
              <p className="text-purple-300 text-xs mb-1">Model Version</p>
              <p className="text-white text-2xl font-bold">v{result.modelVersion}</p>
            </div>

            <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500/30">
              <p className="text-blue-300 text-xs mb-1">Participating Farmers</p>
              <p className="text-white text-2xl font-bold">{result.numSubmissions}</p>
            </div>

            <div className="bg-green-900/30 rounded-lg p-4 border border-green-500/30">
              <p className="text-green-300 text-xs mb-1">Weighted Accuracy</p>
              <p className="text-white text-2xl font-bold">
                {(result.aggregationMetrics.weightedAccuracy * 100).toFixed(1)}%
              </p>
            </div>

            <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-500/30">
              <p className="text-yellow-300 text-xs mb-1">Average MAE</p>
              <p className="text-white text-2xl font-bold">
                {result.aggregationMetrics.averageMae.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-300 text-xs mb-2">Participating Farmers:</p>
            <div className="space-y-1">
              {result.participatingFarmers.map((farmerId, idx) => (
                <p key={idx} className="text-gray-400 text-xs font-mono">
                  {idx + 1}. {farmerId.slice(0, 35)}...
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Model */}
      {globalModel && (
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-bold text-white">
            🌐 Global Model v{globalModel.version}
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-purple-300 text-xs mb-1">Trained By</p>
              <p className="text-white text-lg font-bold">
                {globalModel.metadata.trainedBy} farmers
              </p>
            </div>

            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-purple-300 text-xs mb-1">Total Samples</p>
              <p className="text-white text-lg font-bold">
                {globalModel.metadata.totalSamples} seasons
              </p>
            </div>

            <div className="bg-black/30 rounded-lg p-3">
              <p className="text-purple-300 text-xs mb-1">Global MAE</p>
              <p className="text-white text-lg font-bold">
                {globalModel.performanceMetrics.globalMae.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-4">
            <p className="text-purple-300 text-xs mb-2">Model Architecture:</p>
            <p className="text-gray-300 text-sm">
              Input: {globalModel.architecture.inputDim} features →{' '}
              Hidden: [{globalModel.architecture.hiddenLayers.join(', ')}] →{' '}
              Output: {globalModel.architecture.outputDim}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Total Parameters: {globalModel.weights.totalParameters.toLocaleString()}
            </p>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-300 text-sm">
              ✅ This model is now ready for download by all farmers for local predictions!
            </p>
            <p className="text-green-200 text-xs mt-2">
              In production: Stored on IPFS with hash recorded on Midnight blockchain
            </p>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-3">How FL Aggregation Works</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <div className="flex gap-3">
            <span className="text-purple-400 font-bold">1.</span>
            <div>
              <p className="font-semibold text-white">Collect Submissions</p>
              <p className="text-xs text-gray-400">
                Farmers train locally and submit encrypted model weights with ZK-proofs
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-purple-400 font-bold">2.</span>
            <div>
              <p className="font-semibold text-white">Verify ZK-Proofs</p>
              <p className="text-xs text-gray-400">
                Midnight blockchain verifies submissions without revealing raw data
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-purple-400 font-bold">3.</span>
            <div>
              <p className="font-semibold text-white">Detect Outliers</p>
              <p className="text-xs text-gray-400">
                Statistical outlier detection prevents model poisoning attacks
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-purple-400 font-bold">4.</span>
            <div>
              <p className="font-semibold text-white">Weighted Averaging (FedAvg)</p>
              <p className="text-xs text-gray-400">
                Combine weights using formula: w_global = Σ(w_i × n_i) / Σ(n_i)
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-purple-400 font-bold">5.</span>
            <div>
              <p className="font-semibold text-white">Create Global Model</p>
              <p className="text-xs text-gray-400">
                Package aggregated weights with metadata for distribution
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-purple-400 font-bold">6.</span>
            <div>
              <p className="font-semibold text-white">Distribute to Farmers</p>
              <p className="text-xs text-gray-400">
                Farmers download new global model for improved local predictions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate mock model weights for demonstration
 * In production, these come from real TensorFlow.js training
 */
function generateMockWeights() {
  // Simple 2-layer network for demo
  return {
    layers: [
      {
        name: 'hidden_layer_1',
        weights: [
          Array(14)
            .fill(0)
            .map(() =>
              Array(64)
                .fill(0)
                .map(() => Math.random() * 0.2 - 0.1)
            ),
        ],
        biases: [Array(64).fill(0).map(() => Math.random() * 0.1)],
      },
      {
        name: 'output_layer',
        weights: [
          Array(64)
            .fill(0)
            .map(() => [Math.random() * 0.2 - 0.1]),
        ],
        biases: [[Math.random() * 0.1]],
      },
    ],
    totalParameters: 14 * 64 + 64 + 64 * 1 + 1,
    architecture: {
      inputDim: 14,
      hiddenLayers: [64],
      outputDim: 1,
      activation: 'relu',
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mae', 'mse'],
    },
  };
}
