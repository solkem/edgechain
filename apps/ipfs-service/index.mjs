/**
 * EdgeChain IPFS Microservice
 *
 * ESM-based service for uploading ZK proofs to IPFS using Storacha (Web3.Storage)
 * Runs on port 3002 and provides REST API for the main EdgeChain server
 */

import express from 'express';
import cors from 'cors';
import { create } from '@storacha/client';
import * as Signer from '@ucanto/principal/ed25519';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// IPFS client (will be initialized with credentials)
let ipfsClient = null;
let initialized = false;

/**
 * Initialize IPFS client
 * For demo purposes, we'll use a public/demo configuration
 */
async function initializeIPFS() {
  if (initialized) return;

  try {
    console.log('🔧 Initializing IPFS client (Storacha)...');

    // For hackathon demo without Storacha credentials, use mock mode
    // In production, you'd configure with proper credentials from environment variables

    if (process.env.STORACHA_EMAIL && process.env.STORACHA_TOKEN) {
      // Real IPFS with credentials
      const principal = await Signer.generate();
      ipfsClient = await create({ principal });
      initialized = true;
      console.log('✅ IPFS client initialized with Storacha credentials');
    } else {
      // Mock mode for demo
      console.log('⚠️  No Storacha credentials found');
      console.log('   Set STORACHA_EMAIL and STORACHA_TOKEN env vars for real IPFS');
      console.log('   Running in MOCK MODE - will generate demo CIDs');
      ipfsClient = null;
      initialized = false;
    }
  } catch (error) {
    console.error('❌ IPFS initialization failed:', error.message);
    console.log('⚠️  IPFS service will return mock CIDs for demo purposes');
    ipfsClient = null;
    initialized = false;
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'EdgeChain IPFS Service',
    ipfs_enabled: initialized,
    timestamp: Date.now()
  });
});

/**
 * Upload ZK proof to IPFS
 * POST /upload
 * Body: { proof: string, public_inputs: object, reading: object, metadata: object }
 * Returns: { cid: string, gateway_url: string }
 */
app.post('/upload', async (req, res) => {
  try {
    const { proof, public_inputs, reading, metadata } = req.body;

    if (!proof || !public_inputs || !reading) {
      return res.status(400).json({
        error: 'Missing required fields: proof, public_inputs, reading'
      });
    }

    // Create the data structure for IPFS
    const ipfsData = {
      version: '1.0',
      type: 'zk_proof_submission',
      proof,
      public_inputs,
      reading,
      metadata: {
        ...metadata,
        uploaded_at: Date.now(),
        service: 'EdgeChain Privacy IoT'
      }
    };

    if (initialized && ipfsClient) {
      // Upload to real IPFS
      console.log('📤 Uploading to IPFS...');

      // Convert to Blob/File format expected by Storacha
      const jsonString = JSON.stringify(ipfsData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Upload to IPFS
      const cid = await ipfsClient.uploadFile(blob);

      const gatewayUrl = `https://w3s.link/ipfs/${cid}`;

      console.log(`✅ Uploaded to IPFS: ${cid}`);

      return res.json({
        success: true,
        cid: cid.toString(),
        gateway_url: gatewayUrl,
        size: jsonString.length
      });

    } else {
      // Demo mode: Generate mock CID
      console.log('⚠️  IPFS not initialized, generating mock CID');

      // Generate a realistic-looking CID (bafybei... format for CIDv1)
      const hash = Buffer.from(JSON.stringify(ipfsData)).toString('base64')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase()
        .slice(0, 52);
      const mockCID = `bafybei${hash}`;

      const gatewayUrl = `https://w3s.link/ipfs/${mockCID}`;

      console.log(`✅ Generated mock CID: ${mockCID}`);

      return res.json({
        success: true,
        cid: mockCID,
        gateway_url: gatewayUrl,
        mock: true,
        message: 'Using mock CID for demo (IPFS client not initialized)'
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      details: error.message
    });
  }
});

/**
 * Retrieve data from IPFS by CID
 * GET /retrieve/:cid
 * Returns: { success: boolean, data: object }
 */
app.get('/retrieve/:cid', async (req, res) => {
  try {
    const { cid } = req.params;

    if (!cid) {
      return res.status(400).json({ error: 'CID required' });
    }

    if (initialized && ipfsClient) {
      // Retrieve from real IPFS
      console.log(`📥 Retrieving from IPFS: ${cid}`);

      const response = await fetch(`https://w3s.link/ipfs/${cid}`);

      if (!response.ok) {
        throw new Error(`IPFS gateway returned ${response.status}`);
      }

      const data = await response.json();

      console.log(`✅ Retrieved from IPFS: ${cid}`);

      return res.json({
        success: true,
        cid,
        data
      });

    } else {
      // Demo mode: Return mock data
      console.log('⚠️  IPFS not initialized, returning mock data');

      return res.json({
        success: true,
        cid,
        mock: true,
        message: 'Using mock data (IPFS client not initialized)',
        data: {
          version: '1.0',
          type: 'zk_proof_submission',
          proof: 'mock_proof_data',
          public_inputs: {
            nullifier: 'mock_nullifier',
            epoch: 20405
          }
        }
      });
    }

  } catch (error) {
    console.error('Retrieve error:', error);
    res.status(500).json({
      error: 'Retrieval failed',
      details: error.message
    });
  }
});

/**
 * Get gateway URL for a CID
 * GET /gateway/:cid
 * Returns: { url: string }
 */
app.get('/gateway/:cid', (req, res) => {
  const { cid } = req.params;
  res.json({
    url: `https://w3s.link/ipfs/${cid}`,
    cid
  });
});

// Initialize and start server
await initializeIPFS();

app.listen(PORT, () => {
  console.log('');
  console.log('🌐 EdgeChain IPFS Service');
  console.log('==========================');
  console.log(`📍 Listening on: http://localhost:${PORT}`);
  console.log(`💾 IPFS Status: ${initialized ? '✅ Enabled' : '⚠️  Mock Mode'}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  /health`);
  console.log(`  POST /upload`);
  console.log(`  GET  /retrieve/:cid`);
  console.log(`  GET  /gateway/:cid`);
  console.log('');
});
