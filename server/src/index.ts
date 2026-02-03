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
import { aggregationRouter } from './routes/aggregation';
import { iotRouter } from './routes/iot';
import { initializeDatabase, getDatabaseStats } from './database';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for model weights

// Serve gateway HTML from the gateway directory
// __dirname in production: /app/dist
// Gateway location in Docker: /app/gateway
const gatewayPath = path.join(__dirname, '../gateway');
console.log(`📁 Serving gateway files from: ${gatewayPath}`);
app.use('/gateway', express.static(gatewayPath));

// Serve frontend static files from packages/ui/dist
// __dirname in production: /app/dist
// Frontend location in Docker: /app/packages/ui/dist
const frontendPath = path.join(__dirname, '../packages/ui/dist');
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
      'Arduino IoT': '/api/arduino',
      'Device Registry': '/api/arduino/registry',
      'Database Stats': '/api/db-stats'
    },
    endpoints: {
      health: '/health',
      fl: '/api/fl',
      arduino: '/api/arduino',
      registry: '/api/arduino/registry',
      stats: '/api/db-stats'
    },
    status: 'running'
  });
});

// API Routes (must be before catch-all route)
app.use('/api/fl', aggregationRouter);
app.use('/api/arduino', iotRouter); // Keep /api/arduino path for backward compatibility

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
  console.log(`🔗 Arduino API: http://localhost:${PORT}/api/arduino`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('===========================================\n');
  console.log('✅ Ready to receive:');
  console.log('   👨‍🌾 Farmer model submissions (FL)');
  console.log('   📊 Arduino sensor data (IoT)\n');
});
