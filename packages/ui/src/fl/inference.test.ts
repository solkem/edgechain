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

async function main() {
  await tf.setBackend('cpu');
  await tf.ready();

  await testWeightRoundTrip();
  await testPredictYieldReturnsFiniteResult();
  await testPredictWithLocalModelUsesVersionZero();
  await testInvalidInputFailsBeforeInference();

  console.log('UI inference runtime tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
