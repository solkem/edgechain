/**
 * Database Service - SQLite with Knex.js
 *
 * Production-grade persistent storage for EdgeChain
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '../../data/edgechain.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
export function initializeDatabase() {
  console.log('🗄️  Initializing EdgeChain database...');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const statements = schema.split(';').filter(s => s.trim());

  db.transaction(() => {
    for (const statement of statements) {
      if (statement.trim()) {
        db.prepare(statement).run();
      }
    }
  })();

  console.log(`   ✅ Database initialized at: ${DB_PATH}`);
}

// Device operations (single-tree architecture)
export const deviceDB = {
  insert: (device: any) => {
    const stmt = db.prepare(`
      INSERT INTO devices (device_pubkey, owner_wallet, registration_epoch, expiry_epoch,
                          device_id, metadata, merkle_leaf_hash)
      VALUES (@device_pubkey, @owner_wallet, @registration_epoch, @expiry_epoch,
              @device_id, @metadata, @merkle_leaf_hash)
    `);
    return stmt.run(device);
  },

  findByPubkey: (device_pubkey: string) => {
    const stmt = db.prepare('SELECT * FROM devices WHERE device_pubkey = ?');
    return stmt.get(device_pubkey);
  },

  getAll: () => {
    const stmt = db.prepare('SELECT * FROM devices');
    return stmt.all();
  },

  delete: (device_pubkey: string) => {
    const stmt = db.prepare('DELETE FROM devices WHERE device_pubkey = ?');
    return stmt.run(device_pubkey);
  },

  deleteAll: () => {
    const stmt = db.prepare('DELETE FROM devices');
    return stmt.run();
  }
};

// Sensor readings operations
export const readingDB = {
  insert: (reading: any) => {
    const stmt = db.prepare(`
      INSERT INTO sensor_readings (device_pubkey, reading_json, temperature, humidity,
                                  timestamp_device, signature_r, signature_s, batch_id)
      VALUES (@device_pubkey, @reading_json, @temperature, @humidity,
              @timestamp_device, @signature_r, @signature_s, @batch_id)
    `);
    return stmt.run(reading);
  },

  findByBatch: (batch_id: string) => {
    const stmt = db.prepare('SELECT * FROM sensor_readings WHERE batch_id = ?');
    return stmt.all(batch_id);
  },

  findByDevice: (device_pubkey: string, limit = 100) => {
    const stmt = db.prepare(`
      SELECT * FROM sensor_readings WHERE device_pubkey = ?
      ORDER BY created_at DESC LIMIT ?
    `);
    return stmt.all(device_pubkey, limit);
  },

  getCount: () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM sensor_readings');
    return (stmt.get() as any).count;
  }
};

// Batch proofs operations
export const batchProofDB = {
  insert: (proof: any) => {
    const stmt = db.prepare(`
      INSERT INTO batch_proofs (batch_id, device_pubkey, collection_mode, readings_count,
                               proof_data, public_inputs, merkle_root)
      VALUES (@batch_id, @device_pubkey, @collection_mode, @readings_count,
              @proof_data, @public_inputs, @merkle_root)
    `);
    return stmt.run(proof);
  },

  findById: (batch_id: string) => {
    const stmt = db.prepare('SELECT * FROM batch_proofs WHERE batch_id = ?');
    return stmt.get(batch_id);
  },

  markVerified: (batch_id: string, tx_hash: string, block_number?: number) => {
    const stmt = db.prepare(`
      UPDATE batch_proofs
      SET verified = 1, verified_at = strftime('%s', 'now'), tx_hash = ?, block_number = ?
      WHERE batch_id = ?
    `);
    return stmt.run(tx_hash, block_number, batch_id);
  },

  findUnverified: (limit = 10) => {
    const stmt = db.prepare(`
      SELECT * FROM batch_proofs WHERE verified = 0
      ORDER BY created_at ASC LIMIT ?
    `);
    return stmt.all(limit);
  },

  getStats: () => {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified,
        SUM(readings_count) as total_readings
      FROM batch_proofs
    `);
    return stmt.get();
  }
};

// Rewards operations
export const rewardDB = {
  insert: (reward: any) => {
    const stmt = db.prepare(`
      INSERT INTO rewards (batch_id, farmer_address, amount, tx_hash, status)
      VALUES (@batch_id, @farmer_address, @amount, @tx_hash, @status)
    `);
    return stmt.run(reward);
  },

  markCompleted: (id: number, tx_hash: string) => {
    const stmt = db.prepare(`
      UPDATE rewards
      SET status = 'completed', tx_hash = ?, paid_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    return stmt.run(tx_hash, id);
  },

  markFailed: (id: number, error_message: string) => {
    const stmt = db.prepare(`
      UPDATE rewards SET status = 'failed', error_message = ? WHERE id = ?
    `);
    return stmt.run(error_message, id);
  },

  findByFarmer: (farmer_address: string) => {
    const stmt = db.prepare(`
      SELECT * FROM rewards WHERE farmer_address = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(farmer_address);
  },

  getTotalByFarmer: (farmer_address: string) => {
    const stmt = db.prepare(`
      SELECT SUM(amount) as total FROM rewards
      WHERE farmer_address = ? AND status = 'completed'
    `);
    return (stmt.get(farmer_address) as any).total || 0;
  },

  getPending: () => {
    const stmt = db.prepare(`
      SELECT * FROM rewards WHERE status = 'pending'
      ORDER BY created_at ASC
    `);
    return stmt.all();
  }
};

// Nullifier operations
export const nullifierDB = {
  insert: (claim_nullifier: string, batch_id: string) => {
    const stmt = db.prepare(`
      INSERT INTO nullifiers (claim_nullifier, batch_id)
      VALUES (?, ?)
    `);
    return stmt.run(claim_nullifier, batch_id);
  },

  exists: (claim_nullifier: string): boolean => {
    const stmt = db.prepare('SELECT 1 FROM nullifiers WHERE claim_nullifier = ?');
    return stmt.get(claim_nullifier) !== undefined;
  },

  getCount: () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM nullifiers');
    return (stmt.get() as any).count;
  }
};

// Merkle roots operations
export const merkleRootDB = {
  insert: (root: any) => {
    const stmt = db.prepare(`
      INSERT INTO merkle_roots (root_hash, collection_mode, device_count)
      VALUES (@root_hash, @collection_mode, @device_count)
    `);
    return stmt.run(root);
  },

  markPublished: (root_hash: string, tx_hash: string, block_number?: number) => {
    const stmt = db.prepare(`
      UPDATE merkle_roots
      SET published_to_chain = 1, tx_hash = ?, block_number = ?
      WHERE root_hash = ?
    `);
    return stmt.run(tx_hash, block_number, root_hash);
  },

  findCurrent: (collection_mode: string) => {
    const stmt = db.prepare(`
      SELECT * FROM merkle_roots
      WHERE collection_mode = ?
      ORDER BY created_at DESC LIMIT 1
    `);
    return stmt.get(collection_mode);
  },

  getUnpublished: () => {
    const stmt = db.prepare(`
      SELECT * FROM merkle_roots WHERE published_to_chain = 0
    `);
    return stmt.all();
  }
};

// Transaction log operations
export const txLogDB = {
  insert: (tx: any) => {
    const stmt = db.prepare(`
      INSERT INTO transaction_log (tx_hash, tx_type, status, block_number, related_id, metadata)
      VALUES (@tx_hash, @tx_type, @status, @block_number, @related_id, @metadata)
    `);
    return stmt.run(tx);
  },

  markConfirmed: (tx_hash: string, block_number: number) => {
    const stmt = db.prepare(`
      UPDATE transaction_log
      SET status = 'confirmed', block_number = ?, confirmed_at = strftime('%s', 'now')
      WHERE tx_hash = ?
    `);
    return stmt.run(block_number, tx_hash);
  },

  findByHash: (tx_hash: string) => {
    const stmt = db.prepare('SELECT * FROM transaction_log WHERE tx_hash = ?');
    return stmt.get(tx_hash);
  },

  getPending: () => {
    const stmt = db.prepare(`
      SELECT * FROM transaction_log WHERE status = 'pending'
      ORDER BY created_at ASC
    `);
    return stmt.all();
  },

  getRecent: (limit = 20) => {
    const stmt = db.prepare(`
      SELECT * FROM transaction_log
      ORDER BY created_at DESC LIMIT ?
    `);
    return stmt.all(limit);
  }
};

// Database statistics
export function getDatabaseStats() {
  return {
    devices: deviceDB.getAll().length,
    readings: readingDB.getCount(),
    batch_proofs: batchProofDB.getStats(),
    nullifiers: nullifierDB.getCount(),
    pending_rewards: rewardDB.getPending().length
  };
}

// Export database instance for raw queries if needed
export { db };

/**
 * Get raw database instance for advanced operations
 */
export function getDatabase() {
  return db;
}
