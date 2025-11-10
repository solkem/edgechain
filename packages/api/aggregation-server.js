/**
 * EdgeChain Aggregation Server
 *
 * Simple in-memory storage for federated learning submissions
 * This allows multiple devices to share submissions and trigger aggregation
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory storage (in production, use Redis, PostgreSQL, etc.)
let pendingSubmissions = [];
let currentRound = 1;
let globalModel = null;
let aggregationHistory = [];

// Configuration
const MIN_SUBMISSIONS = 2;

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    pendingSubmissions: pendingSubmissions.length,
    currentRound
  });
});

/**
 * POST /api/submissions - Store a new model submission
 */
app.post('/api/submissions', (req, res) => {
  try {
    const submission = req.body;

    // Basic validation
    if (!submission.farmerId || !submission.modelWeights) {
      return res.status(400).json({ error: 'Invalid submission' });
    }

    // Check for duplicate from same farmer in current round
    const existingIndex = pendingSubmissions.findIndex(
      s => s.farmerId === submission.farmerId && s.round === currentRound
    );

    if (existingIndex >= 0) {
      // Update existing submission
      pendingSubmissions[existingIndex] = submission;
      console.log(`📝 Updated submission from ${submission.farmerId.slice(0, 10)}...`);
    } else {
      // Add new submission
      pendingSubmissions.push(submission);
      console.log(`📥 New submission from ${submission.farmerId.slice(0, 10)}...`);
    }

    console.log(`📊 Total submissions: ${pendingSubmissions.length}/${MIN_SUBMISSIONS}`);

    res.json({
      success: true,
      currentSubmissions: pendingSubmissions.length,
      requiredSubmissions: MIN_SUBMISSIONS,
      canAggregate: pendingSubmissions.length >= MIN_SUBMISSIONS
    });
  } catch (error) {
    console.error('Error storing submission:', error);
    res.status(500).json({ error: 'Failed to store submission' });
  }
});

/**
 * GET /api/submissions - Get all pending submissions
 */
app.get('/api/submissions', (req, res) => {
  res.json({
    submissions: pendingSubmissions,
    count: pendingSubmissions.length,
    requiredSubmissions: MIN_SUBMISSIONS,
    canAggregate: pendingSubmissions.length >= MIN_SUBMISSIONS
  });
});

/**
 * GET /api/status - Get aggregation status
 */
app.get('/api/status', (req, res) => {
  res.json({
    canAggregate: pendingSubmissions.length >= MIN_SUBMISSIONS,
    currentSubmissions: pendingSubmissions.length,
    requiredSubmissions: MIN_SUBMISSIONS,
    currentRound,
    message: pendingSubmissions.length >= MIN_SUBMISSIONS
      ? `✅ Ready to aggregate! (${pendingSubmissions.length} submissions)`
      : `⏳ Waiting for more submissions (${pendingSubmissions.length}/${MIN_SUBMISSIONS})`
  });
});

/**
 * POST /api/aggregate/complete - Mark aggregation as complete
 */
app.post('/api/aggregate/complete', (req, res) => {
  try {
    const { globalModel: newGlobalModel, aggregationResult } = req.body;

    // Store global model
    globalModel = newGlobalModel;

    // Store aggregation history
    if (aggregationResult) {
      aggregationHistory.push(aggregationResult);
    }

    // Clear pending submissions
    console.log(`🗑️ Clearing ${pendingSubmissions.length} submissions`);
    pendingSubmissions = [];

    // Increment round
    currentRound++;
    console.log(`📈 Advanced to Round ${currentRound}`);

    res.json({
      success: true,
      currentRound,
      message: 'Aggregation complete'
    });
  } catch (error) {
    console.error('Error completing aggregation:', error);
    res.status(500).json({ error: 'Failed to complete aggregation' });
  }
});

/**
 * GET /api/global-model - Get latest global model
 */
app.get('/api/global-model', (req, res) => {
  if (!globalModel) {
    return res.status(404).json({ error: 'No global model available yet' });
  }
  res.json(globalModel);
});

/**
 * GET /api/round - Get current round
 */
app.get('/api/round', (req, res) => {
  res.json({ currentRound });
});

/**
 * GET /api/history - Get aggregation history
 */
app.get('/api/history', (req, res) => {
  res.json({
    history: aggregationHistory,
    totalRounds: aggregationHistory.length
  });
});

/**
 * POST /api/reset - Reset all data (for testing)
 */
app.post('/api/reset', (req, res) => {
  pendingSubmissions = [];
  currentRound = 1;
  globalModel = null;
  aggregationHistory = [];

  console.log('🔄 System reset');

  res.json({
    success: true,
    message: 'System reset complete'
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   EdgeChain Aggregation Server         ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Minimum submissions: ${MIN_SUBMISSIONS}`);
  console.log(`🔄 Current round: ${currentRound}`);
  console.log('');
  console.log('Endpoints:');
  console.log('  POST /api/submissions      - Submit model');
  console.log('  GET  /api/submissions      - List submissions');
  console.log('  GET  /api/status          - Check status');
  console.log('  POST /api/aggregate/complete - Complete aggregation');
  console.log('  GET  /api/global-model    - Get global model');
  console.log('  GET  /api/round           - Get current round');
  console.log('  POST /api/reset           - Reset system');
  console.log('');
});
