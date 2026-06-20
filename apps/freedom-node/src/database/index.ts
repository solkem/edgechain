/**
 * PostgreSQL database service for EdgeChain.
 *
 * The backend uses DATABASE_URL for production and local development.
 */

import { Pool, QueryResultRow } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import {
  ManualObservationRecord,
  ManualObservationSession,
  ManualObservationStatus,
  ManualObservationStep,
} from '../types/manualObservation';

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const DEFAULT_DATABASE_URL = 'postgresql://edgechain:edgechain@localhost:5432/edgechain';

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required when NODE_ENV=production');
}

const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

export const db = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export async function initializeDatabase() {
  console.log('Initializing EdgeChain PostgreSQL database...');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  await db.query(schema);

  console.log(`Database initialized: ${redactDatabaseUrl(databaseUrl)}`);
}

function redactDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '****';
    }
    return parsed.toString();
  } catch {
    return 'configured DATABASE_URL';
  }
}

function first<T extends QueryResultRow>(rows: T[]): T | undefined {
  return rows[0];
}

function toInt(value: unknown): number {
  return Number(value ?? 0);
}

// Device operations
export const deviceDB = {
  insert: async (device: any) => {
    return db.query(
      `
        INSERT INTO devices (
          device_pubkey,
          owner_wallet,
          registration_epoch,
          expiry_epoch,
          device_id,
          metadata,
          merkle_leaf_hash,
          authorization_reward_paid
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        device.device_pubkey,
        device.owner_wallet,
        device.registration_epoch,
        device.expiry_epoch,
        device.device_id,
        device.metadata,
        device.merkle_leaf_hash,
        Boolean(device.authorization_reward_paid),
      ]
    );
  },

  findByPubkey: async (device_pubkey: string) => {
    const result = await db.query('SELECT * FROM devices WHERE device_pubkey = $1', [device_pubkey]);
    return first(result.rows);
  },

  getAll: async () => {
    const result = await db.query('SELECT * FROM devices ORDER BY created_at ASC');
    return result.rows;
  },

  delete: async (device_pubkey: string) => {
    return db.query('DELETE FROM devices WHERE device_pubkey = $1', [device_pubkey]);
  },

  deleteAll: async () => {
    return db.query('DELETE FROM devices');
  },
};

// Sensor readings operations
export const readingDB = {
  insert: async (reading: any) => {
    return db.query(
      `
        INSERT INTO sensor_readings (
          device_pubkey,
          reading_json,
          temperature,
          humidity,
          timestamp_device,
          signature,
          batch_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        reading.device_pubkey,
        reading.reading_json,
        reading.temperature,
        reading.humidity,
        reading.timestamp_device,
        reading.signature,
        reading.batch_id,
      ]
    );
  },

  findByBatch: async (batch_id: string) => {
    const result = await db.query('SELECT * FROM sensor_readings WHERE batch_id = $1', [batch_id]);
    return result.rows;
  },

  findByDevice: async (device_pubkey: string, limit = 100) => {
    const result = await db.query(
      `
        SELECT * FROM sensor_readings
        WHERE device_pubkey = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [device_pubkey, limit]
    );
    return result.rows;
  },

  getCount: async () => {
    const result = await db.query('SELECT COUNT(*)::int AS count FROM sensor_readings');
    return toInt(result.rows[0]?.count);
  },
};

// Batch proofs operations
export const batchProofDB = {
  insert: async (proof: any) => {
    return db.query(
      `
        INSERT INTO batch_proofs (
          batch_id,
          device_pubkey,
          collection_mode,
          readings_count,
          proof_data,
          public_inputs,
          merkle_root
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        proof.batch_id,
        proof.device_pubkey,
        proof.collection_mode,
        proof.readings_count,
        proof.proof_data,
        proof.public_inputs,
        proof.merkle_root,
      ]
    );
  },

  findById: async (batch_id: string) => {
    const result = await db.query('SELECT * FROM batch_proofs WHERE batch_id = $1', [batch_id]);
    return first(result.rows);
  },

  markVerified: async (batch_id: string, tx_hash: string, block_number?: number) => {
    return db.query(
      `
        UPDATE batch_proofs
        SET verified = TRUE,
            verified_at = EXTRACT(EPOCH FROM NOW())::BIGINT,
            tx_hash = $1,
            block_number = $2
        WHERE batch_id = $3
      `,
      [tx_hash, block_number ?? null, batch_id]
    );
  },

  findUnverified: async (limit = 10) => {
    const result = await db.query(
      `
        SELECT * FROM batch_proofs
        WHERE verified = FALSE
        ORDER BY created_at ASC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows;
  },

  getStats: async () => {
    const result = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN verified THEN 1 ELSE 0 END)::int AS verified,
        COALESCE(SUM(readings_count), 0)::int AS total_readings
      FROM batch_proofs
    `);
    return result.rows[0];
  },
};

// Rewards operations
export const rewardDB = {
  insert: async (reward: any) => {
    return db.query(
      `
        INSERT INTO rewards (batch_id, farmer_address, amount, tx_hash, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [reward.batch_id, reward.farmer_address, reward.amount, reward.tx_hash, reward.status]
    );
  },

  markCompleted: async (id: number, tx_hash: string) => {
    return db.query(
      `
        UPDATE rewards
        SET status = 'completed',
            tx_hash = $1,
            paid_at = EXTRACT(EPOCH FROM NOW())::BIGINT
        WHERE id = $2
      `,
      [tx_hash, id]
    );
  },

  markFailed: async (id: number, error_message: string) => {
    return db.query('UPDATE rewards SET status = $1, error_message = $2 WHERE id = $3', [
      'failed',
      error_message,
      id,
    ]);
  },

  findByFarmer: async (farmer_address: string) => {
    const result = await db.query(
      `
        SELECT * FROM rewards
        WHERE farmer_address = $1
        ORDER BY created_at DESC
      `,
      [farmer_address]
    );
    return result.rows;
  },

  getTotalByFarmer: async (farmer_address: string) => {
    const result = await db.query(
      `
        SELECT COALESCE(SUM(amount), 0)::float AS total
        FROM rewards
        WHERE farmer_address = $1 AND status = 'completed'
      `,
      [farmer_address]
    );
    return Number(result.rows[0]?.total ?? 0);
  },

  getPending: async () => {
    const result = await db.query(`
      SELECT * FROM rewards
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `);
    return result.rows;
  },
};

// Nullifier operations
export const nullifierDB = {
  insert: async (claim_nullifier: string, batch_id: string) => {
    return db.query('INSERT INTO nullifiers (claim_nullifier, batch_id) VALUES ($1, $2)', [
      claim_nullifier,
      batch_id,
    ]);
  },

  exists: async (claim_nullifier: string): Promise<boolean> => {
    const result = await db.query('SELECT 1 FROM nullifiers WHERE claim_nullifier = $1', [claim_nullifier]);
    return (result.rowCount ?? 0) > 0;
  },

  getCount: async () => {
    const result = await db.query('SELECT COUNT(*)::int AS count FROM nullifiers');
    return toInt(result.rows[0]?.count);
  },
};

// Merkle roots operations
export const merkleRootDB = {
  insert: async (root: any) => {
    return db.query('INSERT INTO merkle_roots (root_hash, collection_mode, device_count) VALUES ($1, $2, $3)', [
      root.root_hash,
      root.collection_mode,
      root.device_count,
    ]);
  },

  markPublished: async (root_hash: string, tx_hash: string, block_number?: number) => {
    return db.query(
      `
        UPDATE merkle_roots
        SET published_to_chain = TRUE,
            tx_hash = $1,
            block_number = $2
        WHERE root_hash = $3
      `,
      [tx_hash, block_number ?? null, root_hash]
    );
  },

  findCurrent: async (collection_mode: string) => {
    const result = await db.query(
      `
        SELECT * FROM merkle_roots
        WHERE collection_mode = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [collection_mode]
    );
    return first(result.rows);
  },

  getUnpublished: async () => {
    const result = await db.query('SELECT * FROM merkle_roots WHERE published_to_chain = FALSE');
    return result.rows;
  },
};

// Transaction log operations
export const txLogDB = {
  insert: async (tx: any) => {
    return db.query(
      `
        INSERT INTO transaction_log (tx_hash, tx_type, status, block_number, related_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [tx.tx_hash, tx.tx_type, tx.status, tx.block_number, tx.related_id, tx.metadata]
    );
  },

  markConfirmed: async (tx_hash: string, block_number: number) => {
    return db.query(
      `
        UPDATE transaction_log
        SET status = 'confirmed',
            block_number = $1,
            confirmed_at = EXTRACT(EPOCH FROM NOW())::BIGINT
        WHERE tx_hash = $2
      `,
      [block_number, tx_hash]
    );
  },

  findByHash: async (tx_hash: string) => {
    const result = await db.query('SELECT * FROM transaction_log WHERE tx_hash = $1', [tx_hash]);
    return first(result.rows);
  },

  getPending: async () => {
    const result = await db.query(`
      SELECT * FROM transaction_log
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `);
    return result.rows;
  },

  getRecent: async (limit = 20) => {
    const result = await db.query(
      `
        SELECT * FROM transaction_log
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows;
  },
};

function parseSession(row: any): ManualObservationSession {
  return {
    session_id: row.session_id,
    channel: row.channel,
    participant_phone_hash: row.participant_phone_hash || undefined,
    current_step: row.current_step as ManualObservationStep,
    status: row.status as ManualObservationStatus,
    draft: JSON.parse(row.draft_json),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

function parseObservation(row: any): ManualObservationRecord {
  return {
    observation_id: row.observation_id,
    session_id: row.session_id,
    site_id: row.site_id,
    channel: row.channel,
    participant_phone_hash: row.participant_phone_hash || undefined,
    observation_date: row.observation_date,
    payload: JSON.parse(row.payload_json),
    validation_status: row.validation_status,
    validation_errors: JSON.parse(row.validation_errors_json),
    review_status: row.review_status,
    submitted_at: Number(row.submitted_at),
  };
}

// Manual observation operations
export const manualObservationDB = {
  insertSession: async (session: ManualObservationSession) => {
    return db.query(
      `
        INSERT INTO manual_observation_sessions
          (session_id, channel, participant_phone_hash, current_step, status, draft_json)
        VALUES
          ($1, $2, $3, $4, $5, $6)
      `,
      [
        session.session_id,
        session.channel,
        session.participant_phone_hash || null,
        session.current_step,
        session.status,
        JSON.stringify(session.draft),
      ]
    );
  },

  updateSession: async (session: ManualObservationSession) => {
    return db.query(
      `
        UPDATE manual_observation_sessions
        SET current_step = $1,
            status = $2,
            draft_json = $3,
            updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
        WHERE session_id = $4
      `,
      [session.current_step, session.status, JSON.stringify(session.draft), session.session_id]
    );
  },

  findSession: async (session_id: string): Promise<ManualObservationSession | undefined> => {
    const result = await db.query('SELECT * FROM manual_observation_sessions WHERE session_id = $1', [session_id]);
    const row = first(result.rows);
    return row ? parseSession(row) : undefined;
  },

  findActiveSessionByPhoneHash: async (
    participant_phone_hash: string
  ): Promise<ManualObservationSession | undefined> => {
    const result = await db.query(
      `
        SELECT * FROM manual_observation_sessions
        WHERE participant_phone_hash = $1 AND status = 'active'
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [participant_phone_hash]
    );
    const row = first(result.rows);
    return row ? parseSession(row) : undefined;
  },

  insertObservation: async (observation: ManualObservationRecord) => {
    return db.query(
      `
        INSERT INTO manual_observations
          (observation_id, session_id, site_id, channel, participant_phone_hash,
           observation_date, payload_json, validation_status, validation_errors_json, review_status)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        observation.observation_id,
        observation.session_id,
        observation.site_id,
        observation.channel,
        observation.participant_phone_hash || null,
        observation.observation_date,
        JSON.stringify(observation.payload),
        observation.validation_status,
        JSON.stringify(observation.validation_errors),
        observation.review_status,
      ]
    );
  },

  listObservations: async (limit = 100): Promise<ManualObservationRecord[]> => {
    const result = await db.query(
      `
        SELECT * FROM manual_observations
        ORDER BY submitted_at DESC
        LIMIT $1
      `,
      [limit]
    );
    return result.rows.map(parseObservation);
  },

  getCount: async () => {
    const result = await db.query('SELECT COUNT(*)::int AS count FROM manual_observations');
    return toInt(result.rows[0]?.count);
  },

  insertMessage: async (message: {
    session_id?: string;
    channel: string;
    direction: 'inbound' | 'outbound';
    participant_phone_hash?: string;
    raw_payload: unknown;
  }) => {
    return db.query(
      `
        INSERT INTO manual_observation_messages
          (session_id, channel, direction, participant_phone_hash, raw_payload_json)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        message.session_id || null,
        message.channel,
        message.direction,
        message.participant_phone_hash || null,
        JSON.stringify(message.raw_payload),
      ]
    );
  },
};

// Database statistics
export async function getDatabaseStats() {
  const [devices, readings, batch_proofs, nullifiers, pending_rewards, manual_observations] = await Promise.all([
    deviceDB.getAll(),
    readingDB.getCount(),
    batchProofDB.getStats(),
    nullifierDB.getCount(),
    rewardDB.getPending(),
    manualObservationDB.getCount(),
  ]);

  return {
    database: 'PostgreSQL',
    devices: devices.length,
    readings,
    batch_proofs,
    nullifiers,
    pending_rewards: pending_rewards.length,
    manual_observations,
  };
}

export function getDatabase() {
  return db;
}
