/**
 * EdgeChain FL Aggregation Server
 *
 * Real backend server for multi-farmer federated learning demo
 * Receives model submissions from multiple farmers and aggregates them
 */

import express from 'express';
import cors from 'cors';
import { aggregationRouter } from './routes/aggregation';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for model weights

// Routes
app.use('/api/fl', aggregationRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'EdgeChain FL Aggregation Server',
    version: '1.0.0',
    description: 'Federated Learning Aggregation Server for EdgeChain',
    endpoints: {
      health: '/health',
      api: '/api/fl'
    },
    status: 'running'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Start server
app.listen(PORT, () => {
  console.log('\n===========================================');
  console.log('🌐 EdgeChain FL Aggregation Server');
  console.log('===========================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api/fl`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('===========================================\n');
  console.log('✅ Ready to receive farmer submissions!');
  console.log('👨‍🌾 Waiting for farmers to train and submit models...\n');
});
