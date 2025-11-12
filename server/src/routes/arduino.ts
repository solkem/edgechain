/**
 * Arduino Integration Routes
 *
 * Handles device registration, BLE data, and ZK proof generation
 */

import { Router } from 'express';
import { DeviceRegistryService } from '../services/deviceRegistry';
import { BLEReceiverService } from '../services/bleReceiver';
import { DatabasePersistenceService } from '../services/databasePersistence';
import { SignedReading } from '../types/arduino';
// TODO: Re-enable in Phase 3 (Midnight SDK integration)
// import { deploymentWalletService } from '../services/deploymentWallet';

const router = Router();
const registryService = new DeviceRegistryService();
const bleService = new BLEReceiverService();
const dbService = new DatabasePersistenceService();

/**
 * POST /api/arduino/registry/register
 * Register a new IoT device with collection mode
 * REQUIRES: owner_wallet (Lace wallet address)
 */
router.post('/registry/register', (req, res) => {
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

    // Register in memory (for merkle tree)
    const registration = registryService.registerDevice(
      device_pubkey,
      collection_mode,
      device_id,
      metadata
    );

    // Compute merkle leaf hash (simple hash of pubkey for now)
    const crypto = require('crypto');
    const merkle_leaf_hash = crypto.createHash('sha256').update(device_pubkey).digest('hex');

    // Persist to database with owner_wallet
    dbService.registerDevice(
      device_pubkey,
      owner_wallet,
      collection_mode,
      device_id || 'iot-kit-001',
      metadata || {},
      merkle_leaf_hash
    );

    const status = registryService.getStatus();

    res.json({
      success: true,
      registration,
      owner_wallet,
      global_auto_collection_root: status.global_auto_collection_root,
      global_manual_entry_root: status.global_manual_entry_root,
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
      auto_devices: status.auto_devices,
      manual_devices: status.manual_devices,
      global_auto_collection_root: status.global_auto_collection_root,
      global_manual_entry_root: status.global_manual_entry_root,
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

    if (device.collection_mode !== claimed_mode) {
      throw new Error(`Collection mode mismatch: device=${device.collection_mode}, claimed=${claimed_mode}`);
    }

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
// Nullifier tracking (in-memory for demo; use database in production)
const spentNullifiers = new Set<string>();

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

    // 1. Check nullifier not spent (prevents replay)
    if (spentNullifiers.has(claim_nullifier)) {
      return res.status(400).json({
        valid: false,
        reason: 'Nullifier already spent (replay detected)',
      });
    }

    // 2. Verify claimed_root matches collection_mode
    const auto_root = registryService.getGlobalAutoCollectionRoot();
    const manual_root = registryService.getGlobalManualEntryRoot();

    if (collection_mode === 'auto' && claimed_root !== auto_root) {
      return res.status(400).json({
        valid: false,
        reason: 'Claimed auto-collection but root mismatch',
      });
    }

    if (collection_mode === 'manual' && claimed_root !== manual_root) {
      return res.status(400).json({
        valid: false,
        reason: 'Claimed manual-entry but root mismatch',
      });
    }

    if (claimed_root !== auto_root && claimed_root !== manual_root) {
      return res.status(400).json({
        valid: false,
        reason: 'Claimed root not in approved registry',
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

    // 5. Mark nullifier as spent
    spentNullifiers.add(claim_nullifier);

    // 6. Calculate reward based on collection_mode
    const reward = REWARD_AMOUNTS[collection_mode as 'auto' | 'manual'] || 0;

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
      dual_roots: {
        auto_root: status.global_auto_collection_root,
        manual_root: status.global_manual_entry_root,
      },
      auto_devices: status.auto_devices,
      manual_devices: status.manual_devices,
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

export { router as arduinoRouter, registryService };
