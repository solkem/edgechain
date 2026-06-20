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
import type { MarsScore } from '@edgechain/mars';

export interface NullifierRecord {
  nullifier: string;
  epoch: number;
  data_hash: string;
  reward: number;
  collection_mode: string;
  mars_action?: string;
  mars_composite?: number;
  mars_score_json?: string;
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
  async isNullifierSpent(nullifier: string, epoch: number): Promise<boolean> {
    const result = await this.db.query(`
      SELECT COUNT(*) as count
      FROM spent_nullifiers
      WHERE nullifier = $1 AND epoch = $2
    `, [nullifier, epoch]);

    return Number(result.rows[0].count) > 0;
  }

  /**
   * Mark nullifier as spent
   * This prevents the same device from submitting twice in the same epoch
   */
  async markNullifierSpent(
    nullifier: string,
    epoch: number,
    data_hash: string,
    reward: number,
    marsScore?: MarsScore
  ): Promise<void> {
    // Check if already spent (double-spend attempt)
    if (await this.isNullifierSpent(nullifier, epoch)) {
      throw new Error(`Nullifier already spent in epoch ${epoch} (replay attack detected)`);
    }

    const now = Math.floor(Date.now() / 1000);
    await this.db.query(`
      INSERT INTO spent_nullifiers (
        nullifier,
        epoch,
        data_hash,
        reward,
        mars_action,
        mars_composite,
        mars_score_json,
        spent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      nullifier,
      epoch,
      data_hash,
      reward,
      marsScore?.action ?? null,
      marsScore?.composite ?? null,
      marsScore ? JSON.stringify(marsScore) : null,
      now
    ]);

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
  async getNullifiersForEpoch(epoch: number): Promise<NullifierRecord[]> {
    const result = await this.db.query(`
      SELECT * FROM spent_nullifiers
      WHERE epoch = $1
      ORDER BY spent_at DESC
    `, [epoch]);

    return result.rows as NullifierRecord[];
  }

  /**
   * Get nullifier statistics
   */
  async getNullifierStats(): Promise<{
    total_nullifiers: number;
    current_epoch_count: number;
    total_epochs: number;
    total_rewards: number;
  }> {
    const currentEpoch = this.getCurrentEpoch();

    const totalResult = await this.db.query(`SELECT COUNT(*)::int as count FROM spent_nullifiers`);
    const total = Number(totalResult.rows[0].count);

    const epochResult = await this.db.query(`
      SELECT COUNT(*) as count
      FROM spent_nullifiers
      WHERE epoch = $1
    `, [currentEpoch]);
    const currentEpochCount = Number(epochResult.rows[0].count);

    const epochsResult = await this.db.query(`SELECT COUNT(DISTINCT epoch)::int as count FROM spent_nullifiers`);
    const totalEpochs = Number(epochsResult.rows[0].count);

    const rewardsResult = await this.db.query(`SELECT COALESCE(SUM(reward), 0)::float as total FROM spent_nullifiers`);
    const totalRewards = Number(rewardsResult.rows[0].total);

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
  async cleanupOldNullifiers(keepEpochs: number = 30): Promise<number> {
    const currentEpoch = this.getCurrentEpoch();
    const cutoffEpoch = currentEpoch - keepEpochs;

    const result = await this.db.query(`
      DELETE FROM spent_nullifiers
      WHERE epoch < $1
    `, [cutoffEpoch]);
    const deleted = result.rowCount || 0;

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
  async getNullifierDistribution(): Promise<{
    epoch: number;
    count: number;
    total_rewards: number;
    date: string;
  }[]> {
    const result = await this.db.query(`
      SELECT
        epoch,
        COUNT(*)::int as count,
        COALESCE(SUM(reward), 0)::float as total_rewards,
        TO_CHAR(TO_TIMESTAMP(spent_at), 'YYYY-MM-DD') as date
      FROM spent_nullifiers
      GROUP BY epoch
      ORDER BY epoch DESC
      LIMIT 30
    `);

    return result.rows as any[];
  }
}
