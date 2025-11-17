/**
 * FL Status Panel Component
 *
 * Displays:
 * - Current round, model version, global model availability
 * - Contract deployment status
 * - Wallet connection status
 * - ZK-proof explainer
 * - Privacy notice
 */

import { useContract } from '../../providers/ContractProvider';
import { useWallet } from '../../providers/WalletProvider';
import type { FLState } from './types';

interface FLStatusPanelProps {
  flState: FLState;
  error: string | null;
}

export function FLStatusPanel({ flState, error }: FLStatusPanelProps) {
  const wallet = useWallet();
  const contract = useContract();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-2">🌐 Federated Learning Dashboard</h2>
        <p className="text-sm text-gray-600">Train locally, contribute globally, improve collectively</p>
      </div>

      {/* Contract Deployment Status */}
      {!contract.isDeployed && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📦</span>
            <div>
              <p className="text-lg font-semibold text-black">Contract Deployment Required</p>
              <p className="text-sm text-gray-600">
                Deploy the EdgeChain smart contract on Midnight devnet before participating in federated learning.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Deployment steps</h4>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              <li>Install Lace Midnight Preview wallet</li>
              <li>Request tDUST test tokens from the Midnight faucet</li>
              <li>Deploy the contract via CLI: <code className="rounded bg-white px-2 py-1 text-xs border border-gray-200">cd packages/contract && yarn deploy</code></li>
              <li>Save the contract address in your `.env` file</li>
            </ol>
          </div>
          <p className="text-sm text-gray-500">
            💡 Dev note: the FL flow works in demo mode over HTTP. Deploying the contract enables the on-chain path.
          </p>
        </div>
      )}

      {/* Zero-Knowledge Proof Explainer */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔐</span>
          <div>
            <h3 className="text-lg font-semibold text-black">Zero-Knowledge Proofs on Midnight Network</h3>
            <p className="text-sm text-gray-600">Privacy-preserving cryptography for secure federated learning</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm text-gray-600">
            <h4 className="text-sm font-semibold text-black">How it works</h4>
            <ul className="space-y-2 text-sm">
              <li>1. Train your ML model locally on private data</li>
              <li>2. Model weights are hashed; only the fingerprint is shared</li>
              <li>3. ZK proof is generated to prove authenticity</li>
              <li>4. Midnight verifies the proof cryptographically</li>
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm text-gray-600">
            <h4 className="text-sm font-semibold text-black">Privacy benefits</h4>
            <ul className="space-y-2">
              <li>✓ Farm data never leaves your device</li>
              <li>✓ Only encrypted hashes are stored</li>
              <li>✓ Contributions stay verifiable and tamper-proof</li>
              <li>✓ Blockchain-backed integrity</li>
            </ul>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <strong>Technical note:</strong> EdgeChain uses Midnight zk-SNARK circuits so farmers can prove model authenticity without revealing sensitive data or weights.
        </div>
      </div>

      {/* Wallet Status */}
      {!wallet.isConnected && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-black">Wallet not connected</p>
              <p className="text-sm text-gray-600">Connect Midnight wallet to start training and submitting updates.</p>
            </div>
          </div>
        </div>
      )}

      {/* FL System Status */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Current round', value: flState.currentRound },
          { label: 'Model version', value: `v${flState.currentVersion}` },
          { label: 'Global model', value: flState.globalModel ? 'Available' : 'Not ready' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className="text-2xl font-bold text-black mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-black mb-1">Privacy-Preserving Federated Learning</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Raw farm data stays on your device</li>
              <li>• Only encrypted weights and hashes are shared</li>
              <li>• ZK proofs verify every contribution</li>
              <li>• Midnight blockchain secures the trust layer</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
