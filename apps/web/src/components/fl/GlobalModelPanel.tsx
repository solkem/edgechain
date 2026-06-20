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
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-black">3️⃣ Download Global Model</h3>
          <p className="text-sm text-gray-600">Get the latest aggregated model for improved predictions.</p>
        </div>
        <button
          onClick={onDownloadGlobalModel}
          className="rounded-lg border border-gray-900 bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-900"
        >
          📥 Download Model
        </button>
      </div>

      {flState.globalModel && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-black">
            <span>🌐</span>
            <p>Global Model v{flState.globalModel.version}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
            <div>
              <p className="uppercase tracking-wide text-gray-500">Trained by</p>
              <p className="text-base font-semibold text-black">
                {flState.globalModel.metadata.trainedBy} farmers
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wide text-gray-500">Total samples</p>
              <p className="text-base font-semibold text-black">
                {flState.globalModel.metadata.totalSamples}
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wide text-gray-500">Global MAE</p>
              <p className="text-base font-semibold text-black">
                {flState.globalModel.performanceMetrics.globalMae.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
