/**
 * Prediction/Inference Example
 *
 * Demonstrates how farmers use the global model to make crop yield predictions
 * based on their current IoT sensor data
 */

import React, { useState, useEffect } from 'react';
import type { PredictionInput, PredictionOutput } from '../fl/types';
import {
  predictWithGlobalModel,
  isGlobalModelAvailable,
  getGlobalModelInfo,
  validatePredictionInput,
  formatYieldPrediction,
  getYieldRecommendation,
  savePredictionToHistory,
} from '../fl/inference';

export function PredictionExample() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelAvailable, setModelAvailable] = useState(false);
  const [modelInfo, setModelInfo] = useState<any>(null);

  // Form inputs (pre-filled with realistic values)
  const [input, setInput] = useState<PredictionInput>({
    rainfall: 650,
    temperature: 24,
    soilType: 'loamy',
    irrigationType: 'drip',
    farmSize: 5,
    fertilizer: 150,
    pesticides: 4,
    cropType: 'wheat',
  });

  // Check if global model is available
  useEffect(() => {
    const available = isGlobalModelAvailable();
    setModelAvailable(available);

    if (available) {
      const info = getGlobalModelInfo();
      setModelInfo(info);
    }
  }, []);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      // Validate input
      const validation = validatePredictionInput(input);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        setLoading(false);
        return;
      }

      if (!modelAvailable) {
        setError('No global model available. Please run FL aggregation first or train a local model.');
        setLoading(false);
        return;
      }

      console.log('🔮 Making prediction with global model...');
      console.log('Input:', input);

      // Make prediction
      const result = await predictWithGlobalModel(input);
      setPrediction(result);

      // Save to history
      savePredictionToHistory(result);

      console.log('✅ Prediction complete:', result);
    } catch (err: any) {
      console.error('Prediction failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const recommendation = prediction
    ? getYieldRecommendation(prediction, 4.0)
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-lg p-6 border border-green-500/30">
        <h2 className="text-2xl font-bold text-white mb-2">
          🔮 Crop Yield Prediction
        </h2>
        <p className="text-green-200 text-sm">
          Get AI-powered predictions based on your farm conditions and IoT sensor data
        </p>
      </div>

      {/* Global Model Status */}
      {modelAvailable && modelInfo ? (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400 text-xl">✅</span>
            <p className="text-green-300 font-semibold">
              Global Model v{modelInfo.version} Available
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-green-300/70">Trained By</p>
              <p className="text-white font-semibold">{modelInfo.trainedBy} farmers</p>
            </div>
            <div>
              <p className="text-green-300/70">Accuracy</p>
              <p className="text-white font-semibold">
                {(modelInfo.accuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-green-300/70">Created</p>
              <p className="text-white font-semibold">
                {new Date(modelInfo.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-xl">⚠️</span>
            <p className="text-yellow-300 text-sm">
              No global model available. Run FL aggregation first or train a local model.
            </p>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-bold text-white mb-3">
          📊 Enter Your Farm Conditions
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Rainfall */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Rainfall (mm/season)
            </label>
            <input
              type="number"
              value={input.rainfall}
              onChange={(e) => setInput({ ...input, rainfall: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-purple-500 outline-none"
              placeholder="650"
            />
            <p className="text-xs text-gray-500 mt-1">Typical: 400-1200mm</p>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Avg Temperature (°C)
            </label>
            <input
              type="number"
              value={input.temperature}
              onChange={(e) => setInput({ ...input, temperature: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-purple-500 outline-none"
              placeholder="24"
            />
            <p className="text-xs text-gray-500 mt-1">Typical: 18-30°C</p>
          </div>

          {/* Farm Size */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Farm Size (hectares)
            </label>
            <input
              type="number"
              value={input.farmSize}
              onChange={(e) => setInput({ ...input, farmSize: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-purple-500 outline-none"
              placeholder="5"
            />
          </div>

          {/* Fertilizer */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Fertilizer (kg/hectare)
            </label>
            <input
              type="number"
              value={input.fertilizer}
              onChange={(e) => setInput({ ...input, fertilizer: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-purple-500 outline-none"
              placeholder="150"
            />
            <p className="text-xs text-gray-500 mt-1">Typical: 50-300 kg/ha</p>
          </div>

          {/* Soil Type */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Soil Type
            </label>
            <select
              value={input.soilType}
              onChange={(e) => setInput({ ...input, soilType: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-purple-500 outline-none"
            >
              <option value="loamy">Loamy</option>
              <option value="clay">Clay</option>
              <option value="sandy">Sandy</option>
              <option value="silty">Silty</option>
              <option value="peaty">Peaty</option>
            </select>
          </div>

          {/* Irrigation Type */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Irrigation Type
            </label>
            <select
              value={input.irrigationType}
              onChange={(e) => setInput({ ...input, irrigationType: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-purple-500 outline-none"
            >
              <option value="drip">Drip</option>
              <option value="sprinkler">Sprinkler</option>
              <option value="flood">Flood</option>
              <option value="rainfed">Rainfed</option>
            </select>
          </div>

          {/* Pesticides */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Pesticide Applications
            </label>
            <input
              type="number"
              value={input.pesticides}
              onChange={(e) => setInput({ ...input, pesticides: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-purple-500 outline-none"
              placeholder="4"
            />
            <p className="text-xs text-gray-500 mt-1">Typical: 2-8 per season</p>
          </div>

          {/* Crop Type */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Crop Type
            </label>
            <select
              value={input.cropType}
              onChange={(e) => setInput({ ...input, cropType: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-purple-500 outline-none"
            >
              <option value="wheat">Wheat</option>
              <option value="corn">Corn</option>
              <option value="rice">Rice</option>
              <option value="soybean">Soybean</option>
              <option value="cotton">Cotton</option>
            </select>
          </div>
        </div>

        <button
          onClick={handlePredict}
          disabled={loading || !modelAvailable}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Predicting...' : '🔮 Predict Yield'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Prediction Result */}
      {prediction && (
        <div className="space-y-4">
          {/* Main Prediction */}
          <div className="bg-gradient-to-br from-green-900/60 to-blue-900/60 border border-green-500/30 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              📈 Prediction Result
            </h3>

            <div className="bg-black/40 rounded-lg p-6 mb-4">
              <p className="text-green-300 text-sm mb-2">Expected Yield</p>
              <p className="text-white text-4xl font-bold mb-2">
                {prediction.predictedYield.toFixed(2)}
                <span className="text-2xl text-gray-400 ml-2">tons/hectare</span>
              </p>
              <p className="text-gray-300 text-sm">
                Confidence: {(prediction.confidence * 100).toFixed(1)}%
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Model Version</p>
                <p className="text-white text-lg font-bold">v{prediction.modelVersion}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Confidence</p>
                <p className="text-white text-lg font-bold">
                  {(prediction.confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Timestamp</p>
                <p className="text-white text-sm">
                  {new Date(prediction.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          {recommendation && (
            <div
              className={`border rounded-lg p-6 ${
                recommendation.status === 'excellent'
                  ? 'bg-green-900/30 border-green-500/50'
                  : recommendation.status === 'good'
                  ? 'bg-blue-900/30 border-blue-500/50'
                  : recommendation.status === 'average'
                  ? 'bg-yellow-900/30 border-yellow-500/50'
                  : recommendation.status === 'below-average'
                  ? 'bg-orange-900/30 border-orange-500/50'
                  : 'bg-red-900/30 border-red-500/50'
              }`}
            >
              <h4 className="text-lg font-bold text-white mb-2">
                💡 Recommendation
              </h4>
              <p className="text-gray-200 mb-4">{recommendation.message}</p>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-300">Suggestions:</p>
                <ul className="space-y-1">
                  {recommendation.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex gap-2">
                      <span>•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Feature Importance */}
          {prediction.explanation && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-bold text-white mb-3">
                🎯 Key Factors Affecting Your Yield
              </h4>
              <div className="space-y-2">
                {prediction.explanation.topFactors.map((factor, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-300">{factor.feature}</div>
                    <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                        style={{ width: `${factor.impact * 100}%` }}
                      />
                    </div>
                    <div className="w-16 text-sm text-gray-400 text-right">
                      {(factor.impact * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-purple-400 text-xl">🔒</span>
          <div>
            <p className="text-purple-300 font-semibold text-sm mb-1">
              Privacy-Preserving Prediction
            </p>
            <p className="text-purple-200 text-xs">
              Predictions run locally on your device. Your farm data never leaves your phone.
              The global model was trained without ever seeing anyone's raw data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
