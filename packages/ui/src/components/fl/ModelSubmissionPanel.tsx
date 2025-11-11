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
          onClick={onSubmitModel}
          disabled={submitting || !flState.lastTraining || !isWalletConnected}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '⏳ Submitting...' : '📤 Submit Model'}
        </button>
      </div>

      {/* ZK Proof Generation Progress */}
      {zkProofState.isGenerating && (
        <div className="bg-purple-900/30 border border-purple-500/40 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            <div>
              <p className="text-purple-300 font-semibold">Generating Zero-Knowledge Proof...</p>
              <p className="text-purple-200/70 text-xs mt-1">
                🔒 Proving model authenticity without revealing data
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ZK Proof Success - Detailed Panel */}
      {zkProofState.proofGenerated && zkProofState.proofDetails && (
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/40 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-purple-400 text-2xl">🔐</span>
            <div>
              <p className="text-purple-300 font-bold text-lg">Zero-Knowledge Proof Generated</p>
              <p className="text-purple-200/70 text-xs">Privacy-preserving cryptographic proof verified</p>
            </div>
          </div>

          {/* Proof Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-black/30 rounded p-3">
              <p className="text-purple-300/70 mb-1">Circuit</p>
              <p className="text-white font-semibold">{zkProofState.proofDetails.circuitName}</p>
            </div>
            <div className="bg-black/30 rounded p-3">
              <p className="text-purple-300/70 mb-1">Status</p>
              <p className="text-green-400 font-semibold flex items-center gap-1">
                <span>✓</span> Verified
              </p>
            </div>
            <div className="bg-black/30 rounded p-3 col-span-2">
              <p className="text-purple-300/70 mb-1">Transaction Hash</p>
              <p className="text-white font-mono text-[10px] break-all">
                {zkProofState.proofDetails.txHash}
              </p>
            </div>
            <div className="bg-black/30 rounded p-3">
              <p className="text-purple-300/70 mb-1">Proof Size</p>
              <p className="text-white font-semibold">{zkProofState.proofDetails.proofSize} bytes</p>
            </div>
            <div className="bg-black/30 rounded p-3">
              <p className="text-purple-300/70 mb-1">Timestamp</p>
              <p className="text-white font-semibold">
                {zkProofState.proofDetails.timestamp
                  ? new Date(zkProofState.proofDetails.timestamp).toLocaleTimeString()
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Privacy Features */}
          <div className="bg-purple-950/50 rounded-lg p-3 space-y-2">
            <p className="text-purple-200 font-semibold text-xs mb-2">🛡️ Privacy Guarantees:</p>
            <div className="space-y-1 text-xs text-purple-100/80">
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Model weights encrypted - only hash revealed</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Zero-knowledge proof verifies authenticity without exposing data</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Cryptographic signature prevents tampering</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Private training data never leaves your device</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {flState.lastSubmission && !zkProofState.proofGenerated && (
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

      {/* Aggregation Status */}
      {aggregationStatus.currentSubmissions > 0 && !aggregationProgress.running && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400 text-xl">⏳</span>
            <p className="text-yellow-300 font-semibold">Waiting for More Submissions</p>
          </div>
          <p className="text-yellow-200 text-sm">
            {aggregationStatus.currentSubmissions} / {aggregationStatus.requiredSubmissions} submissions received.
            Need {aggregationStatus.requiredSubmissions - aggregationStatus.currentSubmissions} more to trigger aggregation.
          </p>
        </div>
      )}

      {/* Aggregation Progress */}
      {aggregationProgress.running && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-400 text-xl">⚡</span>
            <p className="text-purple-300 font-semibold">Running Federated Averaging...</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-300">{aggregationProgress.message}</span>
              <span className="text-gray-400">{aggregationProgress.progress}%</span>
            </div>

            <div className="h-3 bg-gray-800 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 transition-all duration-500"
                style={{ width: `${aggregationProgress.progress}%` }}
              />
            </div>
          </div>

          <p className="text-purple-200 text-xs">
            🔐 Privacy-preserving aggregation in progress...
          </p>
        </div>
      )}
    </div>
  );
}
