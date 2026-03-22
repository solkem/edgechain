/**
 * Aggregation Service - Automated FedAvg Execution
 *
 * This service now treats the unified backend (`/api/fl/*`) as the
 * source of truth for submissions and aggregation state.
 *
 * The UI still keeps a lightweight local history for stats/visualization.
 */

import {
  saveGlobalModel,
  DEFAULT_AGGREGATION_CONFIG,
} from './aggregation';
import type {
  ModelSubmission,
  AggregationConfig,
  GlobalModel,
} from './types';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const isLocalDev =
  window.location.hostname === 'localhost' ||
  window.location.hostname.includes('githubpreview.dev') ||
  window.location.hostname.includes('codespaces') ||
  window.location.hostname.startsWith('10.') ||
  window.location.hostname.startsWith('127.');

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (isLocalDev ? 'http://localhost:3001' : '');

const SERVER_HISTORY_KEY = 'edgechain_server_aggregation_history';

interface FLStatusResponse {
  currentRound: number;
  currentVersion: number;
  pendingSubmissions: number;
  minSubmissions: number;
  globalModelAvailable: boolean;
  globalModelVersion: number | null;
}

interface SubmissionResponse {
  success: boolean;
  submissionCount: number;
  aggregated: boolean;
  globalModelVersion: number | null;
}

export interface SubmissionResult {
  submissionCount: number;
  aggregated: boolean;
  globalModelVersion: number | null;
  globalModel?: GlobalModel;
}

interface ServerAggregationSnapshot {
  round: number;
  version: number;
  createdAt: number;
  trainedBy: number;
  averageAccuracy: number;
}

async function fetchFLStatus(): Promise<FLStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/fl/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch FL status: ${response.statusText}`);
  }
  return response.json();
}

async function fetchGlobalModelFromServer(): Promise<GlobalModel> {
  const response = await fetch(`${API_BASE_URL}/api/fl/global-model`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Failed to fetch global model: ${response.statusText}`);
  }
  return response.json();
}

function loadServerHistory(): ServerAggregationSnapshot[] {
  try {
    const raw = localStorage.getItem(SERVER_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ServerAggregationSnapshot[]) : [];
  } catch {
    return [];
  }
}

function saveServerHistory(history: ServerAggregationSnapshot[]): void {
  localStorage.setItem(SERVER_HISTORY_KEY, JSON.stringify(history));
}

function addSnapshot(model: GlobalModel): void {
  const history = loadServerHistory();
  const exists = history.some((h) => h.round === model.round && h.version === model.version);
  if (exists) {
    return;
  }

  history.push({
    round: model.round,
    version: model.version,
    createdAt: model.metadata.createdAt,
    trainedBy: model.metadata.trainedBy,
    averageAccuracy: model.metadata.averageAccuracy,
  });
  saveServerHistory(history);
}

/**
 * Store model submission on the unified backend.
 */
export async function storeSubmission(submission: ModelSubmission): Promise<SubmissionResult> {
  const response = await fetch(`${API_BASE_URL}/api/fl/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to submit model: ${response.statusText}`);
  }

  const result = (await response.json()) as SubmissionResponse;
  console.log(`📥 Stored submission from ${submission.farmerId.slice(0, 10)}...`);
  console.log(`📊 Pending submissions: ${result.submissionCount}`);

  const submissionResult: SubmissionResult = {
    submissionCount: result.submissionCount,
    aggregated: result.aggregated,
    globalModelVersion: result.globalModelVersion,
  };

  // If backend already aggregated, cache the latest global model immediately.
  if (result.aggregated) {
    try {
      const model = await fetchGlobalModelFromServer();
      saveGlobalModel(model);
      addSnapshot(model);
      submissionResult.globalModel = model;
    } catch (error) {
      console.warn('Submission accepted, but failed to cache aggregated model:', error);
    }
  }

  return submissionResult;
}

/**
 * The unified backend does not expose pending submission payloads;
 * keep a compatibility shape for existing callers.
 */
export async function loadPendingSubmissions(): Promise<ModelSubmission[]> {
  return [];
}

/**
 * Kept for API compatibility; server owns submission lifecycle.
 */
export function clearPendingSubmissions(): void {
  console.log('ℹ️ clearPendingSubmissions is managed by backend /api/fl');
}

/**
 * Get current round number from unified backend status.
 */
export async function getCurrentRound(): Promise<number> {
  try {
    const status = await fetchFLStatus();
    return status.currentRound || 1;
  } catch (error) {
    console.error('Failed to get round from /api/fl/status:', error);
    return 1;
  }
}

/**
 * Kept for API compatibility; round progression is backend-managed.
 */
export function incrementRound(): void {
  console.log('ℹ️ incrementRound is managed by backend /api/fl');
}

// ============================================================================
// AGGREGATION TRIGGER
// ============================================================================

export interface AggregationStatus {
  canAggregate: boolean;
  currentSubmissions: number;
  requiredSubmissions: number;
  pendingSubmissions: ModelSubmission[];
  message: string;
}

/**
 * Check if aggregation is ready on backend.
 */
export async function checkAggregationReadiness(
  config: AggregationConfig = DEFAULT_AGGREGATION_CONFIG
): Promise<AggregationStatus> {
  const status = await fetchFLStatus();
  const required = status.minSubmissions || config.minSubmissions;
  const canAggregate = status.pendingSubmissions >= required;

  return {
    canAggregate,
    currentSubmissions: status.pendingSubmissions,
    requiredSubmissions: required,
    pendingSubmissions: [],
    message: canAggregate
      ? `✅ Ready to aggregate (${status.pendingSubmissions}/${required})`
      : `⏳ Waiting for more submissions (${status.pendingSubmissions}/${required})`,
  };
}

/**
 * Fetch the latest aggregated model from backend and cache it locally.
 */
export async function runAggregation(
  config: AggregationConfig = DEFAULT_AGGREGATION_CONFIG,
  onProgress?: (progress: number, message: string) => void
): Promise<GlobalModel> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   FEDERATED AVERAGING - STARTING      ║');
  console.log('╚════════════════════════════════════════╝\n');

  onProgress?.(10, 'Checking backend aggregation status...');

  const status = await fetchFLStatus();
  const required = status.minSubmissions || config.minSubmissions;
  const canFetchModel =
    status.globalModelAvailable || status.pendingSubmissions >= required;

  if (!canFetchModel) {
    throw new Error(`Not enough submissions: ${status.pendingSubmissions}/${required}`);
  }

  onProgress?.(60, 'Fetching global model from backend...');
  const globalModel = await fetchGlobalModelFromServer();

  onProgress?.(85, 'Caching global model locally...');
  saveGlobalModel(globalModel);
  addSnapshot(globalModel);

  onProgress?.(100, 'Aggregation complete!');

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   AGGREGATION SUCCESSFUL ✅            ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`🌐 Global model v${globalModel.version} (round ${globalModel.round}) cached`);

  return globalModel;
}

// ============================================================================
// AUTOMATIC AGGREGATION MONITORING
// ============================================================================

let aggregationWatcher: NodeJS.Timeout | null = null;

/**
 * Start automatic aggregation monitoring
 * Checks every N seconds if we have enough submissions
 */
export function startAggregationWatcher(
  intervalSeconds: number = 30,
  config: AggregationConfig = DEFAULT_AGGREGATION_CONFIG,
  onAggregationTriggered?: (model: GlobalModel) => void
): void {
  if (aggregationWatcher) {
    console.log('⚠️ Aggregation watcher already running');
    return;
  }

  console.log(`👁️ Starting aggregation watcher (checking every ${intervalSeconds}s)...`);

  let lastVersion: number | null = null;

  aggregationWatcher = setInterval(async () => {
    try {
      const status = await fetchFLStatus();
      const hasNewGlobalModel =
        status.globalModelAvailable &&
        status.globalModelVersion !== null &&
        status.globalModelVersion !== lastVersion;

      if (!hasNewGlobalModel) {
        return;
      }

      const model = await runAggregation(config);
      lastVersion = model.version;
      onAggregationTriggered?.(model);
    } catch (error) {
      console.error('❌ Auto-aggregation check failed:', error);
    }
  }, intervalSeconds * 1000);
}

/**
 * Stop automatic aggregation monitoring
 */
export function stopAggregationWatcher(): void {
  if (aggregationWatcher) {
    clearInterval(aggregationWatcher);
    aggregationWatcher = null;
    console.log('🛑 Stopped aggregation watcher');
  }
}

// ============================================================================
// STATS & UTILITIES
// ============================================================================

/**
 * Get aggregation statistics
 */
export async function getAggregationStats() {
  const history = loadServerHistory();
  const currentRound = await getCurrentRound();
  const status = await checkAggregationReadiness();

  if (history.length === 0 && !status.canAggregate) {
    return {
      totalRounds: 0,
      currentRound,
      latestVersion: status.requiredSubmissions > 0 ? 1 : 0,
      pendingSubmissions: status.currentSubmissions,
      averageParticipation: 0,
      totalFarmersServed: 0,
    };
  }

  const totalParticipants = history.reduce((sum, r) => sum + r.trainedBy, 0);

  return {
    totalRounds: history.length,
    currentRound,
    latestVersion: history.length > 0 ? history[history.length - 1].version : 0,
    latestAccuracy: history.length > 0 ? history[history.length - 1].averageAccuracy : 0,
    pendingSubmissions: status.currentSubmissions,
    averageParticipation: history.length > 0 ? totalParticipants / history.length : 0,
    totalFarmersServed: totalParticipants,
    history: history.map(r => ({
      round: r.round,
      version: r.version,
      farmers: r.trainedBy,
      accuracy: r.averageAccuracy,
      loss: 0,
      timestamp: new Date(r.createdAt).toLocaleString(),
    })),
  };
}

/**
 * Reset all aggregation data (for testing)
 */
export function resetAggregationSystem(): void {
  localStorage.removeItem('edgechain_global_model');
  localStorage.removeItem(SERVER_HISTORY_KEY);
  console.log('🔄 Reset aggregation system');
}
