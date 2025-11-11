/**
 * Local Training Panel Component
 *
 * Handles local model training on farmer's private data
 */

import type { FLState, TrainingProgress } from './types';

interface LocalTrainingPanelProps {
  flState: FLState;
  trainingProgress: TrainingProgress;
  isWalletConnected: boolean;
  onTrainModel: () => Promise<void>;
}

export function LocalTrainingPanel({
  flState,
  trainingProgress,
  isWalletConnected,
  onTrainModel,
}: LocalTrainingPanelProps) {
  return (
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
          onClick={onTrainModel}
          disabled={flState.isTraining || !isWalletConnected}
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
  );
}
