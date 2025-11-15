import Home from "@/components/home";
import { useState } from "react";

/**
 * Login Component - Now with real Lace Midnight Preview wallet integration!
 *
 * Props:
 * - onConnect: Function to connect Lace Midnight Preview wallet
 * - isConnecting: Are we currently connecting to Midnight devnet?
 * - isMidnightPreviewInstalled: Is Lace Midnight Preview extension installed?
 * - error: Any error message to display
 * - contractContext: Contract deployment status and functions
 * - walletContext: Full wallet context including connection status
 * - isDeploying: Parent state tracking deployment
 * - setIsDeploying: Function to update parent deployment state
 *
 * IMPORTANT: This connects to Midnight devnet with tDUST tokens, not Cardano!
 */
export function Login({
  onConnect,
  isConnecting = false,
  isMidnightPreviewInstalled = true,
  error = null,
  contractContext,
  walletContext,
  isDeploying,
  setIsDeploying,
}: {
  onConnect: () => void;
  isConnecting?: boolean;
  isMidnightPreviewInstalled?: boolean;
  error?: string | null;
  contractContext: any;
  walletContext: any;
  isDeploying: boolean;
  setIsDeploying: (deploying: boolean) => void;
}) {
  const [deployError, setDeployError] = useState<string | null>(null);

  const handleDeploy = async () => {
    setDeployError(null);

    // Step 1: Connect wallet if not connected
    if (!walletContext.isConnected) {
      try {
        setIsDeploying(true);
        await onConnect();
        // Wait a moment for wallet to connect
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err: any) {
        console.error("Wallet connection failed:", err);
        setDeployError(err.message || "Failed to connect wallet");
        setIsDeploying(false);
        return;
      }
    } else {
      setIsDeploying(true);
    }

    // Step 2: Deploy contract
    try {
      console.log("🚀 Starting contract deployment...");
      await contractContext.deployContract();
      console.log("✅ Contract deployed successfully!");
      // Contract deployed successfully! The UI will update automatically
      // because contractContext.isDeployed will change
      setIsDeploying(false);
    } catch (err: any) {
      console.error("Deployment failed:", err);
      setDeployError(err.message || "Deployment failed");
      setIsDeploying(false);
    }
  };

  return (
    <>
      <Home />
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600/40 rounded-full mb-6">
              <span className="text-5xl">🌾</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-3">EdgeChain</h1>
            <p className="text-purple-200 text-lg">
              Federated Learning for Farmers
            </p>
            <p className="text-purple-300 text-sm mt-2">
              Powered by Midnight ZK-Proofs
            </p>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8">
            {/* Show contract deployment UI if not deployed */}
            {!contractContext.isDeployed && (
              <div className="mb-6 bg-blue-900/30 border border-blue-500/50 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-blue-400 text-3xl">📦</span>
                  <div>
                    <p className="text-blue-300 font-bold text-lg">
                      Setup Required
                    </p>
                    <p className="text-blue-200 text-sm">
                      Deploy EdgeChain contract to Midnight devnet
                    </p>
                  </div>
                </div>

                {deployError && (
                  <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg">
                    <p className="text-red-200 text-sm">❌ {deployError}</p>
                  </div>
                )}

                {contractContext.isProcessing && (
                  <div className="p-3 bg-purple-900/50 border border-purple-500/50 rounded-lg">
                    <p className="text-purple-200 text-sm">
                      ⏳ Deploying contract... This may take 2-5 minutes
                    </p>
                    <p className="text-purple-300 text-xs mt-1">
                      Generating ZK-proofs and submitting to blockchain
                    </p>
                  </div>
                )}

                <div className="text-sm text-blue-100 space-y-2">
                  <p className="font-semibold">What this does:</p>
                  <ul className="text-xs text-blue-200 space-y-1 ml-4">
                    <li>• Connects your Lace wallet</li>
                    <li>• Deploys smart contract to Midnight testnet</li>
                    <li>• Enables federated learning for all farmers</li>
                    <li>• One-time setup (requires ~1 tDUST)</li>
                  </ul>
                </div>

                <button
                  onClick={handleDeploy}
                  disabled={
                    isDeploying ||
                    contractContext.isProcessing ||
                    !isMidnightPreviewInstalled
                  }
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeploying || contractContext.isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Deploying Contract...
                    </span>
                  ) : (
                    "Deploy Contract"
                  )}
                </button>

                {!isMidnightPreviewInstalled && (
                  <p className="text-yellow-200 text-xs text-center">
                    ⚠️ Please install Lace Midnight Preview first
                  </p>
                )}
              </div>
            )}

            {/* Show error message if connection failed */}
            {error && (
              <div className="mb-4 p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                <p className="text-red-200 text-sm">⚠️ {error}</p>
              </div>
            )}

            {/* Show "Install Midnight Preview" button if not installed */}
            {!isMidnightPreviewInstalled ? (
              <div className="mb-6">
                <div className="mb-4 p-4 bg-yellow-900/50 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-200 text-sm mb-2">
                    ⚠️ Lace Midnight Preview is not installed
                  </p>
                  <p className="text-yellow-100 text-xs mb-2">
                    You need the Lace Midnight Preview extension for Midnight
                    devnet.
                  </p>
                  <p className="text-yellow-100 text-xs">
                    This is a specialized extension for privacy-preserving DApps
                    with tDUST tokens.
                  </p>
                </div>
                <a
                  href="https://docs.midnight.network/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-all"
                >
                  Install Lace Midnight Preview →
                </a>
              </div>
            ) : (
              /* Show connect button if Midnight Preview is installed */
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl mb-8 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Connecting to Midnight...
                  </span>
                ) : (
                  "Connect Midnight Preview"
                )}
              </button>
            )}

            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-white font-semibold mb-4">
                What is EdgeChain?
              </h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li>✓ Get AI crop predictions via SMS ($0.10 each)</li>
                <li>✓ Vote on accuracy, improve models collectively</li>
                <li>✓ Earn tokens for participation</li>
                <li>✓ Private data with zero-knowledge proofs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
