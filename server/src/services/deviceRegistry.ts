/**
 * Device Registry Service with Incentive Layer
 *
 * Manages approved IoT devices with DUAL Merkle trees:
 * - Auto-collection root (higher reward: 0.1 DUST)
 * - Manual-entry root (lower reward: 0.02 DUST)
 *
 * Key Innovation: Leaf = H(device_pubkey || collection_mode)
 * This cryptographically binds device to its collection method
 */

import * as crypto from 'crypto';
import { deviceDB } from '../database';

export interface ApprovedDevice {
  device_pubkey: string;
  collection_mode: 'auto' | 'manual';
  registration_epoch: number;
  expiry_epoch: number;
  device_id?: string;
  metadata?: any;
}

export interface MerkleProof {
  merkle_proof: string[];
  leaf_index: number;
  collection_mode: 'auto' | 'manual';
  appropriate_root: string;
}

export class DeviceRegistryService {
  private devices: Map<string, ApprovedDevice> = new Map();
  private globalAutoCollectionRoot: string = '';
  private globalManualEntryRoot: string = '';

  constructor() {
    // Load devices from database on startup
    this.loadDevicesFromDatabase();
    // Initialize roots based on loaded devices
    this.rebuildGlobalRoots();
  }

  /**
   * Load devices from database into memory
   */
  private loadDevicesFromDatabase(): void {
    try {
      const dbDevices = deviceDB.getAll() as any[];

      for (const dbDevice of dbDevices) {
        const device: ApprovedDevice = {
          device_pubkey: dbDevice.device_pubkey,
          collection_mode: dbDevice.collection_mode as 'auto' | 'manual',
          registration_epoch: dbDevice.registration_epoch,
          expiry_epoch: dbDevice.expiry_epoch,
          device_id: dbDevice.device_id,
          metadata: dbDevice.metadata ? JSON.parse(dbDevice.metadata) : undefined,
        };

        this.devices.set(device.device_pubkey, device);
      }

      console.log(`📥 Loaded ${dbDevices.length} device(s) from database`);
    } catch (error) {
      console.error('❌ Failed to load devices from database:', error);
    }
  }

  /**
   * Register a new device with collection mode
   */
  registerDevice(
    device_pubkey: string,
    collection_mode: 'auto' | 'manual' = 'auto',
    device_id?: string,
    metadata?: any
  ): ApprovedDevice {
    if (this.devices.has(device_pubkey)) {
      throw new Error('Device already registered');
    }

    const current_epoch = this.getCurrentEpoch();
    const registration: ApprovedDevice = {
      device_pubkey,
      collection_mode,
      registration_epoch: current_epoch,
      expiry_epoch: current_epoch + 365, // Valid for 1 year
      device_id,
      metadata,
    };

    this.devices.set(device_pubkey, registration);
    this.rebuildGlobalRoots();

    // Note: Database persistence is handled by the route layer (arduino.ts)
    // which calls dbService.registerDevice() before this method.
    // This avoids duplicate database inserts.

    console.log(`✅ Device registered: ${device_pubkey.slice(0, 16)}...`);
    console.log(`   Collection mode: ${collection_mode}`);
    console.log(`   Auto root: ${this.globalAutoCollectionRoot.slice(0, 16)}...`);
    console.log(`   Manual root: ${this.globalManualEntryRoot.slice(0, 16)}...`);

    return registration;
  }

  /**
   * Check if device is approved
   */
  isDeviceApproved(device_pubkey: string): boolean {
    const device = this.devices.get(device_pubkey);
    if (!device) return false;

    // Check if not expired
    const current_epoch = this.getCurrentEpoch();
    return current_epoch <= device.expiry_epoch;
  }

  /**
   * Get device by public key
   */
  getDevice(device_pubkey: string): ApprovedDevice | undefined {
    return this.devices.get(device_pubkey);
  }

  /**
   * Get Merkle proof for a device
   * CRITICAL: Returns proof for the device's collection_mode tree
   */
  getMerkleProof(device_pubkey: string): MerkleProof {
    const device = this.devices.get(device_pubkey);
    if (!device) {
      throw new Error(`Device ${device_pubkey} not in registry`);
    }

    const collection_mode = device.collection_mode;

    // Get all devices with same collection mode
    const devicesForMode = Array.from(this.devices.values())
      .filter(d => d.collection_mode === collection_mode);

    const leaf_index = devicesForMode.findIndex(d => d.device_pubkey === device_pubkey);
    if (leaf_index === -1) {
      throw new Error(`Device not found in ${collection_mode} list`);
    }

    // Build leaves with collection_mode binding: H(pubkey || mode)
    const leaves = devicesForMode.map(d =>
      this.hashLeaf(d.device_pubkey, d.collection_mode)
    );

    const merkle_proof = this.computeMerkleProof(leaves, leaf_index);
    const appropriate_root = collection_mode === 'auto'
      ? this.globalAutoCollectionRoot
      : this.globalManualEntryRoot;

    return {
      merkle_proof,
      leaf_index,
      collection_mode,
      appropriate_root,
    };
  }

  /**
   * Get global auto-collection root
   */
  getGlobalAutoCollectionRoot(): string {
    return this.globalAutoCollectionRoot;
  }

  /**
   * Get global manual-entry root
   */
  getGlobalManualEntryRoot(): string {
    return this.globalManualEntryRoot;
  }

  /**
   * Get all registered devices
   */
  getAllDevices(): ApprovedDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get registry status with dual roots
   */
  getStatus() {
    const auto_devices = Array.from(this.devices.values())
      .filter(d => d.collection_mode === 'auto');
    const manual_devices = Array.from(this.devices.values())
      .filter(d => d.collection_mode === 'manual');

    return {
      total_devices: this.devices.size,
      auto_devices: auto_devices.length,
      manual_devices: manual_devices.length,
      global_auto_collection_root: this.globalAutoCollectionRoot,
      global_manual_entry_root: this.globalManualEntryRoot,
    };
  }

  /**
   * Rebuild BOTH Merkle roots (auto and manual)
   * CRITICAL: Separate trees for separate incentives
   */
  private rebuildGlobalRoots(): void {
    const auto_devices = Array.from(this.devices.values())
      .filter(d => d.collection_mode === 'auto');
    const manual_devices = Array.from(this.devices.values())
      .filter(d => d.collection_mode === 'manual');

    // Build auto-collection tree
    const auto_leaves = auto_devices.map(d =>
      this.hashLeaf(d.device_pubkey, 'auto')
    );
    this.globalAutoCollectionRoot = auto_leaves.length > 0
      ? this.buildMerkleRoot(auto_leaves)
      : '0'.repeat(64);

    // Build manual-entry tree
    const manual_leaves = manual_devices.map(d =>
      this.hashLeaf(d.device_pubkey, 'manual')
    );
    this.globalManualEntryRoot = manual_leaves.length > 0
      ? this.buildMerkleRoot(manual_leaves)
      : '0'.repeat(64);

    console.log('✓ Global Merkle roots rebuilt:');
    console.log(`  Auto-collection root:  ${this.globalAutoCollectionRoot.slice(0, 32)}...`);
    console.log(`  Manual-entry root:     ${this.globalManualEntryRoot.slice(0, 32)}...`);
  }

  /**
   * CRITICAL: Leaf hash includes collection_mode
   * This cryptographically binds device to its collection method
   */
  private hashLeaf(device_pubkey: string, collection_mode: 'auto' | 'manual'): string {
    const combined = device_pubkey + '|' + collection_mode;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Build Merkle root from leaves
   */
  private buildMerkleRoot(leaves: string[]): string {
    if (leaves.length === 0) return '0'.repeat(64);

    let current_level = [...leaves];

    while (current_level.length > 1) {
      const next_level: string[] = [];

      for (let i = 0; i < current_level.length; i += 2) {
        const left = current_level[i];
        const right = current_level[i + 1] || left; // Duplicate if odd
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        next_level.push(combined);
      }

      current_level = next_level;
    }

    return current_level[0];
  }

  /**
   * Compute Merkle proof for a leaf at given index
   */
  private computeMerkleProof(leaves: string[], leaf_index: number): string[] {
    const proof: string[] = [];
    let current_level = [...leaves];
    let current_index = leaf_index;

    while (current_level.length > 1) {
      const sibling_index = current_index % 2 === 0
        ? current_index + 1
        : current_index - 1;

      const sibling = sibling_index < current_level.length
        ? current_level[sibling_index]
        : current_level[current_index]; // Duplicate if no sibling

      proof.push(sibling);

      // Build next level
      const next_level: string[] = [];
      for (let i = 0; i < current_level.length; i += 2) {
        const left = current_level[i];
        const right = current_level[i + 1] || left;
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        next_level.push(combined);
      }

      current_level = next_level;
      current_index = Math.floor(current_index / 2);
    }

    return proof;
  }

  /**
   * Get current epoch (days since Unix epoch)
   */
  private getCurrentEpoch(): number {
    return Math.floor(Date.now() / (24 * 3600 * 1000));
  }

  /**
   * Reset registry (for testing)
   */
  reset(): void {
    this.devices.clear();
    this.rebuildGlobalRoots();
    console.log('🔄 Device registry reset');
  }
}
