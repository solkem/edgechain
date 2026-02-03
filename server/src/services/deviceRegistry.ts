/**
 * Device Registry Service - Simplified Single-Tree Architecture
 *
 * Manages approved IoT devices with a SINGLE Merkle tree:
 * - All devices in one tree (larger anonymity set)
 * - Fixed reward: 0.1 DUST for all verified readings
 *
 * Key Innovation: Leaf = H(device_pubkey)
 * Simpler hash, larger anonymity set, better privacy
 */

import * as crypto from 'crypto';
import { deviceDB } from '../database';

export interface ApprovedDevice {
  device_pubkey: string;
  registration_epoch: number;
  expiry_epoch: number;
  device_id?: string;
  metadata?: any;
}

export interface MerkleProof {
  merkle_proof: string[];
  leaf_index: number;
  root: string;
}

export class DeviceRegistryService {
  private devices: Map<string, ApprovedDevice> = new Map();
  private globalDeviceRoot: string = '';

  constructor() {
    // Load devices from database on startup
    this.loadDevicesFromDatabase();
    // Initialize root based on loaded devices
    this.rebuildGlobalRoot();
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
   * Register a new device (all devices use auto collection)
   */
  registerDevice(
    device_pubkey: string,
    device_id?: string,
    metadata?: any
  ): ApprovedDevice {
    if (this.devices.has(device_pubkey)) {
      throw new Error('Device already registered');
    }

    const current_epoch = this.getCurrentEpoch();
    const registration: ApprovedDevice = {
      device_pubkey,
      registration_epoch: current_epoch,
      expiry_epoch: current_epoch + 365, // Valid for 1 year
      device_id,
      metadata,
    };

    this.devices.set(device_pubkey, registration);
    this.rebuildGlobalRoot();

    // Note: Database persistence is handled by the route layer (arduino.ts)
    // which calls dbService.registerDevice() before this method.
    // This avoids duplicate database inserts.

    console.log(`✅ Device registered: ${device_pubkey.slice(0, 16)}...`);
    console.log(`   Device root: ${this.globalDeviceRoot.slice(0, 16)}...`);

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
   */
  getMerkleProof(device_pubkey: string): MerkleProof {
    const device = this.devices.get(device_pubkey);
    if (!device) {
      throw new Error(`Device ${device_pubkey} not in registry`);
    }

    // Get all devices SORTED for deterministic ordering
    const allDevices = Array.from(this.devices.values())
      .sort((a, b) => a.device_pubkey.localeCompare(b.device_pubkey));

    const leaf_index = allDevices.findIndex(d => d.device_pubkey === device_pubkey);
    if (leaf_index === -1) {
      throw new Error(`Device not found in registry`);
    }

    // Build leaves: H(pubkey)
    const leaves = allDevices.map(d => this.hashLeaf(d.device_pubkey));

    const merkle_proof = this.computeMerkleProof(leaves, leaf_index);

    return {
      merkle_proof,
      leaf_index,
      root: this.globalDeviceRoot,
    };
  }

  /**
   * Get global device root
   */
  getGlobalDeviceRoot(): string {
    return this.globalDeviceRoot;
  }

  /**
   * Get all registered devices
   */
  getAllDevices(): ApprovedDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get registry status
   */
  getStatus() {
    return {
      total_devices: this.devices.size,
      global_device_root: this.globalDeviceRoot,
    };
  }

  /**
   * Rebuild global Merkle root (single tree for all devices)
   */
  private rebuildGlobalRoot(): void {
    // CRITICAL: Sort devices for deterministic Merkle root (C3 fix)
    const all_devices = Array.from(this.devices.values())
      .sort((a, b) => a.device_pubkey.localeCompare(b.device_pubkey));

    // Build single device tree
    const leaves = all_devices.map(d => this.hashLeaf(d.device_pubkey));
    this.globalDeviceRoot = leaves.length > 0
      ? this.buildMerkleRoot(leaves)
      : '0'.repeat(64);

    console.log('✓ Global Merkle root rebuilt:');
    console.log(`  Device root: ${this.globalDeviceRoot.slice(0, 32)}...`);
    console.log(`  Total devices: ${all_devices.length}`);
  }

  /**
   * Leaf hash: Simple hash of device public key
   */
  private hashLeaf(device_pubkey: string): string {
    return crypto.createHash('sha256').update(device_pubkey).digest('hex');
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
    this.rebuildGlobalRoot();
    console.log('🔄 Device registry reset');
  }
}
