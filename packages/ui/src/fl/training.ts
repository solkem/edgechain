/**
 * FL Local Model Training Module
 *
 * Handles training neural networks locally in the browser using TensorFlow.js
 * All training happens ON-DEVICE for privacy - no data leaves the farmer's device
 */

import * as tf from '@tensorflow/tfjs';
import type {
  ModelArchitecture,
  ModelWeights,
  TrainingConfig,
  TrainingMetrics,
  TrainingResult,
  FarmDataset,
} from './types';
import { prepareTrainingData } from './dataCollection';

// ============================================================================
// MODEL CREATION
// ============================================================================

/**
 * Create a simple feedforward neural network for crop yield prediction
 * Architecture designed to run efficiently in browser
 */
export function createModel(architecture: ModelArchitecture): tf.LayersModel {
  const model = tf.sequential();

  // Input layer
  model.add(tf.layers.dense({
    inputShape: [architecture.inputDim],
    units: architecture.hiddenLayers[0],
    activation: 'relu',
    kernelInitializer: 'heNormal',
    name: 'hidden_layer_1',
  }));

  // Add dropout for regularization
  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Hidden layers
  for (let i = 1; i < architecture.hiddenLayers.length; i++) {
    model.add(tf.layers.dense({
      units: architecture.hiddenLayers[i],
      activation: 'relu',
      kernelInitializer: 'heNormal',
      name: `hidden_layer_${i + 1}`,
    }));

    model.add(tf.layers.dropout({ rate: 0.2 }));
  }

  // Output layer (single value: yield prediction)
  model.add(tf.layers.dense({
    units: architecture.outputDim,
    activation: 'linear', // Linear for regression
    kernelInitializer: 'glorotUniform',
    name: 'output_layer',
  }));

  // Compile model
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae', 'mse'],
  });

  console.log('✅ Model created:');
  model.summary();

  return model;
}

/**
 * Default architecture for crop yield prediction
 */
export const DEFAULT_ARCHITECTURE: ModelArchitecture = {
  inputDim: 14,           // 5 numeric + 5 soil types + 4 irrigation types
  hiddenLayers: [64, 32, 16],
  outputDim: 1,
  activation: 'relu',
  optimizer: 'adam',
  loss: 'meanSquaredError',
  metrics: ['mae', 'mse'],
};

/**
 * Default training configuration
 */
export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  epochs: 50,
  batchSize: 32,
  validationSplit: 0.2,
  learningRate: 0.001,
  earlyStopping: true,
  patience: 10,
};

// ============================================================================
// MODEL WEIGHT EXTRACTION/LOADING
// ============================================================================

/**
 * Extract weights from TensorFlow model
 */
export async function extractModelWeights(model: tf.LayersModel): Promise<ModelWeights> {
  const layers: ModelWeights['layers'] = [];

  for (const layer of model.layers) {
    const weights = layer.getWeights();

    if (weights.length > 0) {
      const weightsData: number[][][] = [];
      const biasesData: number[][] = [];

      // Weight matrix
      if (weights[0]) {
        const weightValues = await weights[0].array() as number[][];
        weightsData.push(weightValues);
      }

      // Bias vector
      if (weights[1]) {
        const biasValues = await weights[1].array() as number[];
        biasesData.push(biasValues);
      }

      layers.push({
        name: layer.name,
        weights: weightsData,
        biases: biasesData,
      });
    }
  }

  // Count total parameters
  let totalParameters = 0;
  for (const layer of layers) {
    for (const w of layer.weights) {
      for (const row of w) {
        totalParameters += row.length;
      }
    }
    for (const b of layer.biases) {
      totalParameters += b.length;
    }
  }

  return {
    layers,
    totalParameters,
    architecture: DEFAULT_ARCHITECTURE,
  };
}

/**
 * Load weights into TensorFlow model
 */
export async function loadModelWeights(
  model: tf.LayersModel,
  weights: ModelWeights
): Promise<void> {
  let layerIndex = 0;

  for (const layer of model.layers) {
    if (layerIndex >= weights.layers.length) break;

    const layerWeights = weights.layers[layerIndex];

    if (layerWeights.weights.length > 0 || layerWeights.biases.length > 0) {
      const tensors: tf.Tensor[] = [];

      // Convert weights to tensors
      if (layerWeights.weights.length > 0) {
        tensors.push(tf.tensor(layerWeights.weights[0]));
      }

      // Convert biases to tensors
      if (layerWeights.biases.length > 0) {
        tensors.push(tf.tensor(layerWeights.biases[0]));
      }

      layer.setWeights(tensors);

      // Clean up tensors
      tensors.forEach(t => t.dispose());
    }

    layerIndex++;
  }

  console.log('✅ Weights loaded into model');
}

// ============================================================================
// TRAINING
// ============================================================================

/**
 * Train model locally on farmer's device
 * Returns training result with metrics and final weights
 */
export async function trainLocalModel(
  dataset: FarmDataset,
  config: TrainingConfig = DEFAULT_TRAINING_CONFIG,
  initialWeights?: ModelWeights,
  onEpochEnd?: (metrics: TrainingMetrics) => void
): Promise<TrainingResult> {
  const startTime = Date.now();

  console.log(`🚀 Starting local training with ${dataset.totalSamples} samples...`);

  // Prepare training data
  const { inputs, targets } = prepareTrainingData(dataset);

  // Convert to tensors
  const xs = tf.tensor2d(inputs);
  const ys = tf.tensor2d(targets);

  console.log(`Input shape: ${xs.shape}, Target shape: ${ys.shape}`);

  // Create model
  const model = createModel(DEFAULT_ARCHITECTURE);

  // Load initial weights if provided (for FL)
  if (initialWeights) {
    await loadModelWeights(model, initialWeights);
    console.log('📥 Loaded initial global model weights');
  }

  // Training metrics history
  const metricsHistory: TrainingMetrics[] = [];

  // Custom callback for tracking metrics
  // Use the callback object format that TensorFlow.js expects
  const metricsCallback: tf.CustomCallbackArgs = {
    onEpochEnd: async (epoch: number, logs?: tf.Logs) => {
      if (!logs) return;

      const metrics: TrainingMetrics = {
        epoch: epoch + 1,
        loss: logs.loss as number,
        mae: logs.mae as number,
        mse: logs.mse as number,
        valLoss: logs.val_loss as number,
        valMae: logs.val_mae as number,
        valMse: logs.val_mse as number,
        timestamp: Date.now(),
      };

      metricsHistory.push(metrics);

      if (onEpochEnd) {
        onEpochEnd(metrics);
      }

      // Log progress every 10 epochs
      if ((epoch + 1) % 10 === 0) {
        console.log(
          `Epoch ${epoch + 1}/${config.epochs} - ` +
          `loss: ${logs.loss.toFixed(4)}, mae: ${logs.mae.toFixed(4)}, ` +
          `val_loss: ${logs.val_loss?.toFixed(4)}, val_mae: ${logs.val_mae?.toFixed(4)}`
        );
      }
    }
  };

  // Build callbacks array
  // NOTE: Early stopping disabled due to TensorFlow.js callback interface issues
  // The model will train for all epochs (50 by default)
  const callbacks: tf.CustomCallbackArgs[] = [metricsCallback];

  // Train the model
  const history = await model.fit(xs, ys, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationSplit: config.validationSplit,
    callbacks,
    verbose: 0, // Silent mode
  });

  const trainingTime = Date.now() - startTime;

  console.log(`✅ Training completed in ${(trainingTime / 1000).toFixed(2)}s`);

  // Extract final weights
  const finalWeights = await extractModelWeights(model);

  // Get final metrics
  const finalMetrics = {
    trainLoss: history.history.loss[history.history.loss.length - 1] as number,
    trainMae: history.history.mae[history.history.mae.length - 1] as number,
    trainMse: history.history.mse[history.history.mse.length - 1] as number,
    valLoss: history.history.val_loss
      ? (history.history.val_loss[history.history.val_loss.length - 1] as number)
      : 0,
    valMae: history.history.val_mae
      ? (history.history.val_mae[history.history.val_mae.length - 1] as number)
      : 0,
    valMse: history.history.val_mse
      ? (history.history.val_mse[history.history.val_mse.length - 1] as number)
      : 0,
  };

  console.log('Final metrics:', finalMetrics);

  // Clean up tensors
  xs.dispose();
  ys.dispose();
  model.dispose();

  return {
    farmerId: dataset.farmerId,
    modelWeights: finalWeights,
    metrics: metricsHistory,
    finalMetrics,
    datasetSize: dataset.totalSamples,
    trainingTime,
    timestamp: Date.now(),
  };
}

// ============================================================================
// MODEL EVALUATION
// ============================================================================

/**
 * Evaluate model on test data
 */
export async function evaluateModel(
  weights: ModelWeights,
  testDataset: FarmDataset
): Promise<{ loss: number; mae: number; mse: number }> {
  const model = createModel(DEFAULT_ARCHITECTURE);
  await loadModelWeights(model, weights);

  const { inputs, targets } = prepareTrainingData(testDataset);
  const xs = tf.tensor2d(inputs);
  const ys = tf.tensor2d(targets);

  const result = model.evaluate(xs, ys) as tf.Tensor[];

  const loss = await result[0].data();
  const mae = await result[1].data();
  const mse = await result[2].data();

  xs.dispose();
  ys.dispose();
  model.dispose();
  result.forEach(t => t.dispose());

  return {
    loss: loss[0],
    mae: mae[0],
    mse: mse[0],
  };
}

// ============================================================================
// WEIGHT SERIALIZATION
// ============================================================================

/**
 * Serialize model weights to JSON string
 * Used for storage and transmission
 */
export function serializeWeights(weights: ModelWeights): string {
  return JSON.stringify(weights);
}

/**
 * Deserialize weights from JSON string
 */
export function deserializeWeights(serialized: string): ModelWeights {
  return JSON.parse(serialized) as ModelWeights;
}

/**
 * Calculate hash of model weights
 * Used for integrity verification
 */
export async function hashModelWeights(weights: ModelWeights): Promise<string> {
  const serialized = serializeWeights(weights);
  const encoder = new TextEncoder();
  const data = encoder.encode(serialized);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `0x${hashHex}`;
  }

  // Fallback for non-browser environments
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

// ============================================================================
// STORAGE
// ============================================================================

const MODEL_WEIGHTS_KEY = 'edgechain_local_model_weights';
const TRAINING_HISTORY_KEY = 'edgechain_training_history';

/**
 * Save trained model weights locally
 */
export function saveLocalModel(weights: ModelWeights): void {
  try {
    const serialized = serializeWeights(weights);
    localStorage.setItem(MODEL_WEIGHTS_KEY, serialized);
    console.log('✅ Saved local model weights');
  } catch (error) {
    console.error('Failed to save model weights:', error);
    throw new Error('Failed to save model weights');
  }
}

/**
 * Load local model weights
 */
export function loadLocalModel(): ModelWeights | null {
  try {
    const serialized = localStorage.getItem(MODEL_WEIGHTS_KEY);
    if (!serialized) return null;

    return deserializeWeights(serialized);
  } catch (error) {
    console.error('Failed to load model weights:', error);
    return null;
  }
}

/**
 * Save training history
 */
export function saveTrainingHistory(results: TrainingResult[]): void {
  try {
    const serialized = JSON.stringify(results);
    localStorage.setItem(TRAINING_HISTORY_KEY, serialized);
    console.log(`✅ Saved training history (${results.length} sessions)`);
  } catch (error) {
    console.error('Failed to save training history:', error);
  }
}

/**
 * Load training history
 */
export function loadTrainingHistory(): TrainingResult[] {
  try {
    const serialized = localStorage.getItem(TRAINING_HISTORY_KEY);
    if (!serialized) return [];

    return JSON.parse(serialized) as TrainingResult[];
  } catch (error) {
    console.error('Failed to load training history:', error);
    return [];
  }
}

/**
 * Clear all local training data
 */
export function clearLocalTrainingData(): void {
  localStorage.removeItem(MODEL_WEIGHTS_KEY);
  localStorage.removeItem(TRAINING_HISTORY_KEY);
  console.log('✅ Cleared local training data');
}
