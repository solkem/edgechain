/**
 * Aggregation Service - Automated FedAvg Execution
 *
 * This service monitors contract submissions and automatically triggers
 * Federated Averaging when enough farmers have submitted.
 *
 * In production, this would run as:
 * - A dedicated node.js service
 * - AWS Lambda / Cloud Function
 * - Decentralized compute (Akash, Bacalhau)
 *
 * For demo: Runs client-side in browser
 */

import {
  aggregateModelUpdates,
  createGlobalModel,
  saveGlobalModel,
  saveAggregationHistory,
  loadAggregationHistory,
  DEFAULT_AGGREGATION_CONFIG,
} from './modelStore';
import type {
  ModelSubmission,
  AggregationConfig,
  GlobalModel,
  AggregationResult,
} from './types';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://edgechain-midnight.fly.dev';

// ============================================================================
// SUBMISSION STORAGE (Backend API - shared across devices)
// ============================================================================

const SUBMISSIONS_KEY = 'edgechain_pending_submissions';
const CURRENT_ROUND_KEY = 'edgechain_current_round';

/**
 * Store model submission (encrypted)
 * Sends to backend API for shared storage across devices
 */
export async function storeSubmission(submission: ModelSubmission): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fl/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      throw new Error(`Failed to store submission: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`📥 Stored submission from ${submission.farmerId.slice(0, 10)}...`);
    console.log(`📊 Submission count: ${result.submissionCount}`);
  } catch (error) {
    console.error('Failed to store submission via API:', error);
    // Fallback to localStorage
    const submissions = loadPendingSubmissionsLocal();
    submissions.push(submission);
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
    console.log('⚠️ Stored submission locally (API unavailable)');
  }
}

/**
 * Load pending submissions from local fallback storage.
 *
 * The unified backend owns live aggregation state and intentionally exposes
 * aggregate status rather than raw pending model submissions.
 */
export async function loadPendingSubmissions(): Promise<ModelSubmission[]> {
  return loadPendingSubmissionsLocal();
}

/**
 * Load from localStorage (fallback)
 */
function loadPendingSubmissionsLocal(): ModelSubmission[] {
  try {
    const data = localStorage.getItem(SUBMISSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load submissions:', error);
    return [];
  }
}

/**
 * Clear submissions after aggregation
 */
export function clearPendingSubmissions(): void {
  localStorage.removeItem(SUBMISSIONS_KEY);
  console.log('🗑️ Cleared pending submissions (round complete)');
}

/**
 * Get current round number from API
 */
export async function getCurrentRound(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fl/status`);
    if (!response.ok) {
      throw new Error(`Failed to get round: ${response.statusText}`);
    }
    const data = await response.json();
    return data.currentRound || 1;
  } catch (error) {
    console.error('Failed to get round from API:', error);
    // Fallback to localStorage
    const round = localStorage.getItem(CURRENT_ROUND_KEY);
    return round ? parseInt(round, 10) : 1;
  }
}

/**
 * Increment round number (called after aggregation)
 */
export function incrementRound(): void {
  const newRound = parseInt(localStorage.getItem(CURRENT_ROUND_KEY) || '1', 10) + 1;
  localStorage.setItem(CURRENT_ROUND_KEY, newRound.toString());
  console.log(`📈 Advanced to Round ${newRound}`);
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
 * Check if we have enough submissions to run aggregation
 */
export async function checkAggregationReadiness(
  config: AggregationConfig = DEFAULT_AGGREGATION_CONFIG
): Promise<AggregationStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fl/status`);
    if (!response.ok) {
      throw new Error(`Failed to load FL status: ${response.statusText}`);
    }

    const status = await response.json();
    const currentSubmissions = status.pendingSubmissions ?? 0;
    const requiredSubmissions = status.minSubmissions ?? config.minSubmissions;
    const canAggregate = currentSubmissions >= requiredSubmissions;

    return {
      canAggregate,
      currentSubmissions,
      requiredSubmissions,
      pendingSubmissions: [],
      message: status.globalModelAvailable
        ? `✅ Global model v${status.globalModelVersion} available`
        : canAggregate
          ? `✅ Ready to aggregate! (${currentSubmissions} submissions)`
          : `⏳ Waiting for more submissions (${currentSubmissions}/${requiredSubmissions})`,
    };
  } catch (error) {
    console.error('Failed to load FL status from API:', error);
  }

  const submissions = await loadPendingSubmissions();
  const canAggregate = submissions.length >= config.minSubmissions;

  return {
    canAggregate,
    currentSubmissions: submissions.length,
    requiredSubmissions: config.minSubmissions,
    pendingSubmissions: submissions,
    message: canAggregate
      ? `✅ Ready to aggregate! (${submissions.length} submissions)`
      : `⏳ Waiting for more submissions (${submissions.length}/${config.minSubmissions})`,
  };
}

/**
 * Run aggregation pipeline
 *
 * Steps:
 * 1. Load pending submissions
 * 2. Run FedAvg algorithm
 * 3. Create global model
 * 4. Save to storage (local for demo, IPFS for production)
 * 5. Update contract with new model hash
 * 6. Clear submissions and advance round
 */
export async function runAggregation(
  config: AggregationConfig = DEFAULT_AGGREGATION_CONFIG,
  onProgress?: (progress: number, message: string) => void
): Promise<GlobalModel> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   FEDERATED AVERAGING - STARTING      ║');
  console.log('╚════════════════════════════════════════╝\n');

  onProgress?.(10, 'Loading submissions...');

  // Step 1: Load submissions
  const submissions = await loadPendingSubmissions();
  if (submissions.length < config.minSubmissions) {
    throw new Error(
      `Not enough submissions: ${submissions.length} < ${config.minSubmissions}`
    );
  }

  console.log(`📥 Loaded ${submissions.length} submissions`);
  onProgress?.(20, `Processing ${submissions.length} submissions...`);

  // Step 2: Run FedAvg algorithm
  const currentRound = await getCurrentRound();
  const history = loadAggregationHistory();
  const currentVersion = history.length > 0 ? history[history.length - 1].modelVersion : 0;

  console.log(`📊 Current Round: ${currentRound}, Version: ${currentVersion}`);
  onProgress?.(30, 'Running Federated Averaging algorithm...');

  const aggregationResult: AggregationResult = await aggregateModelUpdates(
    submissions,
    currentRound,
    currentVersion,
    config
  );

  onProgress?.(60, 'Creating global model...');

  // Step 3: Create global model package
  const globalModel = createGlobalModel(aggregationResult, submissions);

  console.log(`✅ Global Model v${globalModel.version} created`);
  console.log(`   Trained by: ${globalModel.metadata.trainedBy} farmers`);
  console.log(`   Total samples: ${globalModel.metadata.totalSamples}`);
  console.log(`   Avg accuracy: ${(globalModel.metadata.averageAccuracy * 100).toFixed(2)}%`);

  onProgress?.(80, 'Saving global model...');

  // Step 4: Save global model
  saveGlobalModel(globalModel);

  // Step 5: Save aggregation history
  history.push(aggregationResult);
  saveAggregationHistory(history);

  onProgress?.(90, 'Updating blockchain...');

  // Step 6: Update contract (mock for now)
  // In production: await contract.completeAggregation(modelHash)
  console.log('📝 Would call: contract.completeAggregation(modelHash)');

  onProgress?.(95, 'Finalizing round...');

  // Step 7: Clear submissions and advance round
  clearPendingSubmissions();
  incrementRound();

  onProgress?.(100, 'Aggregation complete!');

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   AGGREGATION SUCCESSFUL ✅            ║');
  console.log('╚════════════════════════════════════════╝\n');

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

  aggregationWatcher = setInterval(async () => {
    const status = await checkAggregationReadiness(config);

    if (status.canAggregate) {
      console.log('🚀 Threshold reached! Triggering automatic aggregation...');

      try {
        const globalModel = await runAggregation(config);
        onAggregationTriggered?.(globalModel);
      } catch (error) {
        console.error('❌ Auto-aggregation failed:', error);
      }
    } else {
      console.log(status.message);
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
  const history = loadAggregationHistory();
  const currentRound = await getCurrentRound();
  const pendingSubmissions = await loadPendingSubmissions();

  if (history.length === 0) {
    return {
      totalRounds: 0,
      currentRound,
      latestVersion: 0,
      pendingSubmissions: pendingSubmissions.length,
      averageParticipation: 0,
      totalFarmersServed: 0,
    };
  }

  const totalParticipants = history.reduce((sum, r) => sum + r.numSubmissions, 0);
  const uniqueFarmers = new Set(history.flatMap(r => r.participatingFarmers));

  return {
    totalRounds: history.length,
    currentRound,
    latestVersion: history[history.length - 1].modelVersion,
    latestAccuracy: history[history.length - 1].aggregationMetrics.weightedAccuracy,
    pendingSubmissions: pendingSubmissions.length,
    averageParticipation: totalParticipants / history.length,
    totalFarmersServed: uniqueFarmers.size,
    history: history.map(r => ({
      round: r.round,
      version: r.modelVersion,
      farmers: r.numSubmissions,
      accuracy: r.aggregationMetrics.weightedAccuracy,
      loss: r.aggregationMetrics.averageLoss,
      timestamp: new Date(r.timestamp).toLocaleString(),
    })),
  };
}

/**
 * Reset all aggregation data (for testing)
 */
export function resetAggregationSystem(): void {
  clearPendingSubmissions();
  localStorage.removeItem(CURRENT_ROUND_KEY);
  localStorage.removeItem('edgechain_global_model');
  localStorage.removeItem('edgechain_aggregation_history');
  console.log('🔄 Reset aggregation system');
}
