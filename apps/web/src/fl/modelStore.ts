/**
 * Browser storage helpers for FL aggregation artifacts.
 *
 * Shared aggregation algorithms and model-update types live in @edgechain/fl.
 * This file keeps UI-only localStorage behavior close to the browser code.
 *
 * The stored global model is a JSON serialization of model weights, not a
 * TensorFlow.js SavedModel. Callers recreate the TF.js model architecture and
 * then load these weights when they need inference or local fine-tuning.
 */

import type { AggregationResult, GlobalModel } from '@edgechain/fl';

export {
  aggregateModelUpdates,
  createGlobalModel,
  DEFAULT_AGGREGATION_CONFIG,
  federatedAveraging,
} from '@edgechain/fl';

const GLOBAL_MODEL_KEY = 'edgechain_global_model';
const AGGREGATION_HISTORY_KEY = 'edgechain_aggregation_history';

/**
 * Save global model to local storage.
 *
 * localStorage makes the demo easy to inspect, but it is not a durable model
 * registry. Production should store encrypted artifacts in durable storage and
 * anchor the resulting content hash through the contract flow.
 *
 * In production, store on IPFS and save the content hash on-chain.
 */
export function saveGlobalModel(model: GlobalModel): void {
  try {
    localStorage.setItem(GLOBAL_MODEL_KEY, JSON.stringify(model));
    console.log(`✅ Saved global model v${model.version}`);
  } catch (error) {
    console.error('Failed to save global model:', error);
    throw new Error('Failed to save global model');
  }
}

/**
 * Load the latest browser-local global model package, if one has been created
 * by the demo aggregation flow or downloaded from the backend.
 */
export function loadGlobalModel(): GlobalModel | null {
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
 * Persist round-level aggregation results for dashboard stats and versioning.
 * This is intentionally UI history, not the authoritative FL ledger.
 */
export function saveAggregationHistory(results: AggregationResult[]): void {
  try {
    localStorage.setItem(AGGREGATION_HISTORY_KEY, JSON.stringify(results));
    console.log(`✅ Saved aggregation history (${results.length} rounds)`);
  } catch (error) {
    console.error('Failed to save aggregation history:', error);
  }
}

/**
 * Load local aggregation history. Parse failures are treated as missing history
 * so a corrupted browser cache does not break the training dashboard.
 */
export function loadAggregationHistory(): AggregationResult[] {
  try {
    const serialized = localStorage.getItem(AGGREGATION_HISTORY_KEY);
    if (!serialized) return [];

    return JSON.parse(serialized) as AggregationResult[];
  } catch (error) {
    console.error('Failed to load aggregation history:', error);
    return [];
  }
}

/**
 * Clear global model artifacts created by the browser demo flow.
 */
export function clearAggregationData(): void {
  localStorage.removeItem(GLOBAL_MODEL_KEY);
  localStorage.removeItem(AGGREGATION_HISTORY_KEY);
  console.log('✅ Cleared aggregation data');
}
