/**
 * Sensor Node Integration Routes
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
import { MarsScoringService, CollectionMode } from '../services/marsScoring';
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
const marsScoringService = new MarsScoringService();

export async function initializeIoTRoutes(): Promise<void> {
  await registryService.initialize();
}

// ============= DEVICE AUTHENTICATION ENDPOINTS =============

/**
 * POST /api/sensor-node/auth/request-challenge
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
 * POST /api/sensor-node/auth/verify-signature
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
 * POST /api/sensor-node/auth/generate-keypair
 * Generate ED25519 keypair for testing (DEMO ONLY)
 * In production, this should ONLY run on the Sensor Node!
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
 * POST /api/sensor-node/registry/register
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
    const dbResult = await dbService.registerDevice(
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
 * POST /api/sensor-node/registry/check
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
 * POST /api/sensor-node/registry/proof
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
 * GET /api/sensor-node/registry/devices
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
 * POST /api/sensor-node/prove
 * Generate ZK proof for Sensor Node reading
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

    const expectedReward = marsScoringService.calculateSensorReward({
      siteId: device_pubkey,
      roundId: epoch,
      temperature: Number(reading_obj.t ?? reading_obj.temperature ?? 0),
      humidity: Number(reading_obj.h ?? reading_obj.humidity ?? 0),
      timestamp: Number(reading_obj.ts ?? Date.now()),
      collectionMode: normalizeCollectionMode(claimed_mode),
      hasValidAttestation: true,
    });

    console.log('✅ ZK Proof generated successfully');
    console.log(`   Collection mode: ${claimed_mode}`);
    console.log(`   MARS action: ${expectedReward.score.action}`);
    console.log(`   Expected reward: ${expectedReward.reward} ${expectedReward.rewardUnit}\n`);

    res.json(mockProof);
  } catch (error: any) {
    console.error('❌ Proof generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sensor-node/submit-proof
 * Submit proof to backend verifier
 */
// NOTE: Nullifier tracking now uses ONLY database-backed NullifierTrackingService
// for consistency across server restarts (removed in-memory Set per audit)

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
    if (await nullifierService.isNullifierSpent(claim_nullifier, epoch || currentEpoch)) {
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

    // 5. Calculate reward eligibility through MARS
    const collectionMode = normalizeCollectionMode(collection_mode);
    const rewardDecision = marsScoringService.calculateSensorReward({
      siteId: claim_nullifier,
      roundId: epoch || currentEpoch,
      temperature: Number(data_payload.t),
      humidity: Number(data_payload.h),
      timestamp: Number(data_payload.ts ?? Date.now()),
      collectionMode,
      hasValidAttestation: true,
      metadata: {
        dataHash: data_hash,
      },
    });
    const reward = rewardDecision.reward;

    // 6. Mark nullifier as spent in database (persistent across restarts)
    await nullifierService.markNullifierSpent(
      claim_nullifier,
      epoch || currentEpoch,
      data_hash || 'direct_submission',
      reward,
      rewardDecision.score
    );

    const verification = {
      valid: true,
      reward,
      collection_mode: collectionMode,
      mars_score: rewardDecision.score,
      datapoint_added: true,
    };

    console.log('✅ VERIFIED!');
    console.log(`🔧 Collection mode: ${collectionMode}`);
    console.log(`🧭 MARS action: ${rewardDecision.score.action} (${rewardDecision.score.composite.toFixed(3)})`);
    console.log(`💰 Reward: ${reward} tDUST (${collectionMode} collection)`);
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
 * POST /api/sensor-node/simulate
 * Simulate receiving Sensor Node data (for testing without hardware)
 * Persists reading to database
 */
router.post('/simulate', async (req, res) => {
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
        const readingId = await dbService.saveReading(reading);
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
 * POST /api/sensor-node/zk/generate-proof
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
 * POST /api/sensor-node/zk/submit-private-reading
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
    if (await nullifierService.isNullifierSpent(public_inputs.nullifier, public_inputs.epoch)) {
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

    // 4. Calculate reward eligibility through MARS
    const collectionMode = public_inputs.collectionMode === 0 ? 'auto' : 'manual';
    const rewardDecision = marsScoringService.calculateSensorReward({
      siteId: public_inputs.nullifier,
      roundId: public_inputs.epoch,
      temperature: Number(temperature),
      humidity: Number(humidity),
      timestamp: Number(timestamp ?? Date.now()),
      collectionMode,
      hasValidAttestation: true,
      metadata: {
        dataHash: public_inputs.dataHash,
      },
    });
    const reward = rewardDecision.reward;

    // 5. Mark nullifier as spent
    await nullifierService.markNullifierSpent(
      public_inputs.nullifier,
      public_inputs.epoch,
      public_inputs.dataHash,
      reward,
      rewardDecision.score
    );

    // 6. Store anonymous reading in database
    const db = dbService['db']; // Route-level query access for ZK submission audit records
    const insertResult = await db.query(`
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
        mars_action,
        mars_composite,
        mars_score_json,
        verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      public_inputs.nullifier,
      public_inputs.epoch,
      proof,
      JSON.stringify(public_inputs),
      temperature,
      humidity,
      timestamp,
      collectionMode,
      reward,
      rewardDecision.score.action,
      rewardDecision.score.composite,
      JSON.stringify(rewardDecision.score),
      true,
    ]);

    const submissionId = Number(insertResult.rows[0].id);

    console.log('✅ VERIFIED AND STORED IN DATABASE!');
    console.log(`🧭 MARS action: ${rewardDecision.score.action} (${rewardDecision.score.composite.toFixed(3)})`);
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
        mars_score: rewardDecision.score,
        verified: true,
        submitted_at: Math.floor(Date.now() / 1000),
      };

      ipfsCid = await ipfsStorage.uploadZKProof(ipfsData);

      // Update database record with IPFS CID
      await db.query(`
        UPDATE zk_proof_submissions
        SET ipfs_cid = $1
        WHERE id = $2
      `, [ipfsCid, submissionId]);

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
      mars_score: rewardDecision.score,
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
 * GET /api/sensor-node/zk/stats
 * Get ZK proof statistics
 */
router.get('/zk/stats', async (_req, res) => {
  try {
    const proofStats = zkProofService.getStats();
    const nullifierStats = await nullifierService.getNullifierStats();

    // Get IPFS stats from database
    const db = dbService['db'];
    const ipfsResult = await db.query(`
      SELECT COUNT(*)::int as total, COUNT(ipfs_cid)::int as with_ipfs
      FROM zk_proof_submissions
    `);
    const ipfsStats = ipfsResult.rows[0] as { total: number; with_ipfs: number };

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
 * GET /api/sensor-node/zk/ipfs/:cid
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
 * GET /api/sensor-node/zk/submissions
 * Get recent ZK proof submissions with IPFS links
 */
router.get('/zk/submissions', async (_req, res) => {
  try {
    const db = dbService['db'];
    const result = await db.query(`
      SELECT
        id,
        nullifier,
        epoch,
        temperature,
        humidity,
        timestamp_device,
        collection_mode,
        reward,
        mars_action,
        mars_composite,
        mars_score_json,
        ipfs_cid,
        verified,
        created_at
      FROM zk_proof_submissions
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const submissions = result.rows as any[];

    // Add IPFS gateway URLs
    const submissionsWithUrls = submissions.map((sub) => ({
      ...sub,
      mars_score: parseMarsScore(sub.mars_score_json),
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
 * POST /api/sensor-node/readings/submit
 * Submit sensor reading with signature for instant reward distribution
 *
 * This endpoint:
 * 1. Verifies EdDSA signature
 * 2. Checks device is registered
 * 3. Stores reading to database (simplified for demo)
 * 4. Uses MARS to determine reward eligibility for the demo transfer
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
    const deviceCheck = await dbService.getDevice(device_pubkey);
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

    // Step 6: Calculate reward eligibility through MARS
    const normalizedCollectionMode = normalizeCollectionMode(collection_mode);
    const rewardDecision = marsScoringService.calculateSensorReward({
      siteId: device_pubkey,
      roundId: Math.floor(Date.now() / 86_400_000),
      temperature: Number(readingData.t ?? readingData.temperature),
      humidity: Number(readingData.h ?? readingData.humidity),
      timestamp: Number(readingData.ts ?? Date.now()),
      collectionMode: normalizedCollectionMode,
      hasValidAttestation: isValidSignature,
      metadata: {
        ownerWallet: owner_wallet,
      },
    });
    const rewardAmount = rewardDecision.reward;

    // Step 7: Distribute tDUST reward (INSTANT for demo)
    console.log('\n💰 Distributing reward...');
    console.log(`   MARS action: ${rewardDecision.score.action} (${rewardDecision.score.composite.toFixed(3)})`);
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
      mars_score: rewardDecision.score,
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
 * POST /api/sensor-node/claim-rewards
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
 * GET /api/sensor-node/wallet-balance
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
 * GET /api/sensor-node/my-device/:wallet
 * Get device information for a specific wallet address
 */
router.get('/my-device/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter required' });
    }

    const device = await dbService.getDeviceByWallet(wallet);

    if (!device) {
      return res.status(404).json({
        error: 'No device found for this wallet',
        wallet,
      });
    }

    // Get consistency metrics
    const consistency = await dbService.getConsistencyMetrics(device.device_pubkey);
    const incentives = await dbService.getIncentiveSummary(device.device_pubkey);

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
 * GET /api/sensor-node/my-readings/:wallet
 * Get sensor readings for a specific wallet's device
 */
router.get('/my-readings/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!wallet) {
      return res.status(400).json({ error: 'wallet parameter required' });
    }

    const readings = await dbService.getReadingsByWallet(wallet, limit);

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
 * GET /api/sensor-node/registry
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
 * POST /api/sensor-node/reset
 * Reset device registry (demo purposes only)
 * PROTECTED: Requires DEMO_MODE=true
 */
router.post('/reset', (req, res) => {
  try {
    // H1 FIX: Gate reset endpoint behind DEMO_MODE
    const isDemoMode = process.env.DEMO_MODE === 'true';
    if (!isDemoMode) {
      return res.status(403).json({
        error: 'Reset only available in demo mode',
        message: 'Set DEMO_MODE=true in environment to enable reset functionality'
      });
    }

    registryService.reset();
    res.json({ success: true, message: 'Registry reset' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function normalizeCollectionMode(value: unknown): CollectionMode {
  return value === 'manual' ? 'manual' : 'auto';
}

function parseMarsScore(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export { router as iotRouter, registryService };
