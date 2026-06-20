import assert from 'node:assert/strict';
import * as tf from '@tensorflow/tfjs';
import {
  DEFAULT_ARCHITECTURE,
  createModel,
  extractModelWeights,
  loadModelWeights,
} from './training';
import {
  predictYield,
  predictWithLocalModel,
} from './inference';
import { GradientManager } from './gradientManager';
import type { PredictionInput } from './types';

const validInput: PredictionInput = {
  rainfall: 650,
  temperature: 24,
  soilType: 'loamy',
  irrigationType: 'drip',
  farmSize: 5,
  fertilizer: 120,
  pesticides: 3,
  cropType: 'maize',
};

async function testWeightRoundTrip() {
  const sourceModel = createModel(DEFAULT_ARCHITECTURE);
  const targetModel = createModel(DEFAULT_ARCHITECTURE);

  try {
    const weights = await extractModelWeights(sourceModel);

    assert.equal(weights.layers.length, 4, 'only dense layers should be serialized');
    assert.ok(weights.totalParameters > 0, 'model should expose trainable parameters');

    await loadModelWeights(targetModel, weights);
  } finally {
    sourceModel.dispose();
    targetModel.dispose();
  }
}

async function testPredictYieldReturnsFiniteResult() {
  const model = createModel(DEFAULT_ARCHITECTURE);

  try {
    const weights = await extractModelWeights(model);
    const prediction = await predictYield(validInput, weights, 7);

    assert.equal(prediction.modelVersion, 7);
    assert.ok(Number.isFinite(prediction.predictedYield), 'predicted yield should be finite');
    assert.ok(prediction.confidence >= 0.5 && prediction.confidence <= 0.99);
    assert.ok(prediction.explanation?.topFactors.length);
  } finally {
    model.dispose();
  }
}

async function testPredictWithLocalModelUsesVersionZero() {
  const model = createModel(DEFAULT_ARCHITECTURE);

  try {
    const weights = await extractModelWeights(model);
    const prediction = await predictWithLocalModel(validInput, weights);

    assert.equal(prediction.modelVersion, 0);
    assert.ok(Number.isFinite(prediction.predictedYield));
  } finally {
    model.dispose();
  }
}

async function testInvalidInputFailsBeforeInference() {
  const model = createModel(DEFAULT_ARCHITECTURE);

  try {
    const weights = await extractModelWeights(model);

    await assert.rejects(
      () => predictYield(
        {
          ...validInput,
          rainfall: -1,
        },
        weights,
        1,
      ),
      /Invalid prediction input/,
    );
  } finally {
    model.dispose();
  }
}

async function testGradientManagerRestoresGlobalModel() {
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [13], units: 8, activation: 'relu' }),
      tf.layers.dense({ units: 4, activation: 'relu' }),
      tf.layers.dense({ units: 1 }),
    ],
  });

  model.compile({
    optimizer: 'adam',
    loss: 'meanSquaredError',
  });

  const manager = new GradientManager();
  const before = await Promise.all(model.getWeights().map((weight) => weight.array()));
  const features = Array.from({ length: 8 }, () => ({
    soil_moisture_normalized: 0.5,
    temperature_normalized: 0.6,
    humidity_normalized: 0.7,
    pH_normalized: 0.5,
    moisture_trend: 0.1,
    temperature_trend: 0.05,
    humidity_trend: -0.05,
    optimal_irrigation: true,
    hour_of_day: 0.5,
    day_of_week: 0.3,
    season: 0.4,
    reading_freshness: 1,
    sensor_stability: 1,
  }));

  try {
    const gradients = await (manager as any).trainLocalModel(features, model);
    assert.ok(gradients.length > 0, 'gradient manager should produce gradient tensors');

    const after = await Promise.all(model.getWeights().map((weight) => weight.array()));
    assert.deepEqual(after, before, 'gradient manager must restore caller-owned global model weights');
  } finally {
    model.dispose();
  }
}

async function main() {
  await tf.setBackend('cpu');
  await tf.ready();

  await testWeightRoundTrip();
  await testPredictYieldReturnsFiniteResult();
  await testPredictWithLocalModelUsesVersionZero();
  await testInvalidInputFailsBeforeInference();
  await testGradientManagerRestoresGlobalModel();

  console.log('UI inference runtime tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
