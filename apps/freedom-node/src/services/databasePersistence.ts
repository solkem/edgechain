/**
 * Database Persistence Service
 *
 * Handles persisting Sensor Node data to PostgreSQL
 * Supports wallet-based device ownership and historical tracking
 */

import { getDatabase } from '../database';
import { SignedReading } from '../types/iot';

export interface DeviceRecord {
  device_pubkey: string;
  owner_wallet: string;
  registration_epoch: number;
  expiry_epoch: number;
  device_id: string;
  metadata: string; // JSON
  merkle_leaf_hash: string;
  authorization_reward_paid: number; // Boolean: 0 or 1
  created_at: number;
}

export interface ReadingRecord {
  id: number;
  device_pubkey: string;
  reading_json: string;
  temperature: number;
  humidity: number;
  timestamp_device: number;
  signature: string;
  batch_id: string | null;
  created_at: number;
}

export interface ConsistencyMetrics {
  device_pubkey: string;
  owner_wallet: string;
  total_readings: number;
  expected_readings: number; // Based on 24-hour epoch
  missed_readings: number;
  uptime_percent: number;
  first_reading_at: number;
  last_reading_at: number;
  epoch_start: number;
  epoch_end: number;
}

export interface IncentiveSummary {
  device_pubkey: string;
  owner_wallet: string;
  authorization_reward: number; // 0.02 tDUST
  consistency_bonus: number; // 0 to 0.4 tDUST based on uptime
  total_earned: number;
  consistency_percent: number;
}

export class DatabasePersistenceService {
  private db;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Persist device registration to database (single-tree architecture)
   * Returns: { alreadyRegistered: boolean, device: DeviceRecord }
   */
  async registerDevice(
    device_pubkey: string,
    owner_wallet: string,
    device_id: string,
    metadata: any,
    merkle_leaf_hash: string
  ): Promise<{ alreadyRegistered: boolean; device: DeviceRecord }> {
    // Check if device already exists
    const existing = await this.getDevice(device_pubkey);

    if (existing) {
      console.log(`⚠️  Device already registered: ${device_pubkey.slice(0, 16)}...`);
      console.log(`   Owner: ${existing.owner_wallet}`);

      // Verify ownership
      if (existing.owner_wallet !== owner_wallet) {
        throw new Error(`Device ${device_pubkey} is already registered to a different wallet`);
      }

      return { alreadyRegistered: true, device: existing };
    }

    // New registration
    const now = Math.floor(Date.now() / 1000);
    const registration_epoch = now;
    const expiry_epoch = now + (86400 * 365); // 1 year

    await this.db.query(`
      INSERT INTO devices (
        device_pubkey,
        owner_wallet,
        registration_epoch,
        expiry_epoch,
        device_id,
        metadata,
        merkle_leaf_hash,
        authorization_reward_paid,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      device_pubkey,
      owner_wallet,
      registration_epoch,
      expiry_epoch,
      device_id,
      JSON.stringify(metadata),
      merkle_leaf_hash,
      false,
      now,
    ]);

    console.log(`✅ Device registered in database: ${device_pubkey.slice(0, 16)}...`);

    // Return the newly created device
    const newDevice = (await this.getDevice(device_pubkey))!;
    return { alreadyRegistered: false, device: newDevice };
  }

  /**
   * Get device by pubkey
   */
  async getDevice(device_pubkey: string): Promise<DeviceRecord | null> {
    const result = await this.db.query('SELECT * FROM devices WHERE device_pubkey = $1', [device_pubkey]);
    return (result.rows[0] as DeviceRecord | undefined) || null;
  }

  /**
   * Get device by owner wallet
   */
  async getDeviceByWallet(owner_wallet: string): Promise<DeviceRecord | null> {
    const result = await this.db.query('SELECT * FROM devices WHERE owner_wallet = $1 LIMIT 1', [owner_wallet]);
    return (result.rows[0] as DeviceRecord | undefined) || null;
  }

  /**
   * Persist sensor reading to database
   */
  async saveReading(reading: SignedReading): Promise<number> {
    const parsed = JSON.parse(reading.reading_json);

    const result = await this.db.query(`
      INSERT INTO sensor_readings (
        device_pubkey,
        reading_json,
        temperature,
        humidity,
        timestamp_device,
        signature,
        batch_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      reading.device_pubkey,
      reading.reading_json,
      parsed.t,
      parsed.h,
      parsed.ts,
      reading.signature,
      null,
      Math.floor(Date.now() / 1000)
    ]);

    const id = Number(result.rows[0].id);
    console.log(`📊 Reading saved to database: ID ${id}`);
    return id;
  }

  /**
   * Get all readings for a device within an epoch (24-hour window)
   */
  async getReadingsInEpoch(device_pubkey: string, epoch_start: number, epoch_end: number): Promise<ReadingRecord[]> {
    const result = await this.db.query(`
      SELECT * FROM sensor_readings
      WHERE device_pubkey = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at ASC
    `, [device_pubkey, epoch_start, epoch_end]);

    return result.rows as ReadingRecord[];
  }

  /**
   * Get all readings for a wallet's device
   */
  async getReadingsByWallet(owner_wallet: string, limit: number = 100): Promise<ReadingRecord[]> {
    const result = await this.db.query(`
      SELECT sr.* FROM sensor_readings sr
      INNER JOIN devices d ON sr.device_pubkey = d.device_pubkey
      WHERE d.owner_wallet = $1
      ORDER BY sr.created_at DESC
      LIMIT $2
    `, [owner_wallet, limit]);

    return result.rows as ReadingRecord[];
  }

  /**
   * Calculate consistency metrics for a device over the last 24 hours
   */
  async getConsistencyMetrics(device_pubkey: string): Promise<ConsistencyMetrics | null> {
    const device = await this.getDevice(device_pubkey);
    if (!device) return null;

    const now = Math.floor(Date.now() / 1000);
    const epoch_end = now;
    const epoch_start = now - (24 * 60 * 60); // 24 hours ago

    const readings = await this.getReadingsInEpoch(device_pubkey, epoch_start, epoch_end);

    if (readings.length === 0) {
      return {
        device_pubkey,
        owner_wallet: device.owner_wallet,
        total_readings: 0,
        expected_readings: 0,
        missed_readings: 0,
        uptime_percent: 0,
        first_reading_at: 0,
        last_reading_at: 0,
        epoch_start,
        epoch_end,
      };
    }

    const first_reading_at = readings[0].created_at;
    const last_reading_at = readings[readings.length - 1].created_at;

    // Time-window based uptime calculation with gap detection
    // Expected: 1 reading every 30 seconds = 2 per minute = 120 per hour
    // Gap threshold: 120 seconds (4x reading interval) - anything longer is considered "offline"

    const READING_INTERVAL = 30; // seconds
    const GAP_THRESHOLD = 120; // 2 minutes - if gap is longer, don't count it as expected readings

    let total_active_time = 0; // Total time device was actively collecting

    for (let i = 0; i < readings.length; i++) {
      const current_time = readings[i].created_at;
      const next_time = i < readings.length - 1 ? readings[i + 1].created_at : now;
      const gap = next_time - current_time;

      if (gap <= GAP_THRESHOLD) {
        // Device was active during this period
        total_active_time += gap;
      }
      // If gap > threshold, device was offline - don't count this time
    }

    // Calculate expected readings based only on active collection time
    const expected_readings = Math.floor(total_active_time / READING_INTERVAL);
    const total_readings = readings.length;
    const missed_readings = Math.max(0, expected_readings - total_readings);
    const uptime_percent = expected_readings > 0
      ? Math.min(100, (total_readings / expected_readings) * 100)
      : 100; // If we have readings but expected is 0, give 100%

    return {
      device_pubkey,
      owner_wallet: device.owner_wallet,
      total_readings,
      expected_readings,
      missed_readings,
      uptime_percent,
      first_reading_at,
      last_reading_at,
      epoch_start,
      epoch_end,
    };
  }

  /**
   * Calculate incentive summary for a device
   */
  async getIncentiveSummary(device_pubkey: string): Promise<IncentiveSummary | null> {
    const device = await this.getDevice(device_pubkey);
    if (!device) return null;

    const consistency = await this.getConsistencyMetrics(device_pubkey);
    if (!consistency) return null;

    // Authorization reward: 0.02 tDUST (one-time)
    const authorization_reward = 0.02;

    // Consistency bonus: 0 to 0.4 tDUST based on uptime
    // 100% uptime = 0.4 tDUST
    // 90% uptime = 0.36 tDUST
    // 50% uptime = 0.2 tDUST
    // 0% uptime = 0 tDUST
    const consistency_bonus = (consistency.uptime_percent / 100) * 0.4;

    const total_earned = authorization_reward + consistency_bonus;

    return {
      device_pubkey,
      owner_wallet: device.owner_wallet,
      authorization_reward,
      consistency_bonus,
      total_earned,
      consistency_percent: consistency.uptime_percent,
    };
  }

  /**
   * Mark authorization reward as paid
   */
  async markAuthorizationRewardPaid(device_pubkey: string): Promise<void> {
    await this.db.query(`
      UPDATE devices
      SET authorization_reward_paid = TRUE
      WHERE device_pubkey = $1
    `, [device_pubkey]);
    console.log(`💰 Authorization reward marked as paid for ${device_pubkey.slice(0, 16)}...`);
  }

  /**
   * Get total readings count
   */
  async getTotalReadingsCount(): Promise<number> {
    const result = await this.db.query(`SELECT COUNT(*)::int as count FROM sensor_readings`);
    return Number(result.rows[0].count);
  }

  /**
   * Get total devices count
   */
  async getTotalDevicesCount(): Promise<number> {
    const result = await this.db.query(`SELECT COUNT(*)::int as count FROM devices`);
    return Number(result.rows[0].count);
  }
}
