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

      {/* Zero-Knowledge Proof Explainer */}
      <div className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 border border-purple-500/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">🔐</span>
          <div>
            <h3 className="text-xl font-bold text-white">Zero-Knowledge Proofs on Midnight Network</h3>
            <p className="text-purple-200/80 text-sm">Privacy-preserving cryptography for secure federated learning</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-lg p-4 space-y-3">
            <h4 className="text-purple-300 font-semibold text-sm flex items-center gap-2">
              <span>🛡️</span> How It Works
            </h4>
            <div className="space-y-2 text-xs text-purple-100/80">
              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">1.</span>
                <span>You train your ML model locally on private data</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">2.</span>
                <span>Model weights are hashed (only fingerprint shared)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">3.</span>
                <span>ZK proof generated: proves authenticity without revealing data</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">4.</span>
                <span>Midnight Network verifies proof cryptographically</span>
              </div>
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-4 space-y-3">
            <h4 className="text-blue-300 font-semibold text-sm flex items-center gap-2">
              <span>✨</span> Privacy Benefits
            </h4>
            <div className="space-y-2 text-xs text-blue-100/80">
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>Data Privacy:</strong> Your farm data never leaves your device</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>Model Privacy:</strong> Only encrypted hash shared, not weights</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>Verifiable:</strong> Cryptographic proof of model validity</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>Secure:</strong> Midnight Network blockchain ensures integrity</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-950/50 rounded-lg p-3 border border-indigo-500/20">
          <p className="text-indigo-200 text-xs">
            <strong>💡 Technical Note:</strong> EdgeChain uses Midnight Network's zk-SNARK circuits to generate
            cryptographic proofs that verify model authenticity without exposing sensitive agricultural data or
            model parameters. This enables trustless collaboration while preserving farmer privacy.
          </p>
        </div>
      </div>

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
