/**
 * FL Aggregation Routes
 *
 * Handles farmer submissions and model aggregation
 */

import { Router } from 'express';
import { AggregationService } from '../services/aggregation';

const router = Router();
const aggregationService = new AggregationService();

/**
 * POST /api/fl/submit
 * Farmer submits trained model weights
 */
router.post('/submit', async (req, res) => {
  try {
    const submission = req.body;

    console.log('\n📥 SUBMISSION RECEIVED');
    console.log('═══════════════════════════════════════');
    console.log(`👨‍🌾 Farmer: ${submission.farmerId.slice(0, 25)}...`);
    console.log(`📊 Dataset Size: ${submission.datasetSize} seasons`);
    console.log(`📈 MAE: ${submission.metrics.mae.toFixed(4)}`);
    console.log(`🎯 Accuracy: ${(submission.metrics.accuracy * 100).toFixed(1)}%`);
    console.log(`🔐 Signature: ${submission.signature?.slice(0, 20)}...`);
    console.log(`⏰ Timestamp: ${new Date(submission.timestamp).toLocaleTimeString()}`);
    console.log('═══════════════════════════════════════\n');

    // Add submission to aggregation service
    const result = await aggregationService.addSubmission(submission);

    if (result.aggregated) {
      console.log('🎉 AGGREGATION TRIGGERED!\n');
    }

    res.json({
      success: true,
      submissionCount: result.submissionCount,
      aggregated: result.aggregated,
      globalModelVersion: result.globalModelVersion,
    });
  } catch (error: any) {
    console.error('❌ Submission error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/fl/global-model
 * Farmers download the latest global model
 */
router.get('/global-model', (req, res) => {
  const globalModel = aggregationService.getGlobalModel();

  if (!globalModel) {
    return res.status(404).json({
      error: 'No global model available yet',
      message: 'Waiting for minimum submissions to aggregate',
    });
  }

  console.log(`📤 Global model v${globalModel.version} downloaded by farmer\n`);

  res.json(globalModel);
});

/**
 * GET /api/fl/status
 * Get current FL system status
 */
router.get('/status', (req, res) => {
  const status = aggregationService.getStatus();
  res.json(status);
});

/**
 * POST /api/fl/reset
 * Reset aggregation state (demo purposes)
 */
router.post('/reset', (req, res) => {
  aggregationService.reset();
  console.log('🔄 Aggregation state reset\n');
  res.json({ success: true, message: 'Aggregation state reset' });
});

export { router as aggregationRouter };
