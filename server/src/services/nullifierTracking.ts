/**
 * Nullifier Tracking Service
 *
 * Prevents double-spending of ZK proofs by tracking used nullifiers per epoch.
 * Nullifiers change per epoch to ensure unlinkability across time periods.
 *
 * Privacy Properties:
 * - Nullifier = hash(device_secret || epoch)
 * - Different epochs produce different nullifiers (unlinkable)
 * - Backend cannot link nullifiers to devices
 * - Prevents same device from submitting multiple times per epoch
 */

import { getDatabase } from '../database';
import * as crypto from 'crypto';

export interface NullifierRecord {
  nullifier: string;
  epoch: number;
  data_hash: string;
  reward: number;
  collection_mode: string;
  spent_at: number;
}

export class NullifierTrackingService {
  private db;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Check if nullifier has been spent in this epoch
   * Returns true if already spent (replay attack detected)
   */
  isNullifierSpent(nullifier: string, epoch: number): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM spent_nullifiers
      WHERE nullifier = ? AND epoch = ?
    `);

    const result = stmt.get(nullifier, epoch) as { count: number };
    return result.count > 0;
  }

  /**
   * Mark nullifier as spent
   * This prevents the same device from submitting twice in the same epoch
   */
  markNullifierSpent(
    nullifier: string,
    epoch: number,
    data_hash: string,
    reward: number
  ): void {
    // Check if already spent (double-spend attempt)
    if (this.isNullifierSpent(nullifier, epoch)) {
      throw new Error(`Nullifier already spent in epoch ${epoch} (replay attack detected)`);
    }

    const stmt = this.db.prepare(`
      INSERT INTO spent_nullifiers (
        nullifier,
        epoch,
        data_hash,
        reward,
        spent_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const now = Math.floor(Date.now() / 1000);
    stmt.run(nullifier, epoch, data_hash, reward, now);

    console.log(`🔒 Nullifier marked as spent: ${nullifier.slice(0, 16)}... (epoch ${epoch})`);
  }

  /**
   * Get current epoch (daily epochs)
   * Epoch = days since Unix epoch
   */
  getCurrentEpoch(): number {
    return Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  }

  /**
   * Compute nullifier for device (for testing/simulation)
   * NOTE: In production, this runs on the device, not the server!
   *
   * Nullifier = hash(device_secret || epoch)
   * This ensures:
   * - Same device + same epoch = same nullifier (prevents double-spending)
   * - Same device + different epoch = different nullifier (unlinkability)
   */
  static computeNullifier(deviceSecret: string, epoch: number): string {
    const combined = deviceSecret + '|' + epoch.toString();
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get all nullifiers for an epoch (for debugging)
   */
  getNullifiersForEpoch(epoch: number): NullifierRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM spent_nullifiers
      WHERE epoch = ?
      ORDER BY spent_at DESC
    `);

    return stmt.all(epoch) as NullifierRecord[];
  }

  /**
   * Get nullifier statistics
   */
  getNullifierStats(): {
    total_nullifiers: number;
    current_epoch_count: number;
    total_epochs: number;
    total_rewards: number;
  } {
    const currentEpoch = this.getCurrentEpoch();

    const totalStmt = this.db.prepare(`SELECT COUNT(*) as count FROM spent_nullifiers`);
    const total = (totalStmt.get() as { count: number }).count;

    const epochStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM spent_nullifiers
      WHERE epoch = ?
    `);
    const currentEpochCount = (epochStmt.get(currentEpoch) as { count: number }).count;

    const epochsStmt = this.db.prepare(`SELECT COUNT(DISTINCT epoch) as count FROM spent_nullifiers`);
    const totalEpochs = (epochsStmt.get() as { count: number }).count;

    const rewardsStmt = this.db.prepare(`SELECT SUM(reward) as total FROM spent_nullifiers`);
    const totalRewards = ((rewardsStmt.get() as { total: number | null }).total) || 0;

    return {
      total_nullifiers: total,
      current_epoch_count: currentEpochCount,
      total_epochs: totalEpochs,
      total_rewards: totalRewards,
    };
  }

  /**
   * Garbage collection: Delete nullifiers older than N epochs
   * This prevents database bloat while maintaining recent history for debugging
   */
  cleanupOldNullifiers(keepEpochs: number = 30): number {
    const currentEpoch = this.getCurrentEpoch();
    const cutoffEpoch = currentEpoch - keepEpochs;

    const stmt = this.db.prepare(`
      DELETE FROM spent_nullifiers
      WHERE epoch < ?
    `);

    const result = stmt.run(cutoffEpoch);
    const deleted = result.changes;

    if (deleted > 0) {
      console.log(`🧹 Cleaned up ${deleted} nullifier(s) older than ${keepEpochs} epochs`);
    }

    return deleted;
  }

  /**
   * Verify nullifier derivation (for debugging)
   * Ensures nullifier was properly computed from device_secret + epoch
   */
  static verifyNullifierDerivation(
    nullifier: string,
    deviceSecret: string,
    epoch: number
  ): boolean {
    const expectedNullifier = this.computeNullifier(deviceSecret, epoch);
    return nullifier === expectedNullifier;
  }

  /**
   * Get nullifier history for analysis (without revealing device identity)
   * Shows distribution of submissions across epochs
   */
  getNullifierDistribution(): {
    epoch: number;
    count: number;
    auto_count: number;
    manual_count: number;
    total_rewards: number;
  }[] {
    const stmt = this.db.prepare(`
      SELECT
        epoch,
        COUNT(*) as count,
        SUM(CASE WHEN collection_mode = 'auto' THEN 1 ELSE 0 END) as auto_count,
        SUM(CASE WHEN collection_mode = 'manual' THEN 1 ELSE 0 END) as manual_count,
        SUM(reward) as total_rewards
      FROM spent_nullifiers
      GROUP BY epoch
      ORDER BY epoch DESC
      LIMIT 30
    `);

    return stmt.all() as any[];
  }
}
