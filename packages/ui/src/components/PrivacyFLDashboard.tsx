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
  const [storageStats, setStorageStats] = useState<any>(null);

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
      setStorageStats(stats);
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
      setStorageStats(stats);
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
      setStorageStats(stats);
      setReadingCount(stats.count);
      setCurrentStep('All readings cleared');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span>🔐</span>
              Privacy-Preserving FL Training
            </h1>
            <p className="text-purple-200 text-sm mt-1">4-Tier Privacy Architecture (L1→L2→L3→L4)</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/train')}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all text-sm"
            >
              ← Old FL (Fallback)
            </button>
            <button
              onClick={() => navigate('/selection')}
              className="px-4 py-2 bg-slate-800/60 hover:bg-slate-800 text-white rounded-lg transition-all"
            >
              Back
            </button>
          </div>
        </div>

        {/* Password Prompt */}
        {showPasswordPrompt && (
          <div className="bg-slate-800/60 border border-purple-500/30 rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">🔑 Initialize Privacy Layer</h2>
            <p className="text-purple-200 text-sm mb-6">
              Enter a password to derive your encryption keys. This password encrypts your raw IoT data locally
              and is NEVER transmitted to servers.
            </p>

            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInitialize()}
                placeholder="Enter password (min 8 characters)"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
              />

              <button
                onClick={handleInitialize}
                disabled={password.length < 8}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Initialize Privacy Orchestrator
              </button>

              {error && (
                <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
                  <p className="text-red-200 text-sm">❌ {error}</p>
                </div>
              )}
            </div>

            <div className="mt-6 bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-200 text-sm font-semibold mb-2">🔒 Privacy Guarantees:</p>
              <ul className="text-blue-100 text-xs space-y-1">
                <li>✅ Password derives AES-256 encryption key (PBKDF2, 100k iterations)</li>
                <li>✅ Raw data encrypted in browser localStorage</li>
                <li>✅ Features deleted after training</li>
                <li>✅ Gradients encrypted before IPFS upload</li>
                <li>✅ Only commitments stored on blockchain</li>
              </ul>
            </div>
          </div>
        )}

        {/* Main Dashboard (after initialization) */}
        {initialized && (
          <div className="grid gap-6">
            {/* Storage Stats */}
            <div className="bg-slate-800/60 border border-purple-500/30 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">📊 L1: Local Data Vault Status</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-purple-200 text-sm">Encrypted Readings</p>
                  <p className="text-3xl font-bold text-white">{readingCount}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-purple-200 text-sm">Encryption</p>
                  <p className="text-lg font-bold text-green-400">AES-256-GCM</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-purple-200 text-sm">Storage</p>
                  <p className="text-lg font-bold text-blue-400">localStorage</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleGenerateSampleData}
                  disabled={isTraining}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  Generate Sample Data (+50 readings)
                </button>
                <button
                  onClick={handleClearData}
                  disabled={isTraining || readingCount === 0}
                  className="px-6 bg-red-600/80 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Training Controls */}
            <div className="bg-slate-800/60 border border-purple-500/30 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🧠 Privacy-Preserving FL Training</h2>

              {currentStep && (
                <div className="mb-4 p-4 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                  <p className="text-purple-200 text-sm">📝 {currentStep}</p>
                  {isTraining && (
                    <div className="mt-2">
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-purple-300 text-xs mt-1 text-right">{progress}%</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleTrain}
                disabled={isTraining || readingCount === 0}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                {isTraining ? '⏳ Training...' : '🚀 Start Privacy-Preserving Training'}
              </button>

              {readingCount === 0 && (
                <p className="text-yellow-200 text-sm text-center">
                  ⚠️ Generate sample data first to enable training
                </p>
              )}
            </div>

            {/* Training Results */}
            {result && (
              <div className="bg-slate-800/60 border border-green-500/30 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">✅ Training Complete</h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-purple-200 text-sm mb-1">IPFS CID</p>
                    <p className="text-white text-xs font-mono break-all">{result.ipfs_cid}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-purple-200 text-sm mb-1">Quality Score</p>
                    <p className="text-3xl font-bold text-green-400">{result.data_quality_score}/100</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-purple-200 text-sm mb-1">Reward Earned</p>
                    <p className="text-2xl font-bold text-yellow-400">{result.reward_earned || 'N/A'} tDUST</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-purple-200 text-sm mb-1">Round ID</p>
                    <p className="text-2xl font-bold text-blue-400">#{result.round_id}</p>
                  </div>
                </div>

                <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">🔒 Privacy Audit Trail</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={result.privacy_audit.l1_readings_encrypted > 0 ? 'text-green-400' : 'text-red-400'}>
                        {result.privacy_audit.l1_readings_encrypted > 0 ? '✅' : '❌'}
                      </span>
                      <span className="text-green-100">L1: {result.privacy_audit.l1_readings_encrypted} readings encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={result.privacy_audit.l2_features_created > 0 ? 'text-green-400' : 'text-red-400'}>
                        {result.privacy_audit.l2_features_created > 0 ? '✅' : '❌'}
                      </span>
                      <span className="text-green-100">L2: {result.privacy_audit.l2_features_created} features created</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={result.privacy_audit.l2_features_deleted ? 'text-green-400' : 'text-red-400'}>
                        {result.privacy_audit.l2_features_deleted ? '✅' : '❌'}
                      </span>
                      <span className="text-green-100">L2: Features deleted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={result.privacy_audit.l3_gradients_encrypted ? 'text-green-400' : 'text-red-400'}>
                        {result.privacy_audit.l3_gradients_encrypted ? '✅' : '❌'}
                      </span>
                      <span className="text-green-100">L3: Gradients encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={result.privacy_audit.l3_ipfs_upload ? 'text-green-400' : 'text-red-400'}>
                        {result.privacy_audit.l3_ipfs_upload ? '✅' : '❌'}
                      </span>
                      <span className="text-green-100">L3: IPFS upload successful</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={result.privacy_audit.l4_commitment_submitted ? 'text-green-400' : 'text-yellow-400'}>
                        {result.privacy_audit.l4_commitment_submitted ? '✅' : '⏳'}
                      </span>
                      <span className="text-green-100">L4: Commitment submitted</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-purple-200 text-sm mb-2"><strong>Commitment Hash:</strong></p>
                  <p className="text-white text-xs font-mono break-all">{result.commitment}</p>
                </div>
              </div>
            )}

            {/* Privacy Architecture Info */}
            <div className="bg-slate-800/60 border border-purple-500/30 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🏗️ 4-Tier Privacy Architecture</h2>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-2xl">🔐</span>
                  <div>
                    <p className="text-white font-semibold">L1: Local Data Vault</p>
                    <p className="text-purple-200">Raw IoT data encrypted with AES-256-GCM, stored in browser localStorage, NEVER transmitted</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-2xl">🔬</span>
                  <div>
                    <p className="text-white font-semibold">L2: Feature Extractor</p>
                    <p className="text-purple-200">Privacy-preserving ML features (normalized, trends), deleted immediately after training</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-2xl">📦</span>
                  <div>
                    <p className="text-white font-semibold">L3: Gradient Manager</p>
                    <p className="text-purple-200">FL gradients encrypted before IPFS upload, database stores ONLY IPFS CID</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-2xl">⛓️</span>
                  <div>
                    <p className="text-white font-semibold">L4: Smart Contract</p>
                    <p className="text-purple-200">Only cryptographic commitments on Midnight blockchain, NO raw data/features/gradients</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
