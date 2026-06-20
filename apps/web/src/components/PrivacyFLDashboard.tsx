/**
 * Privacy-Enabled FL Dashboard
 *
 * Uses the complete 4-tier privacy architecture:
 * - L1: Local Data Vault (encrypted raw data)
 * - L2: Feature Extractor (temporary, deleted after training)
 * - L3: Gradient Manager (encrypted on IPFS)
 * - L4: Smart Contract (commitments only)
 *
 * This is the NEW privacy-preserving implementation.
 * The old FL Dashboard (/train) remains for fallback.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as tf from '@tensorflow/tfjs';
import { PrivacyOrchestrator } from '../fl/privacyOrchestrator';
import type { RawIoTReading } from '../iot/privacyTypes';
import type { FLTrainingResult } from '../fl/privacyOrchestrator';

export function PrivacyFLDashboard() {
  const navigate = useNavigate();
  const [orchestrator] = useState(() => new PrivacyOrchestrator());
  const [initialized, setInitialized] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true);

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<FLTrainingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Storage stats
  const [readingCount, setReadingCount] = useState(0);

  // Mock global model (in production, fetch from aggregator)
  const [globalModel, setGlobalModel] = useState<tf.LayersModel | null>(null);

  useEffect(() => {
    // Create mock global model
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [13], units: 16, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1 }) // Yield prediction
      ]
    });
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    setGlobalModel(model);

    return () => {
      model.dispose();
    };
  }, []);

  const handleInitialize = async () => {
    if (!password) {
      setError('Please enter a password');
      return;
    }

    try {
      setError(null);
      setCurrentStep('Initializing privacy orchestrator...');

      await orchestrator.initialize(
        password,
        'DEMO_DEVICE_001'
        // Note: Not passing wallet API for demo
        // In production, would pass from WalletProvider
      );

      setInitialized(true);
      setShowPasswordPrompt(false);

      // Load existing stats
      const stats = await orchestrator.getStorageStats();
      setReadingCount(stats.count);

      setCurrentStep('Ready to train!');
    } catch (err: any) {
      console.error('Initialization failed:', err);
      setError(err.message);
    }
  };

  const handleGenerateSampleData = async () => {
    if (!initialized) return;

    try {
      setError(null);
      setCurrentStep('Generating sample IoT readings...');

      // Generate realistic Zimbabwe farm readings
      const readings: RawIoTReading[] = Array.from({ length: 50 }, (_, i) => ({
        temperature: 25 + Math.random() * 10,        // 25-35°C
        humidity: 40 + Math.random() * 40,           // 40-80%
        soil_moisture: 30 + Math.random() * 40,      // 30-70%
        pH: 6 + Math.random() * 1.5,                 // 6.0-7.5
        timestamp: Date.now() - (49 - i) * 60000,   // Spaced 1 min apart
        device_id: 'DEMO_DEVICE_001',
        location: { latitude: -19.015438, longitude: 32.673260 } // Harare
      }));

      for (const reading of readings) {
        await orchestrator.storeReading(reading);
      }

      const stats = await orchestrator.getStorageStats();
      setReadingCount(stats.count);

      setCurrentStep(`Stored ${readings.length} encrypted readings`);
    } catch (err: any) {
      console.error('Failed to generate data:', err);
      setError(err.message);
    }
  };

  const handleTrain = async () => {
    if (!initialized || !globalModel) return;

    try {
      setError(null);
      setIsTraining(true);
      setProgress(0);
      setResult(null);

      // Execute complete privacy-preserving FL cycle
      const mockPrivateInputs = {
        merkleProof: Array.from({ length: 10 }, () =>
          crypto.getRandomValues(new Uint8Array(32))
        ),
        leafIndex: 42
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 500);

      const trainingResult = await orchestrator.executeTrainingCycle(
        globalModel,
        1, // round ID
        'DEMO_DEVICE_001',
        mockPrivateInputs
      );

      clearInterval(progressInterval);
      setProgress(100);
      setResult(trainingResult);
      setCurrentStep('Training complete!');
    } catch (err: any) {
      console.error('Training failed:', err);
      setError(err.message);
      setCurrentStep('Training failed');
    } finally {
      setIsTraining(false);
    }
  };

  const handleClearData = async () => {
    if (!initialized) return;

    if (confirm('Are you sure you want to clear all stored readings?')) {
      await orchestrator.clearAllReadings();
      const stats = await orchestrator.getStorageStats();
      setReadingCount(stats.count);
      setCurrentStep('All readings cleared');
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-4 pt-[65px]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <span>🔐</span> Privacy-Preserving FL Training
            </h1>
            <p className="text-sm text-gray-600">4-tier privacy architecture (L1 → L4)</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/train')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:border-gray-400"
            >
              ← Old FL (Fallback)
            </button>
            <button
              onClick={() => navigate('/selection')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:border-gray-400"
            >
              Back
            </button>
          </div>
        </div>

        {/* Password Prompt */}
        {showPasswordPrompt && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold mb-3">🔑 Initialize Privacy Layer</h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter a password to derive your encryption keys. This stays local—raw IoT data never leaves your device.
            </p>

            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInitialize()}
                placeholder="Enter password (min 8 characters)"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />

              <button
                onClick={handleInitialize}
                disabled={password.length < 8}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Initialize Privacy Orchestrator
              </button>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  ❌ {error}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-black mb-2">🔒 Privacy guarantees</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• AES-256 keys derived via PBKDF2 (100k iterations)</li>
                <li>• Raw data encrypted in browser storage</li>
                <li>• Features deleted immediately after training</li>
                <li>• Gradients encrypted before IPFS upload</li>
                <li>• Chain stores commitments only</li>
              </ul>
            </div>
          </div>
        )}

        {/* Main Dashboard (after initialization) */}
        {initialized && (
          <div className="grid gap-6">
            {/* Storage Stats */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">📊 L1: Local Data Vault Status</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Encrypted readings</p>
                  <p className="text-3xl font-bold text-black">{readingCount}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Encryption</p>
                  <p className="text-lg font-semibold text-black">AES-256-GCM</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Storage</p>
                  <p className="text-lg font-semibold text-black">localStorage</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <button
                  onClick={handleGenerateSampleData}
                  disabled={isTraining}
                  className="flex-1 rounded-lg border border-gray-900 bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Generate Sample Data (+50 readings)
                </button>
                <button
                  onClick={handleClearData}
                  disabled={isTraining || readingCount === 0}
                  className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-black hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Training Controls */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">🧠 Privacy-Preserving FL Training</h2>

              {currentStep && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <p>📝 {currentStep}</p>
                  {isTraining && (
                    <div className="mt-3">
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-right text-xs text-gray-500">{progress}%</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleTrain}
                disabled={isTraining || readingCount === 0}
                className="w-full rounded-lg bg-black px-4 py-4 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60 mb-3"
              >
                {isTraining ? '⏳ Training...' : '🚀 Start Privacy-Preserving Training'}
              </button>

              {readingCount === 0 && (
                <p className="text-sm text-gray-600 text-center">
                  ⚠️ Generate sample data first to enable training.
                </p>
              )}
            </div>

            {/* Training Results */}
            {result && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                <h2 className="text-xl font-semibold">✅ Training Complete</h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">IPFS CID</p>
                    <p className="font-mono text-xs text-black break-all">{result.ipfs_cid}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Quality Score</p>
                    <p className="text-3xl font-bold text-black">{result.data_quality_score}/100</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Reward Earned</p>
                    <p className="text-2xl font-semibold text-black">{result.reward_earned || 'N/A'} tDUST</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Round ID</p>
                    <p className="text-2xl font-semibold text-black">#{result.round_id}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-black">🔒 Privacy Audit Trail</h3>
                  <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>{result.privacy_audit.l1_readings_encrypted > 0 ? '✅' : '❌'}</span>
                      <span>L1: {result.privacy_audit.l1_readings_encrypted} readings encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{result.privacy_audit.l2_features_created > 0 ? '✅' : '❌'}</span>
                      <span>L2: {result.privacy_audit.l2_features_created} features created</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{result.privacy_audit.l2_features_deleted ? '✅' : '❌'}</span>
                      <span>L2: Features deleted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{result.privacy_audit.l3_gradients_encrypted ? '✅' : '❌'}</span>
                      <span>L3: Gradients encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{result.privacy_audit.l3_ipfs_upload ? '✅' : '❌'}</span>
                      <span>L3: IPFS upload successful</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{result.privacy_audit.l4_commitment_submitted ? '✅' : '⏳'}</span>
                      <span>L4: Commitment submitted</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Commitment hash</p>
                  <p className="font-mono text-xs text-black break-all">{result.commitment}</p>
                </div>
              </div>
            )}

            {/* Privacy Architecture Info */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">🏗️ 4-Tier Privacy Architecture</h2>
              <div className="space-y-3 text-sm text-gray-600">
                {[
                  {
                    icon: '🔐',
                    title: 'L1: Local Data Vault',
                    desc: 'Raw IoT data encrypted with AES-256-GCM and stored locally.',
                  },
                  {
                    icon: '🔬',
                    title: 'L2: Feature Extractor',
                    desc: 'Temporary ML features generated, then deleted after training.',
                  },
                  {
                    icon: '📦',
                    title: 'L3: Gradient Manager',
                    desc: 'Gradients encrypted before IPFS upload; only CID is stored.',
                  },
                  {
                    icon: '⛓️',
                    title: 'L4: Smart Contract',
                    desc: 'Midnight chain stores cryptographic commitments—no raw data.',
                  },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <p className="font-semibold text-black">{title}</p>
                      <p>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
