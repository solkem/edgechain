/**
 * Browser storage helpers for FL aggregation artifacts.
 *
 * Shared aggregation algorithms and model-update types live in @edgechain/fl.
 * This file keeps UI-only localStorage behavior close to the browser code.
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

export function saveAggregationHistory(results: AggregationResult[]): void {
  try {
    localStorage.setItem(AGGREGATION_HISTORY_KEY, JSON.stringify(results));
    console.log(`✅ Saved aggregation history (${results.length} rounds)`);
  } catch (error) {
    console.error('Failed to save aggregation history:', error);
  }
}

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

export function clearAggregationData(): void {
  localStorage.removeItem(GLOBAL_MODEL_KEY);
  localStorage.removeItem(AGGREGATION_HISTORY_KEY);
  console.log('✅ Cleared aggregation data');
}
