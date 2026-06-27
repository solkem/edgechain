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
import { initializeIoTRoutes, iotRouter } from './routes/iot';
import { manualObservationsRouter } from './routes/manualObservations';
import { whatsappRouter } from './routes/whatsapp';
import { authRouter } from './routes/auth';
import { farmsRouter } from './routes/farms';
import { agentRouter } from './routes/agent';
import { aiFarmManagerRouter } from './routes/aiFarmManager';
import { virtualNdaniRouter } from './routes/virtualNdani';
import { coordinatorRouter } from './routes/coordinator';
import { physicalNdaniRouter } from './routes/physicalNdani';
import { initializeDatabase, getDatabaseStats } from './database';
import crypto from 'crypto';
import { requireTrustedPilotOrigin } from './auth/originMiddleware';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// H2 FIX: Restrict CORS in production
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? corsOrigins : true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Large limit for model weights
app.use((req, res, next) => {
  const correlationId = req.header('x-correlation-id') || crypto.randomUUID();
  res.setHeader('x-correlation-id', correlationId);
  next();
});

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
app.get('/api/db-stats', async (_req, res) => {
  try {
    const stats = await getDatabaseStats();
    res.json({
      database: 'PostgreSQL',
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
app.use('/api/v1/physical-ndani', physicalNdaniRouter);
if (process.env.AGENT_ENABLED === 'true') {
  app.use('/api/v1', requireTrustedPilotOrigin);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/farms', farmsRouter);
  app.use('/api/v1/agent', agentRouter);
  app.use('/api/v1/ai-farm-manager', aiFarmManagerRouter);
  if (process.env.VIRTUAL_NDANI_ENABLED !== 'false') {
    app.use('/api/v1/virtual-ndani', virtualNdaniRouter);
    if (process.env.VIRTUAL_NDANI_COORDINATOR_ENABLED !== 'false') {
      app.use('/api/v1/coordinator', coordinatorRouter);
      console.log('🧭 Virtual Ndani Kit coordinator routes enabled');
    }
    console.log('📡 Virtual Ndani Kit pilot routes enabled');
  }
  console.log('🌾 AI Farm Agent foundation routes enabled');
}

// SPA fallback - serve frontend for all other routes (MUST BE LAST)
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

async function startServer() {
  await initializeDatabase();
  await initializeIoTRoutes();

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
}

startServer().catch((error) => {
  console.error('Failed to start EdgeChain backend:', error);
  process.exit(1);
});
