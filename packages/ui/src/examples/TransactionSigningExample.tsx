/**
 * Transaction Signing Examples
 *
 * This file demonstrates how to use the transaction signing functionality
 * with the Midnight wallet for various EdgeChain operations.
 */

import { useWallet, type TransactionData, type SignedTransaction } from '../providers/WalletProvider';
import { useState } from 'react';

export function TransactionSigningExample() {
  const { isConnected, address, signTransaction } = useWallet();
  const [lastSignedTx, setLastSignedTx] = useState<SignedTransaction | null>(null);
  const [isSigningNow, setIsSigningNow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Example 1: Sign Farmer Registration Transaction
   */
  const handleRegisterFarmer = async () => {
    try {
      setIsSigningNow(true);
      setError(null);

      const txData: TransactionData = {
        type: 'registration',
        payload: {
          name: 'Demo Farm',
          region: 'California',
          crops: ['Wheat', 'Corn'],
          privacyLevel: 'enhanced',
          farmSize: '20-50',
          soilType: 'Loamy',
        },
      };

      const signedTx = await signTransaction(txData);
      setLastSignedTx(signedTx);

      console.log('✅ Farmer registration signed:', signedTx);

      // In production, you would send this to your backend:
      // await fetch('/api/register', {
      //   method: 'POST',
      //   body: JSON.stringify({ ...txData, signature: signedTx }),
      // });

    } catch (err: any) {
      setError(err.message);
      console.error('❌ Registration signing failed:', err);
    } finally {
      setIsSigningNow(false);
    }
  };

  /**
   * Example 2: Sign Model Weight Submission Transaction
   */
  const handleSubmitModelWeights = async () => {
    try {
      setIsSigningNow(true);
      setError(null);

      const txData: TransactionData = {
        type: 'model_submission',
        payload: {
          modelId: 'model_v1.0.0',
          weights: {
            layer1: [0.234, 0.567, 0.891],
            layer2: [0.123, 0.456, 0.789],
          },
          accuracy: 0.892,
          trainingRounds: 100,
          dataPoints: 1000,
        },
      };

      const signedTx = await signTransaction(txData);
      setLastSignedTx(signedTx);

      console.log('✅ Model weights signed:', signedTx);

      // In production, submit to FL aggregator:
      // await fetch('/api/fl/submit-weights', {
      //   method: 'POST',
      //   body: JSON.stringify({ ...txData, signature: signedTx }),
      // });

    } catch (err: any) {
      setError(err.message);
      console.error('❌ Model submission signing failed:', err);
    } finally {
      setIsSigningNow(false);
    }
  };

  /**
   * Example 3: Sign Voting Transaction
   */
  const handleVoteOnPrediction = async () => {
    try {
      setIsSigningNow(true);
      setError(null);

      const txData: TransactionData = {
        type: 'voting',
        payload: {
          predictionId: 'pred_12345',
          vote: 'accurate',
          confidence: 0.95,
          actualOutcome: 'high_yield',
          comments: 'Prediction was very accurate',
        },
      };

      const signedTx = await signTransaction(txData);
      setLastSignedTx(signedTx);

      console.log('✅ Vote signed:', signedTx);

      // In production, submit vote:
      // await fetch('/api/predictions/vote', {
      //   method: 'POST',
      //   body: JSON.stringify({ ...txData, signature: signedTx }),
      // });

    } catch (err: any) {
      setError(err.message);
      console.error('❌ Vote signing failed:', err);
    } finally {
      setIsSigningNow(false);
    }
  };

  /**
   * Example 4: Sign Reward Claim Transaction
   */
  const handleClaimRewards = async () => {
    try {
      setIsSigningNow(true);
      setError(null);

      const txData: TransactionData = {
        type: 'claim_rewards',
        payload: {
          rewardId: 'reward_67890',
          amount: 100,
          currency: 'tDUST',
          reason: 'model_contribution',
          period: '2025-01',
        },
      };

      const signedTx = await signTransaction(txData);
      setLastSignedTx(signedTx);

      console.log('✅ Reward claim signed:', signedTx);

      // In production, submit claim:
      // await fetch('/api/rewards/claim', {
      //   method: 'POST',
      //   body: JSON.stringify({ ...txData, signature: signedTx }),
      // });

    } catch (err: any) {
      setError(err.message);
      console.error('❌ Reward claim signing failed:', err);
    } finally {
      setIsSigningNow(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p className="text-yellow-800">
          Please connect your Midnight wallet first to sign transactions.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Transaction Signing Examples</h2>

      <div className="mb-4 p-3 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">Connected Address:</p>
        <p className="font-mono text-sm break-all">{address}</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleRegisterFarmer}
          disabled={isSigningNow}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded disabled:opacity-50"
        >
          {isSigningNow ? 'Signing...' : '1. Sign Farmer Registration'}
        </button>

        <button
          onClick={handleSubmitModelWeights}
          disabled={isSigningNow}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded disabled:opacity-50"
        >
          {isSigningNow ? 'Signing...' : '2. Sign Model Weight Submission'}
        </button>

        <button
          onClick={handleVoteOnPrediction}
          disabled={isSigningNow}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded disabled:opacity-50"
        >
          {isSigningNow ? 'Signing...' : '3. Sign Vote on Prediction'}
        </button>

        <button
          onClick={handleClaimRewards}
          disabled={isSigningNow}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded disabled:opacity-50"
        >
          {isSigningNow ? 'Signing...' : '4. Sign Reward Claim'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded">
          <p className="text-red-800 text-sm">Error: {error}</p>
        </div>
      )}

      {lastSignedTx && (
        <div className="mt-6 p-4 bg-green-50 border border-green-400 rounded">
          <h3 className="font-bold text-green-800 mb-2">Last Signed Transaction:</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-semibold">Tx Hash:</span> {lastSignedTx.txHash}</p>
            <p><span className="font-semibold">Signature:</span> {lastSignedTx.signature.substring(0, 20)}...</p>
            <p><span className="font-semibold">Timestamp:</span> {new Date(lastSignedTx.timestamp).toLocaleString()}</p>
          </div>
          <p className="mt-2 text-xs text-green-700">
            ✅ Check browser console for full transaction details
          </p>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-400 rounded">
        <h3 className="font-bold text-blue-800 mb-2">How Transaction Signing Works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-900">
          <li>Transaction data is prepared with type and payload</li>
          <li>Data is signed using your Midnight wallet's private key</li>
          <li>ZK-proof ensures authenticity without revealing sensitive data</li>
          <li>Signed transaction can be submitted to EdgeChain backend</li>
          <li>Backend verifies signature before processing</li>
        </ol>
      </div>
    </div>
  );
}

/**
 * Usage in your app:
 *
 * import { TransactionSigningExample } from './examples/TransactionSigningExample';
 *
 * function MyComponent() {
 *   return (
 *     <div>
 *       <TransactionSigningExample />
 *     </div>
 *   );
 * }
 */
