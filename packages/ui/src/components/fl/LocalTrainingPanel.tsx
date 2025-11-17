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
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-black">1️⃣ Train Local Model</h3>
          <p className="text-sm text-gray-600">Train on your private farm data. Nothing leaves your device.</p>
        </div>
        <button
          onClick={onTrainModel}
          disabled={flState.isTraining || !isWalletConnected}
          className="rounded-lg border border-gray-900 bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {flState.isTraining ? '⏳ Training...' : '🚀 Train Model'}
        </button>
      </div>

      {/* Training Progress */}
      {flState.isTraining && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Epoch {trainingProgress.currentEpoch} / {trainingProgress.totalEpochs}
            </span>
            <span>{Math.round((trainingProgress.currentEpoch / trainingProgress.totalEpochs) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${(trainingProgress.currentEpoch / trainingProgress.totalEpochs) * 100}%`,
              }}
            />
          </div>
          {trainingProgress.metrics && (
            <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
              <div>
                <p className="text-gray-500">Loss</p>
                <p className="text-black font-semibold">{trainingProgress.metrics.loss.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-gray-500">MAE</p>
                <p className="text-black font-semibold">{trainingProgress.metrics.mae.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-gray-500">Val Loss</p>
                <p className="text-black font-semibold">
                  {trainingProgress.metrics.valLoss?.toFixed(4) || 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Training Result */}
      {flState.lastTraining && !flState.isTraining && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-black">
            <span>✅</span>
            Training complete
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
            <div>
              <p className="uppercase tracking-wide text-gray-500">Dataset Size</p>
              <p className="text-base font-semibold text-black">{flState.lastTraining.datasetSize} samples</p>
            </div>
            <div>
              <p className="uppercase tracking-wide text-gray-500">Final MAE</p>
              <p className="text-base font-semibold text-black">{flState.lastTraining.finalMetrics.valMae.toFixed(4)}</p>
            </div>
            <div>
              <p className="uppercase tracking-wide text-gray-500">Training Time</p>
              <p className="text-base font-semibold text-black">{(flState.lastTraining.trainingTime / 1000).toFixed(1)}s</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
