/**
 * Model Submission Panel Component
 *
 * Handles model submission with ZK-proof generation and aggregation tracking
 */

import type { FLState, ZKProofState, AggregationProgress, AggregationStatus } from './types';

interface ModelSubmissionPanelProps {
  flState: FLState;
  zkProofState: ZKProofState;
  aggregationProgress: AggregationProgress;
  aggregationStatus: AggregationStatus;
  submitting: boolean;
  isWalletConnected: boolean;
  onSubmitModel: () => Promise<void>;
}

export function ModelSubmissionPanel({
  flState,
  zkProofState,
  aggregationProgress,
  aggregationStatus,
  submitting,
  isWalletConnected,
  onSubmitModel,
}: ModelSubmissionPanelProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-black">2️⃣ Submit to Global Model</h3>
          <p className="text-sm text-gray-600">Sign with Midnight wallet and contribute securely.</p>
        </div>
        <button
          onClick={onSubmitModel}
          disabled={submitting || !flState.lastTraining || !isWalletConnected}
          className="rounded-lg border border-gray-900 bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? '⏳ Submitting...' : '📤 Submit Model'}
        </button>
      </div>

      {/* ZK Proof Generation Progress */}
      {zkProofState.isGenerating && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-800"></div>
            <span>Generating zero-knowledge proof…</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">🔒 Proving model authenticity without revealing data.</p>
        </div>
      )}

      {/* ZK Proof Success - Detailed Panel */}
      {zkProofState.proofGenerated && zkProofState.proofDetails && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <div>
              <p className="text-base font-semibold text-black">Zero-knowledge proof generated</p>
              <p className="text-xs text-gray-600">Privacy-preserving proof verified successfully.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-gray-500 uppercase text-[10px]">Circuit</p>
              <p className="font-semibold text-black">{zkProofState.proofDetails.circuitName}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-gray-500 uppercase text-[10px]">Status</p>
              <p className="font-semibold text-black flex items-center gap-1">
                <span>✓</span> Verified
              </p>
            </div>
            <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-gray-500 uppercase text-[10px]">Transaction hash</p>
              <p className="font-mono text-[11px] text-black break-all">{zkProofState.proofDetails.txHash}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-gray-500 uppercase text-[10px]">Proof size</p>
              <p className="font-semibold text-black">{zkProofState.proofDetails.proofSize} bytes</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-gray-500 uppercase text-[10px]">Timestamp</p>
              <p className="font-semibold text-black">
                {zkProofState.proofDetails.timestamp
                  ? new Date(zkProofState.proofDetails.timestamp).toLocaleTimeString()
                  : 'N/A'}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-3 text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-black">Privacy guarantees:</p>
            <ul className="space-y-1">
              <li>• Model weights encrypted; only hashes shared</li>
              <li>• ZK proof verifies authenticity without raw data</li>
              <li>• Signatures prevent tampering</li>
              <li>• Training data never leaves your hardware</li>
            </ul>
          </div>
        </div>
      )}

      {flState.lastSubmission && !zkProofState.proofGenerated && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2 font-semibold text-black">
            <span>✅</span> Model submitted
          </div>
          <div className="flex justify-between text-xs">
            <span>Transaction hash</span>
            <span className="font-mono">{flState.lastSubmission.txHash?.slice(0, 20)}...</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Weights hash</span>
            <span className="font-mono">{flState.lastSubmission.weightsHash.slice(0, 20)}...</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Accuracy</span>
            <span className="font-semibold text-black">
              {(flState.lastSubmission.metrics.accuracy * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Aggregation Status */}
      {aggregationStatus.currentSubmissions > 0 && !aggregationProgress.running && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 font-semibold text-black">
            <span>⏳</span> Waiting for additional submissions
          </div>
          <p className="mt-2">
            {aggregationStatus.currentSubmissions} / {aggregationStatus.requiredSubmissions} submissions received. Need{' '}
            {aggregationStatus.requiredSubmissions - aggregationStatus.currentSubmissions} more to trigger aggregation.
          </p>
        </div>
      )}

      {/* Aggregation Progress */}
      {aggregationProgress.running && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-black">
            <span>⚡</span> Running federated averaging…
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{aggregationProgress.message}</span>
            <span>{aggregationProgress.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${aggregationProgress.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">🔒 Privacy-preserving aggregation in progress…</p>
        </div>
      )}
    </div>
  );
}
