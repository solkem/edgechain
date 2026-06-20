/**
 * EdgeChain Unified Backend Server
 *
 * Multi-purpose backend for EdgeChain system:
 * 1. Federated Learning aggregation (FL routes)
 * 2. IoT device data collection with incentive layer (IoT routes)
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { existsSync } from 'fs';
import { aggregationRouter } from './routes/aggregation';
import { iotRouter } from './routes/iot';
import { manualObservationsRouter } from './routes/manualObservations';
import { whatsappRouter } from './routes/whatsapp';
import { initializeDatabase, getDatabaseStats } from './database';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Middleware
// H2 FIX: Restrict CORS in production
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? corsOrigins : true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Large limit for model weights

// Serve frontend static files from the sibling web app build.
const frontendPathCandidates = [
  process.env.FRONTEND_DIST_PATH,
  path.resolve(__dirname, '../../web/dist'),
  path.resolve(__dirname, '../apps/web/dist')
].filter((candidate): candidate is string => Boolean(candidate));
const frontendPath = frontendPathCandidates.find((candidate) => existsSync(candidate)) ?? frontendPathCandidates[0];
console.log(`📁 Serving frontend from: ${frontendPath}`);
app.use(express.static(frontendPath));

// Health check (must be before catch-all route)
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Database statistics endpoint (must be before catch-all route)
app.get('/api/db-stats', (_req, res) => {
  try {
    const stats = getDatabaseStats();
    res.json({
      database: 'SQLite',
      stats,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API info endpoint (must be before catch-all route)
app.get('/api', (_req, res) => {
  res.json({
    name: 'EdgeChain Unified Backend',
    version: '2.0.0',
    description: 'Unified backend for EdgeChain: Federated Learning + IoT devices with Midnight Testnet',
    services: {
      'Federated Learning': '/api/fl',
      'Sensor Node': '/api/sensor-node',
      'Manual Observations': '/api/manual-observations',
      'WhatsApp Pilot Adapter': '/api/whatsapp',
      'Device Registry': '/api/sensor-node/registry',
      'Database Stats': '/api/db-stats'
    },
    endpoints: {
      health: '/health',
      fl: '/api/fl',
      sensor_node: '/api/sensor-node',
      manual_observations: '/api/manual-observations',
      whatsapp: '/api/whatsapp',
      registry: '/api/sensor-node/registry',
      stats: '/api/db-stats'
    },
    status: 'running'
  });
});

// API Routes (must be before catch-all route)
app.use('/api/fl', aggregationRouter);
app.use('/api/sensor-node', iotRouter);
app.use('/api/manual-observations', manualObservationsRouter);
app.use('/api/whatsapp', whatsappRouter);

// SPA fallback - serve frontend for all other routes (MUST BE LAST)
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log('\n===========================================');
  console.log('🌐 EdgeChain Unified Backend');
  console.log('===========================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 FL API: http://localhost:${PORT}/api/fl`);
  console.log(`🔗 Sensor Node API: http://localhost:${PORT}/api/sensor-node`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('===========================================\n');
  console.log('✅ Ready to receive:');
  console.log('   👨‍🌾 Farmer model submissions (FL)');
  console.log('   📊 Sensor Node data (IoT)\n');
});
