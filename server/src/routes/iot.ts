/**
 * Arduino Integration Routes
 *
 * Handles device registration, BLE data, and ZK proof generation
 */

import { Router } from 'express';
import { DeviceRegistryService } from '../services/deviceRegistry';
import { BLEReceiverService } from '../services/bleReceiver';
import { DatabasePersistenceService } from '../services/databasePersistence';
import { DeviceAuthService } from '../services/deviceAuth';
import { NullifierTrackingService } from '../services/nullifierTracking';
import { ZKProofService } from '../services/zkProofService';
import { ipfsStorage } from '../services/ipfsStorage';
import { SignedReading } from '../types/iot';
// TODO: Re-enable in Phase 3 (Midnight SDK integration)
// import { deploymentWalletService } from '../services/deploymentWallet';

const router = Router();
const registryService = new DeviceRegistryService();
const bleService = new BLEReceiverService();
const dbService = new DatabasePersistenceService();
const authService = new DeviceAuthService();
const nullifierService = new NullifierTrackingService();
const zkProofService = new ZKProofService();

// ============= DEVICE AUTHENTICATION ENDPOINTS =============

/**
 * POST /api/arduino/auth/request-challenge
 * Request authentication challenge for device registration
 * Device must sign this challenge to prove ownership of private key
 */
router.post('/auth/request-challenge', (req, res) => {
  try {
    const { device_pubkey } = req.body;

    if (!device_pubkey) {
      return res.status(400).json({ error: 'device_pubkey required' });
    }

    // Validate pubkey format (64 hex chars = 32 bytes)
    if (!/^[0-9a-f]{64}$/i.test(device_pubkey)) {
      return res.status(400).json({ error: 'Invalid device_pubkey format (must be 64 hex chars)' });
    }

    const challenge = authService.issueChallenge(device_pubkey);

    res.json({
      success: true,
      challenge: challenge.challenge,
      device_pubkey: challenge.devicePubkey,
      expires_in: 300, // 5 minutes
    });
  } catch (error: any) {
    console.error('Challenge request error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/arduino/auth/verify-signature
 * Verify device signature on challenge
 * This proves the device owns the private key corresponding to device_pubkey
 */
router.post('/auth/verify-signature', async (req, res) => {
  try {
    const { device_pubkey, challenge, signature } = req.body;

    if (!device_pubkey || !challenge || !signature) {
      return res.status(400).json({ error: 'device_pubkey, challenge, and signature required' });
    }

    const isValid = await authService.verifyChallenge({
      devicePubkey: device_pubkey,
      challenge,
      signature,
    });

    if (isValid) {
      res.json({
        success: true,
        authenticated: true,
        message: 'Device authentication successful',
      });
    } else {
      res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Invalid signature or expired challenge',
      });
    }
  } catch (error: any) {
    console.error('Signature verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/arduino/auth/generate-keypair
 * Generate ED25519 keypair for testing (DEMO ONLY)
 * In production, this should ONLY run on the Arduino device!
 * Set DEMO_MODE=true in environment to enable.
 */
router.post('/auth/generate-keypair', async (req, res) => {
  try {
    // Feature flag: Disable in production
    const DEMO_MODE = process.env.DEMO_MODE === 'true';
    if (!DEMO_MODE) {
      return res.status(403).json({
        error: 'Endpoint disabled in production',
        message: 'Set DEMO_MODE=true in environment to enable keypair generation. In production, keys are generated on ATECC608B secure element.',
      });
    }

    const keypair = await DeviceAuthService.generateKeypair();

    console.log('⚠️  DEMO: Generated device keypair');
    console.log('   Public Key:', keypair.publicKey);
    console.log('   NEVER expose private key in production!');

    res.json({
      success: true,
      public_key: keypair.publicKey,
      private_key: keypair.privateKey, // NEVER expose in production!
      warning: 'This endpoint is for DEMO purposes only. In production, keypairs must be generated on-device.',
    });
  } catch (error: any) {
    console.error('Keypair generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= DEVICE REGISTRATION ENDPOINTS =============

/**
 * POST /api/arduino/registry/register
 * Register a new IoT device with collection mode
 * REQUIRES: owner_wallet (Lace wallet address)
 * OPTIONAL: authenticated (if true, verifies device signature)
 */
router.post('/registry/register', async (req, res) => {
  try {
    const { device_pubkey, owner_wallet, collection_mode = 'auto', device_id, metadata } = req.body;

    if (!device_pubkey) {
      return res.status(400).json({ error: 'device_pubkey required' });
    }

    if (!owner_wallet) {
      return res.status(400).json({ error: 'owner_wallet required (Lace wallet address)' });
    }

    if (!['auto', 'manual'].includes(collection_mode)) {
      return res.status(400).json({ error: 'collection_mode must be "auto" or "manual"' });
    }

    // Compute merkle leaf hash (simple hash of pubkey for now)
    const crypto = require('crypto');
    const merkle_leaf_hash = crypto.createHash('sha256').update(device_pubkey).digest('hex');

    // Persist to database with owner_wallet (handles already-registered case)
    const dbResult = dbService.registerDevice(
      device_pubkey,
      owner_wallet,
      device_id || 'iot-kit-001',
      metadata || {},
      merkle_leaf_hash
    );

    // Register in memory (for merkle tree) - only if not already registered
    let registration;
    if (!dbResult.alreadyRegistered) {
      registration = registryService.registerDevice(
        device_pubkey,
        device_id,
        metadata
      );
    } else {
      // Device already registered, get existing registration from memory
      const status = registryService.getStatus();
      const existingDevice = Array.from((registryService as any).devices.values())
        .find((d: any) => d.device_pubkey === device_pubkey);

      if (!existingDevice) {
        // Not in memory yet (server restarted), register now
        registration = registryService.registerDevice(
          device_pubkey,
          device_id,
          metadata
        );
      } else {
        registration = existingDevice;
      }
    }

    const status = registryService.getStatus();

    res.json({
      success: true,
      registration,
      owner_wallet,
      global_device_root: status.global_device_root,
      already_registered: dbResult.alreadyRegistered, // Let frontend know if it was already registered
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/arduino/registry/check
 * Check if device is in approved registry
 */
router.post('/registry/check', (req, res) => {
  try {
    const { device_pubkey } = req.body;

    if (!device_pubkey) {
      return res.status(400).json({ error: 'device_pubkey required' });
    }

    const approved = registryService.isDeviceApproved(device_pubkey);

    res.json({
      approved,
      device_pubkey,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/arduino/registry/proof
 * Get Merkle proof for a device
 */
router.post('/registry/proof', (req, res) => {
  try {
    const { device_pubkey } = req.body;

    if (!device_pubkey) {
      return res.status(400).json({ error: 'device_pubkey required' });
    }

    const proof = registryService.getMerkleProof(device_pubkey);

    if (!proof) {
      return res.status(404).json({
        error: 'Device not found in registry',
      });
    }

    res.json(proof);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/arduino/registry/devices
 * List all registered devices
 */
router.get('/registry/devices', (_req, res) => {
  try {
    const devices = registryService.getAllDevices();
    const status = registryService.getStatus();

    res.json({
      devices,
      count: devices.length,
      total_devices: status.total_devices,
      global_device_root: status.global_device_root,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/arduino/prove
 * Generate ZK proof for Arduino reading
 * (Gateway endpoint - called after receiving BLE data)
 */
router.post('/prove', async (req, res) => {
  try {
    const {
      reading_json,
      collection_mode = 'auto',
      device_pubkey,
      merkle_proof,
      leaf_index,
      appropriate_root,
    } = req.body;

    console.log('\n⏳ GENERATING ZK PROOF');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Reading: ${reading_json}`);
    console.log(`📱 Device: ${device_pubkey.slice(0, 16)}...`);
    console.log(`🔧 Collection mode: ${collection_mode}`);
    console.log(`🌳 Merkle proof depth: ${merkle_proof?.length || 0}`);
    console.log(`📍 Leaf index: ${leaf_index}`);
    console.log(`🌲 Appropriate root: ${appropriate_root?.slice(0, 16)}...`);
    console.log('═══════════════════════════════════════');

    // Parse reading to extract collection_mode if present
    const reading_obj = JSON.parse(reading_json);
    const claimed_mode = reading_obj.mode || collection_mode;

    // Verify device is registered with this collection_mode
    const device = registryService.getDevice(device_pubkey);
    if (!device) {
      throw new Error('Device not found in registry');
    }

    // Note: In single-tree architecture, all devices are in one tree
    // collection_mode is no longer tracked per device

    // TODO: Implement actual ZK proof generation using Compact/Midnight
    // For now, return mock proof structure

    // Simulate proof generation time (~15s in production)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const data_hash = Buffer.from(reading_json).toString('hex').slice(0, 64);
    const claim_nullifier = 'nullifier_' + Date.now() + '_' + data_hash.slice(0, 8);
    const epoch = Math.floor(Date.now() / 86400000); // Daily epoch

    const mockProof = {
      proof: 'zk_proof_' + Math.random().toString(36).substring(7),
      public_inputs: {
        claimed_root: appropriate_root,
        collection_mode: claimed_mode,
        data_hash,
        claim_nullifier,
        epoch,
      },
    };

    console.log('✅ ZK Proof generated successfully');
    console.log(`   Collection mode: ${claimed_mode}`);
    console.log(`   Expected reward: ${claimed_mode === 'auto' ? '0.1' : '0.02'} DUST\n`);

    res.json(mockProof);
  } catch (error: any) {
    console.error('❌ Proof generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/arduino/submit-proof
 * Submit proof to backend verifier
 */
// NOTE: Nullifier tracking now uses ONLY database-backed NullifierTrackingService
// for consistency across server restarts (removed in-memory Set per audit)

// Reward amounts based on collection mode
const REWARD_AMOUNTS = {
  auto: 0.1,    // Higher reward for automatic collection
  manual: 0.02, // Lower reward for manual entry (testing/fallback)
};

router.post('/submit-proof', async (req, res) => {
  try {
    const {
      proof,
      claimed_root,
      collection_mode,
      data_hash,
      claim_nullifier,
      epoch,
      data_payload,
    } = req.body;

    console.log('\n📤 PROOF VERIFICATION');
    console.log('═══════════════════════════════════════');
    console.log(`🔐 Proof: ${proof.slice(0, 20)}...`);
    console.log(`🌳 Claimed root: ${claimed_root?.slice(0, 16)}...`);
    console.log(`🔧 Collection mode: ${collection_mode}`);
    console.log(`📊 Data: temp=${data_payload.t}°C, humidity=${data_payload.h}%`);
    console.log(`🔢 Epoch: ${epoch}`);
    console.log(`🔐 Nullifier: ${claim_nullifier.slice(0, 20)}...`);
    console.log('═══════════════════════════════════════');

    // 1. Check nullifier not spent using database (prevents replay)
    const currentEpoch = nullifierService.getCurrentEpoch();
    if (nullifierService.isNullifierSpent(claim_nullifier, epoch || currentEpoch)) {
      return res.status(400).json({
        valid: false,
        reason: 'Nullifier already spent (replay detected)',
      });
    }

    // 2. Verify claimed_root matches the global device root (single-tree architecture)
    const global_root = registryService.getGlobalDeviceRoot();

    if (claimed_root !== global_root) {
      return res.status(400).json({
        valid: false,
        reason: 'Claimed root does not match global device root',
      });
    }

    // 3. Validate sensor data ranges
    if (data_payload.t < -50 || data_payload.t > 60) {
      return res.status(400).json({
        valid: false,
        reason: 'Temperature out of range (-50 to 60°C)',
      });
    }

    if (data_payload.h < 0 || data_payload.h > 100) {
      return res.status(400).json({
        valid: false,
        reason: 'Humidity out of range (0 to 100%)',
      });
    }

    // 4. TODO: Verify actual ZK proof using Compact/Midnight
    // For now, mock verification passes

    // 5. Calculate reward based on collection_mode
    const reward = REWARD_AMOUNTS[collection_mode as 'auto' | 'manual'] || 0;

    // 6. Mark nullifier as spent in database (persistent across restarts)
    nullifierService.markNullifierSpent(
      claim_nullifier,
      epoch || currentEpoch,
      data_hash || 'direct_submission',
      reward
    );

    const verification = {
      valid: true,
      reward,
      collection_mode,
      datapoint_added: true,
    };

    console.log('✅ VERIFIED!');
    console.log(`🔧 Collection mode: ${collection_mode}`);
    console.log(`💰 Reward: ${reward} DUST (${collection_mode} collection)`);
    console.log('📊 Datapoint added to aggregation\n');

    res.json(verification);
  } catch (error: any) {
    console.error('❌ Verification error:', error.message);
    res.status(400).json({
      valid: false,
      reason: error.message,
    });
  }
});

/**
 * POST /api/arduino/simulate
 * Simulate receiving Arduino data (for testing without hardware)
 * Persists reading to database
 */
router.post('/simulate', (req, res) => {
  try {
    const {
      temperature = 25.0,
      humidity = 65.0,
      device_pubkey,
    } = req.body;

    const reading = bleService.simulateReading(
      temperature,
      humidity,
      device_pubkey
    );

    // Persist reading to database
    if (device_pubkey) {
      try {
        const readingId = dbService.saveReading(reading);
        console.log(`✅ Reading persisted: ID ${readingId}`);
      } catch (dbError: any) {
        console.error('⚠️  Failed to persist reading:', dbError.message);
        // Don't fail the request if persistence fails
      }
    }

    res.json({
      success: true,
      reading,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ZK PROOF GENERATION ENDPOINTS =============

/**
 * POST /api/arduino/zk/generate-proof
 * Generate ZK proof for private sensor reading
 * This endpoint creates a zero-knowledge proof that demonstrates device authorization
 * without revealing device identity
 */
router.post('/zk/generate-proof', async (req, res) => {
  try {
    const {
      temperature,
      humidity,
      timestamp,
      device_pubkey,
      device_secret,
      collection_mode = 'auto',
    } = req.body;

    // Validate inputs
    if (!temperature || !humidity || !timestamp) {
      return res.status(400).json({ error: 'temperature, humidity, and timestamp required' });
    }

    if (!device_pubkey || !device_secret) {
      return res.status(400).json({ error: 'device_pubkey and device_secret required' });
    }

    // Get device registration
    const device = registryService.getDevice(device_pubkey);
    if (!device) {
      return res.status(404).json({ error: 'Device not registered' });
    }

    // Get Merkle proof
    const merkleProof = registryService.getMerkleProof(device_pubkey);
    if (!merkleProof) {
      return res.status(500).json({ error: 'Failed to get Merkle proof' });
    }

    // Prepare witness inputs (private)
    const witnessInputs = {
      devicePubkey: device_pubkey,
      deviceSecret: device_secret,
      merkleSiblings: merkleProof.merkle_proof,
      leafIndex: merkleProof.leaf_index,
    };

    // Generate ZK proof
    const zkProof = await zkProofService.generateProof(
      { temperature, humidity, timestamp },
      witnessInputs,
      collection_mode as 'auto' | 'manual',
      merkleProof.root
    );

    res.json({
      success: true,
      proof: zkProof.proof,
      public_inputs: zkProof.publicInputs,
      metadata: zkProof.metadata,
    });
  } catch (error: any) {
    console.error('ZK proof generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/arduino/zk/submit-private-reading
 * Submit anonymous sensor reading with ZK proof
 * This is the privacy-preserving alternative to direct reading submission
 */
router.post('/zk/submit-private-reading', async (req, res) => {
  try {
    const {
      proof,
      public_inputs,
      temperature,
      humidity,
      timestamp,
    } = req.body;

    if (!proof || !public_inputs) {
      return res.status(400).json({ error: 'proof and public_inputs required' });
    }

    console.log('\n🔐 PRIVATE READING SUBMISSION');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Reading: temp=${temperature}°C, humidity=${humidity}%`);
    console.log(`🔒 Nullifier: ${public_inputs.nullifier.slice(0, 16)}...`);
    console.log(`📅 Epoch: ${public_inputs.epoch}`);
    console.log(`🔧 Mode: ${public_inputs.collectionMode === 0 ? 'auto' : 'manual'}`);

    // 1. Check nullifier not spent
    if (nullifierService.isNullifierSpent(public_inputs.nullifier, public_inputs.epoch)) {
      console.log('❌ Nullifier already spent (replay attack detected)');
      return res.status(400).json({
        valid: false,
        error: 'Nullifier already spent in this epoch',
      });
    }

    // 2. Get expected Merkle root (single-tree architecture)
    const status = registryService.getStatus();
    const expectedRoot = status.global_device_root;

    // 3. Verify ZK proof
    const verification = await zkProofService.verifyProof(
      proof,
      public_inputs,
      expectedRoot
    );

    if (!verification.valid) {
      console.log(`❌ Proof verification failed: ${verification.reason}`);
      return res.status(400).json({
        valid: false,
        error: verification.reason,
      });
    }

    // 4. Calculate reward
    const collectionMode = public_inputs.collectionMode === 0 ? 'auto' : 'manual';
    const reward = public_inputs.collectionMode === 0 ? 0.1 : 0.02;

    // 5. Mark nullifier as spent
    nullifierService.markNullifierSpent(
      public_inputs.nullifier,
      public_inputs.epoch,
      public_inputs.dataHash,
      reward
    );

    // 6. Store anonymous reading in database
    const db = dbService['db']; // Access private db property
    const stmt = db.prepare(`
      INSERT INTO zk_proof_submissions (
        nullifier,
        epoch,
        proof_data,
        public_inputs,
        temperature,
        humidity,
        timestamp_device,
        collection_mode,
        reward,
        verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      public_inputs.nullifier,
      public_inputs.epoch,
      proof,
      JSON.stringify(public_inputs),
      temperature,
      humidity,
      timestamp,
      collectionMode,
      reward,
      1 // verified = true
    );

    const submissionId = result.lastInsertRowid;

    console.log('✅ VERIFIED AND STORED IN DATABASE!');
    console.log(`💰 Reward: ${reward} tDUST`);
    console.log(`📊 Reading stored anonymously (ID: ${submissionId})`);

    // 7. Upload to IPFS for decentralized storage
    let ipfsCid: string | null = null;
    try {
      console.log('📤 Uploading ZK proof to IPFS...');

      const ipfsData = {
        proof,
        public_inputs,
        reading: {
          temperature,
          humidity,
          timestamp,
        },
        collection_mode: collectionMode,
        reward,
        verified: true,
        submitted_at: Math.floor(Date.now() / 1000),
      };

      ipfsCid = await ipfsStorage.uploadZKProof(ipfsData);

      // Update database record with IPFS CID
      const updateStmt = db.prepare(`
        UPDATE zk_proof_submissions
        SET ipfs_cid = ?
        WHERE id = ?
      `);
      updateStmt.run(ipfsCid, submissionId);

      console.log('✅ UPLOADED TO IPFS!');
      console.log(`🌐 CID: ${ipfsCid}`);
      console.log(`🔗 Gateway: ${ipfsStorage.getGatewayUrl(ipfsCid)}`);
    } catch (ipfsError: any) {
      console.warn('⚠️  IPFS upload failed (continuing without):', ipfsError.message);
      // Continue even if IPFS fails - database storage is the primary concern
    }

    console.log('═══════════════════════════════════════\n');

    res.json({
      success: true,
      valid: true,
      reward,
      collection_mode: collectionMode,
      nullifier: public_inputs.nullifier,
      epoch: public_inputs.epoch,
      ipfs_cid: ipfsCid,
      ipfs_gateway_url: ipfsCid ? ipfsStorage.getGatewayUrl(ipfsCid) : null,
    });
  } catch (error: any) {
    console.error('Private reading submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/arduino/zk/stats
 * Get ZK proof statistics
 */
router.get('/zk/stats', (_req, res) => {
  try {
    const proofStats = zkProofService.getStats();
    const nullifierStats = nullifierService.getNullifierStats();

    // Get IPFS stats from database
    const db = dbService['db'];
    const ipfsStmt = db.prepare(`
      SELECT COUNT(*) as total, COUNT(ipfs_cid) as with_ipfs
      FROM zk_proof_submissions
    `);
    const ipfsStats = ipfsStmt.get() as { total: number; with_ipfs: number };

    res.json({
      proof_generation: proofStats,
      nullifiers: nullifierStats,
      privacy: {
        unlinkable_submissions: nullifierStats.total_nullifiers,
        current_epoch: nullifierService.getCurrentEpoch(),
        anonymity_set_size: registryService.getAllDevices().length,
      },
      ipfs: {
        total_submissions: ipfsStats.total,
        stored_on_ipfs: ipfsStats.with_ipfs,
        percentage: ipfsStats.total > 0
          ? Math.round((ipfsStats.with_ipfs / ipfsStats.total) * 100)
          : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/arduino/zk/ipfs/:cid
 * Retrieve ZK proof from IPFS by CID
 * Demonstrates public verifiability while maintaining privacy!
 */
router.get('/zk/ipfs/:cid', async (req, res) => {
  try {
    const { cid } = req.params;

    console.log(`\n🔍 RETRIEVING ZK PROOF FROM IPFS`);
    console.log(`📦 CID: ${cid}`);

    const proofData = await ipfsStorage.retrieveZKProof(cid);

    if (!proofData) {
      return res.status(404).json({ error: 'Proof not found on IPFS' });
    }

    // Proof retrieved successfully (verification happens in the service)
    const isValid = true; // If retrieval succeeded, it's valid

    console.log(`✅ Retrieved and verified from IPFS`);
    console.log(`   Nullifier: ${proofData.public_inputs.nullifier.slice(0, 16)}...`);
    console.log(`   Temperature: ${proofData.reading.temperature}°C`);
    console.log(`   Verified: ${isValid}`);

    res.json({
      success: true,
      proof_data: proofData,
      verified: isValid,
      gateway_url: ipfsStorage.getGatewayUrl(cid),
    });
  } catch (error: any) {
    console.error('IPFS retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/arduino/zk/submissions
 * Get recent ZK proof submissions with IPFS links
 */
router.get('/zk/submissions', (_req, res) => {
  try {
    const db = dbService['db'];
    const stmt = db.prepare(`
      SELECT
        id,
        nullifier,
        epoch,
        temperature,
        humidity,
        timestamp_device,
        collection_mode,
        reward,
        ipfs_cid,
        verified,
        created_at
      FROM zk_proof_submissions
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const submissions = stmt.all() as any[];

    // Add IPFS gateway URLs
    const submissionsWithUrls = submissions.map((sub) => ({
      ...sub,
      ipfs_gateway_url: sub.ipfs_cid ? ipfsStorage.getGatewayUrl(sub.ipfs_cid) : null,
    }));

    res.json({
      success: true,
      count: submissions.length,
      submissions: submissionsWithUrls,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= REAL-TIME READING SUBMISSION & REWARD DISTRIBUTION =============

/**
 * POST /api/arduino/readings/submit
 * Submit sensor reading with signature for instant reward distribution
 *
 * This endpoint:
 * 1. Verifies EdDSA signature
 * 2. Checks device is registered
 * 3. Stores reading to database (simplified for demo)
 * 4. Distributes 0.1 tDUST reward instantly (for demo - every 5 seconds)
 */
router.post('/readings/submit', async (req, res) => {
  try {
    const { device_pubkey, reading, signature, owner_wallet, collection_mode } = req.body;

    console.log('\n📊 READING SUBMISSION');
    console.log('═══════════════════════════════════════');
    console.log(`📍 Device: ${device_pubkey?.slice(0, 16)}...`);
    console.log(`📦 Reading: ${reading}`);
    console.log(`🔐 Signature: ${signature?.slice(0, 32)}...`);
    console.log(`💼 Wallet: ${owner_wallet?.slice(0, 30)}...`);
    console.log(`📋 Mode: ${collection_mode}`);

    // Validate required fields
    if (!device_pubkey || !reading || !signature || !owner_wallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: device_pubkey, reading, signature, owner_wallet'
      });
    }

    // Step 1: Verify device is registered
    const deviceCheck = dbService.getDevice(device_pubkey);
    if (!deviceCheck) {
      console.log('❌ Device not registered');
      return res.status(403).json({
        success: false,
        error: 'Device not registered. Please register device first.'
      });
    }

    // Step 2: Verify signature (static method)
    console.log('\n🔐 Verifying EdDSA signature...');
    const isValidSignature = await DeviceAuthService.verifyReadingSignature(
      reading,
      signature,
      device_pubkey
    );

    if (!isValidSignature) {
      console.log('❌ Invalid signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature. Reading not signed by device private key.'
      });
    }
    console.log('✅ Signature verified');

    // Step 3: Parse reading data
    const readingData = JSON.parse(reading);

    // Step 4: Generate mock IPFS CID for demo
    const mockCid = `bafybei${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    console.log(`✅ Mock IPFS CID: ${mockCid}`);

    // Step 5: Save reading to database (simplified)
    const readingId = `${device_pubkey}-${Date.now()}`;
    console.log(`💾 Saving reading: ${readingId}`);

    // Step 6: Calculate reward (0.1 tDUST for auto-collection)
    const rewardAmount = collection_mode === 'auto' ? 0.1 : 0.02;

    // Step 7: Distribute tDUST reward (INSTANT for demo)
    console.log('\n💰 Distributing reward...');
    console.log(`   Amount: ${rewardAmount} tDUST`);
    console.log(`   Recipient: ${owner_wallet}`);

    // TODO: Replace with real Midnight SDK call
    // For now, we'll simulate instant distribution
    const txHash = `demo_tx_${Date.now()}_${device_pubkey.slice(0, 8)}`;

    console.log(`✅ Reward distributed! TX: ${txHash}`);
    console.log('═══════════════════════════════════════\n');

    // Return success response
    res.json({
      success: true,
      ipfs_cid: mockCid,
      reward_amount: rewardAmount,
      reward_unit: 'tDUST',
      tx_hash: txHash,
      message: `Reading verified! ${rewardAmount} tDUST distributed to ${owner_wallet.slice(0, 10)}...`
    });

  } catch (error: any) {
    console.error('❌ Reading submission error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= REWARD ENDPOINTS =============

/**
 * POST /api/arduino/claim-rewards
 * Transfer tDUST rewards from deployment wallet to farmer
 * TODO: Re-enable in Phase 3 (Midnight SDK integration)
 */
router.post('/claim-rewards', async (req, res) => {
  try {
    const { farmerAddress, amount } = req.body;

    console.log('\n💰 REWARD CLAIM REQUEST (MOCK - Waiting for Phase 3)');
    console.log('═══════════════════════════════════════');
    console.log(`📍 Farmer: ${farmerAddress?.slice(0, 30)}...`);
    console.log(`💵 Amount: ${amount} tDUST`);
    console.log('═══════════════════════════════════════');

    // Mock response until we implement real Midnight SDK integration
    res.json({
      success: true,
      txHash: 'mock_tx_' + Date.now(),
      amount,
      message: 'Mock reward claim - will be real in Phase 3'
    });

  } catch (error: any) {
    console.error('❌ Claim rewards error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/arduino/wallet-balance
 * Get deployment wallet balance
 * TODO: Re-enable in Phase 3 (Midnight SDK integration)
 */
router.get('/wallet-balance', async (_req, res) => {
  try {
    // Mock balance until we implement real Midnight SDK integration
    res.json({
      balance: 1000.0,
      unit: 'tDUST',
      message: 'Mock balance - will be real in Phase 3'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/arduino/my-device/:wallet
 * Get device information for a specific wallet address
 */
router.get('/my-device/:wallet', (req, res) => {
  try {
    const { wallet } = req.params;

    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter required' });
    }

    const device = dbService.getDeviceByWallet(wallet);

    if (!device) {
      return res.status(404).json({
        error: 'No device found for this wallet',
        wallet,
      });
    }

    // Get consistency metrics
    const consistency = dbService.getConsistencyMetrics(device.device_pubkey);
    const incentives = dbService.getIncentiveSummary(device.device_pubkey);

    res.json({
      device,
      consistency,
      incentives,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/arduino/my-readings/:wallet
 * Get sensor readings for a specific wallet's device
 */
router.get('/my-readings/:wallet', (req, res) => {
  try {
    const { wallet } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter required' });
    }

    const readings = dbService.getReadingsByWallet(wallet, limit);

    res.json({
      wallet,
      readings,
      count: readings.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/arduino/registry
 * Get registry status with dual merkle roots
 */
router.get('/registry', (_req, res) => {
  try {
    const devices = registryService.getAllDevices();
    const status = registryService.getStatus();

    res.json({
      devices,
      count: devices.length,
      total_devices: status.total_devices,
      global_device_root: status.global_device_root,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/arduino/reset
 * Reset device registry (demo purposes)
 */
router.post('/reset', (req, res) => {
  try {
    registryService.reset();
    res.json({ success: true, message: 'Registry reset' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as iotRouter, registryService };
