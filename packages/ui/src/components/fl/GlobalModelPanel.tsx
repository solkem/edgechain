/**
 * Global Model Panel Component
 *
 * Handles downloading and displaying the latest global model
 */

import type { FLState } from './types';

interface GlobalModelPanelProps {
  flState: FLState;
  onDownloadGlobalModel: () => Promise<void>;
}

export function GlobalModelPanel({ flState, onDownloadGlobalModel }: GlobalModelPanelProps) {
  return (
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
          onClick={onDownloadGlobalModel}
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
  );
}
