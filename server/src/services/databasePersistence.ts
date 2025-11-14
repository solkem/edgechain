/**
 * Database Persistence Service
 *
 * Handles persisting Arduino IoT data to SQLite database
 * Supports wallet-based device ownership and historical tracking
 */

import { getDatabase } from '../database';
import { SignedReading } from '../types/arduino';

export interface DeviceRecord {
  device_pubkey: string;
  owner_wallet: string;
  collection_mode: 'auto' | 'manual';
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
  signature_r: string;
  signature_s: string;
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
   * Persist device registration to database
   * Returns: { alreadyRegistered: boolean, device: DeviceRecord }
   */
  registerDevice(
    device_pubkey: string,
    owner_wallet: string,
    collection_mode: 'auto' | 'manual',
    device_id: string,
    metadata: any,
    merkle_leaf_hash: string
  ): { alreadyRegistered: boolean; device: DeviceRecord } {
    // Check if device already exists
    const existing = this.getDevice(device_pubkey);

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

    const stmt = this.db.prepare(`
      INSERT INTO devices (
        device_pubkey,
        owner_wallet,
        collection_mode,
        registration_epoch,
        expiry_epoch,
        device_id,
        metadata,
        merkle_leaf_hash,
        authorization_reward_paid,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      device_pubkey,
      owner_wallet,
      collection_mode,
      registration_epoch,
      expiry_epoch,
      device_id,
      JSON.stringify(metadata),
      merkle_leaf_hash,
      0, // Not paid yet
      now
    );

    console.log(`✅ Device registered in database: ${device_pubkey.slice(0, 16)}...`);

    // Return the newly created device
    const newDevice = this.getDevice(device_pubkey)!;
    return { alreadyRegistered: false, device: newDevice };
  }

  /**
   * Get device by pubkey
   */
  getDevice(device_pubkey: string): DeviceRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM devices WHERE device_pubkey = ?
    `);

    const row = stmt.get(device_pubkey) as DeviceRecord | undefined;
    return row || null;
  }

  /**
   * Get device by owner wallet
   */
  getDeviceByWallet(owner_wallet: string): DeviceRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM devices WHERE owner_wallet = ? LIMIT 1
    `);

    const row = stmt.get(owner_wallet) as DeviceRecord | undefined;
    return row || null;
  }

  /**
   * Persist sensor reading to database
   */
  saveReading(reading: SignedReading): number {
    const parsed = JSON.parse(reading.reading_json);

    const stmt = this.db.prepare(`
      INSERT INTO sensor_readings (
        device_pubkey,
        reading_json,
        temperature,
        humidity,
        timestamp_device,
        signature_r,
        signature_s,
        batch_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // For now, store the signature in signature_r and leave signature_s empty
    // This matches the schema which expects separate r and s values
    const info = stmt.run(
      reading.device_pubkey,
      reading.reading_json,
      parsed.t,
      parsed.h,
      parsed.ts,
      reading.signature, // Store full signature in signature_r
      '', // Empty signature_s for now
      null, // batch_id assigned later
      Math.floor(Date.now() / 1000)
    );

    console.log(`📊 Reading saved to database: ID ${info.lastInsertRowid}`);
    return info.lastInsertRowid as number;
  }

  /**
   * Get all readings for a device within an epoch (24-hour window)
   */
  getReadingsInEpoch(device_pubkey: string, epoch_start: number, epoch_end: number): ReadingRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sensor_readings
      WHERE device_pubkey = ?
        AND created_at >= ?
        AND created_at <= ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(device_pubkey, epoch_start, epoch_end) as ReadingRecord[];
    return rows;
  }

  /**
   * Get all readings for a wallet's device
   */
  getReadingsByWallet(owner_wallet: string, limit: number = 100): ReadingRecord[] {
    const stmt = this.db.prepare(`
      SELECT sr.* FROM sensor_readings sr
      INNER JOIN devices d ON sr.device_pubkey = d.device_pubkey
      WHERE d.owner_wallet = ?
      ORDER BY sr.created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(owner_wallet, limit) as ReadingRecord[];
    return rows;
  }

  /**
   * Calculate consistency metrics for a device over the last 24 hours
   */
  getConsistencyMetrics(device_pubkey: string): ConsistencyMetrics | null {
    const device = this.getDevice(device_pubkey);
    if (!device) return null;

    const now = Math.floor(Date.now() / 1000);
    const epoch_end = now;
    const epoch_start = now - (24 * 60 * 60); // 24 hours ago

    const readings = this.getReadingsInEpoch(device_pubkey, epoch_start, epoch_end);

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

    // Expected: 1 reading every 30 seconds = 2 per minute = 120 per hour = 2880 per 24 hours
    // Balanced for demo (visible progress in 3 min) + realistic for agriculture IoT
    // But only count from first reading to now (in case they just registered)
    const seconds_elapsed = now - first_reading_at;
    const expected_readings = Math.floor(seconds_elapsed / 30);

    const total_readings = readings.length;
    const missed_readings = Math.max(0, expected_readings - total_readings);
    const uptime_percent = expected_readings > 0
      ? Math.min(100, (total_readings / expected_readings) * 100)
      : 0;

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
  getIncentiveSummary(device_pubkey: string): IncentiveSummary | null {
    const device = this.getDevice(device_pubkey);
    if (!device) return null;

    const consistency = this.getConsistencyMetrics(device_pubkey);
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
  markAuthorizationRewardPaid(device_pubkey: string): void {
    const stmt = this.db.prepare(`
      UPDATE devices
      SET authorization_reward_paid = 1
      WHERE device_pubkey = ?
    `);

    stmt.run(device_pubkey);
    console.log(`💰 Authorization reward marked as paid for ${device_pubkey.slice(0, 16)}...`);
  }

  /**
   * Get total readings count
   */
  getTotalReadingsCount(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM sensor_readings`);
    const row = stmt.get() as { count: number };
    return row.count;
  }

  /**
   * Get total devices count
   */
  getTotalDevicesCount(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM devices`);
    const row = stmt.get() as { count: number };
    return row.count;
  }
}
