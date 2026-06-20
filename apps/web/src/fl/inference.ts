/**
 * FL Inference System
 *
 * Handles crop yield predictions using trained models (local or global)
 * All inference runs locally in the browser for privacy
 *
 * Features:
 * - Load global model for predictions
 * - Run inference on farmer's IoT sensor data
 * - Confidence scoring
 * - Feature importance explanation
 */

import * as tf from '@tensorflow/tfjs';
import type {
  ModelWeights,
  PredictionInput,
  PredictionOutput,
  GlobalModel,
} from './types';
import {
  formatYieldPrediction,
  getYieldRecommendation,
  predictionInputToTensor,
  validatePredictionInput,
} from '@edgechain/fl';
import { createModel, loadModelWeights } from './training';

export {
  formatYieldPrediction,
  getYieldRecommendation,
  validatePredictionInput,
};

// ============================================================================
// PREDICTION
// ============================================================================

/**
 * Make crop yield prediction using a trained model
 *
 * @param input - Farmer's current agricultural conditions
 * @param weights - Model weights (local or global)
 * @param modelVersion - Version of the model being used
 * @returns Prediction with confidence score
 */
export async function predictYield(
  input: PredictionInput,
  weights: ModelWeights,
  modelVersion: number
): Promise<PredictionOutput> {
  console.log('🔮 Making yield prediction...');

  const validation = validatePredictionInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid prediction input: ${validation.errors.join('; ')}`);
  }

  const model = createModel(weights.architecture);
  let inputTensor: tf.Tensor2D | undefined;
  let predictionTensor: tf.Tensor | undefined;

  try {
    await loadModelWeights(model, weights);

    const inputFeatures = predictionInputToTensor(input);
    inputTensor = tf.tensor2d([inputFeatures]);
    predictionTensor = model.predict(inputTensor) as tf.Tensor;
    const predictionArray = await predictionTensor.array() as number[][];
    const predictedYield = predictionArray[0]?.[0];

    if (!Number.isFinite(predictedYield)) {
      throw new Error('Model returned a non-finite prediction');
    }

    // Simplified confidence/explanation until model uncertainty is implemented.
    const confidence = calculateConfidence(input);
    const explanation = calculateFeatureImportance(input);

    console.log(`✅ Predicted yield: ${predictedYield.toFixed(2)} tons/hectare (${(confidence * 100).toFixed(1)}% confidence)`);

    return {
      predictedYield,
      confidence,
      modelVersion,
      timestamp: Date.now(),
      explanation,
    };
  } finally {
    inputTensor?.dispose();
    predictionTensor?.dispose();
    model.dispose();
  }
}

/**
 * Predict yield using global model
 */
export async function predictWithGlobalModel(
  input: PredictionInput
): Promise<PredictionOutput> {
  const globalModel = loadGlobalModelFromStorage();

  if (!globalModel) {
    throw new Error('No global model available. Train a local model first or wait for global model.');
  }

  return predictYield(input, globalModel.weights, globalModel.version);
}

/**
 * Predict yield using local model
 */
export async function predictWithLocalModel(
  input: PredictionInput,
  localWeights: ModelWeights
): Promise<PredictionOutput> {
  return predictYield(input, localWeights, 0);
}

// ============================================================================
// CONFIDENCE SCORING
// ============================================================================

/**
 * Calculate prediction confidence based on input similarity to training data
 *
 * Simplified approach:
 * - High confidence if inputs are within typical ranges
 * - Lower confidence for edge cases
 *
 * In production: Use dropout-based uncertainty or ensemble methods
 */
function calculateConfidence(input: PredictionInput): number {
  // Typical ranges for agricultural data
  const ranges = {
    rainfall: { min: 300, max: 1500, typical: [400, 1200] },
    temperature: { min: 10, max: 35, typical: [18, 30] },
    fertilizer: { min: 0, max: 400, typical: [50, 300] },
    pesticides: { min: 0, max: 12, typical: [2, 8] },
  };

  let confidenceScore = 1.0;

  // Reduce confidence if outside typical ranges
  if (input.rainfall < ranges.rainfall.typical[0] || input.rainfall > ranges.rainfall.typical[1]) {
    confidenceScore *= 0.9;
  }

  if (input.temperature < ranges.temperature.typical[0] || input.temperature > ranges.temperature.typical[1]) {
    confidenceScore *= 0.9;
  }

  if (input.fertilizer < ranges.fertilizer.typical[0] || input.fertilizer > ranges.fertilizer.typical[1]) {
    confidenceScore *= 0.95;
  }

  if (input.pesticides < ranges.pesticides.typical[0] || input.pesticides > ranges.pesticides.typical[1]) {
    confidenceScore *= 0.95;
  }

  // Heavily reduce confidence if completely outside known ranges
  if (input.rainfall < ranges.rainfall.min || input.rainfall > ranges.rainfall.max) {
    confidenceScore *= 0.5;
  }

  if (input.temperature < ranges.temperature.min || input.temperature > ranges.temperature.max) {
    confidenceScore *= 0.5;
  }

  // Cap confidence between 0.5 and 0.99
  return Math.max(0.5, Math.min(0.99, confidenceScore));
}

// ============================================================================
// FEATURE IMPORTANCE
// ============================================================================

/**
 * Calculate feature importance using simple sensitivity analysis
 *
 * Shows which factors have the most impact on yield prediction
 * Helps farmers understand what to focus on
 *
 * Method: Perturb each feature slightly and measure prediction change
 */
function calculateFeatureImportance(input: PredictionInput): { topFactors: { feature: string; impact: number }[] } {
  // Simplified feature importance
  // In production: Use SHAP values or integrated gradients

  const factors = [
    { feature: 'Rainfall', impact: 0.35 },
    { feature: 'Temperature', impact: 0.25 },
    { feature: 'Soil Type', impact: 0.15 },
    { feature: 'Fertilizer', impact: 0.12 },
    { feature: 'Irrigation Type', impact: 0.08 },
    { feature: 'Pesticides', impact: 0.05 },
  ];

  // Adjust based on actual input values
  // Rainfall has higher impact in extreme conditions
  if (input.rainfall < 500 || input.rainfall > 1200) {
    factors[0].impact *= 1.2;
  }

  // Temperature importance increases at extremes
  if (input.temperature < 20 || input.temperature > 28) {
    factors[1].impact *= 1.15;
  }

  // Normalize to sum to 1.0
  const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
  const normalized = factors.map(f => ({
    feature: f.feature,
    impact: f.impact / totalImpact,
  }));

  // Sort by impact (descending)
  return {
    topFactors: normalized.sort((a, b) => b.impact - a.impact),
  };
}

// ============================================================================
// BATCH PREDICTIONS
// ============================================================================

/**
 * Make predictions for multiple scenarios (e.g., "what if" analysis)
 *
 * Example: "What if I increase fertilizer by 20%?"
 */
export async function batchPredict(
  inputs: PredictionInput[],
  weights: ModelWeights,
  modelVersion: number
): Promise<PredictionOutput[]> {
  console.log(`🔮 Making ${inputs.length} batch predictions...`);

  const predictions: PredictionOutput[] = [];

  for (const input of inputs) {
    const prediction = await predictYield(input, weights, modelVersion);
    predictions.push(prediction);
  }

  console.log(`✅ Completed ${predictions.length} predictions`);

  return predictions;
}

/**
 * "What if" analysis: Compare different scenarios
 *
 * Example: Compare yield with different fertilizer amounts
 */
export async function whatIfAnalysis(
  baseInput: PredictionInput,
  weights: ModelWeights,
  modelVersion: number,
  scenarios: Array<{ name: string; changes: Partial<PredictionInput> }>
): Promise<Array<{ scenario: string; prediction: PredictionOutput }>> {
  console.log(`📊 Running "what if" analysis with ${scenarios.length} scenarios...`);

  const results: Array<{ scenario: string; prediction: PredictionOutput }> = [];

  for (const scenario of scenarios) {
    const modifiedInput: PredictionInput = {
      ...baseInput,
      ...scenario.changes,
    };

    const prediction = await predictYield(modifiedInput, weights, modelVersion);

    results.push({
      scenario: scenario.name,
      prediction,
    });
  }

  console.log('✅ What-if analysis complete');

  return results;
}

// ============================================================================
// STORAGE
// ============================================================================

const GLOBAL_MODEL_KEY = 'edgechain_global_model';
const PREDICTION_HISTORY_KEY = 'edgechain_prediction_history';

/**
 * Load global model from storage
 */
function loadGlobalModelFromStorage(): GlobalModel | null {
  try {
    const serialized = localStorage.getItem(GLOBAL_MODEL_KEY);
    if (!serialized) return null;

    return JSON.parse(serialized) as GlobalModel;
  } catch (error) {
    console.error('Failed to load global model:', error);
    return null;
  }
}

/**
 * Save prediction to history
 */
export function savePredictionToHistory(prediction: PredictionOutput): void {
  try {
    const history = loadPredictionHistory();
    history.push(prediction);

    // Keep only last 100 predictions
    const trimmed = history.slice(-100);

    localStorage.setItem(PREDICTION_HISTORY_KEY, JSON.stringify(trimmed));
    console.log('✅ Saved prediction to history');
  } catch (error) {
    console.error('Failed to save prediction:', error);
  }
}

/**
 * Load prediction history
 */
export function loadPredictionHistory(): PredictionOutput[] {
  try {
    const serialized = localStorage.getItem(PREDICTION_HISTORY_KEY);
    if (!serialized) return [];

    return JSON.parse(serialized) as PredictionOutput[];
  } catch (error) {
    console.error('Failed to load prediction history:', error);
    return [];
  }
}

/**
 * Clear prediction history
 */
export function clearPredictionHistory(): void {
  localStorage.removeItem(PREDICTION_HISTORY_KEY);
  console.log('✅ Cleared prediction history');
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if global model is available
 */
export function isGlobalModelAvailable(): boolean {
  const model = loadGlobalModelFromStorage();
  return model !== null;
}

/**
 * Get global model metadata
 */
export function getGlobalModelInfo(): {
  version: number;
  trainedBy: number;
  accuracy: number;
  createdAt: number;
} | null {
  const model = loadGlobalModelFromStorage();
  if (!model) return null;

  return {
    version: model.version,
    trainedBy: model.metadata.trainedBy,
    accuracy: model.metadata.averageAccuracy,
    createdAt: model.metadata.createdAt,
  };
}
