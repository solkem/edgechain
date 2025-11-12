-- EdgeChain Database Schema
-- Production-grade persistent storage for Arduino IoT data

-- Device Registry
CREATE TABLE IF NOT EXISTS devices (
  device_pubkey TEXT PRIMARY KEY,
  owner_wallet TEXT NOT NULL, -- Lace wallet address that owns this device
  collection_mode TEXT NOT NULL CHECK (collection_mode IN ('auto', 'manual')),
  registration_epoch INTEGER NOT NULL,
  expiry_epoch INTEGER NOT NULL,
  device_id TEXT,
  metadata TEXT, -- JSON
  merkle_leaf_hash TEXT NOT NULL,
  authorization_reward_paid INTEGER DEFAULT 0, -- Boolean: 0.02 tDUST paid for device registration
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_devices_collection_mode ON devices(collection_mode);
CREATE INDEX IF NOT EXISTS idx_devices_expiry ON devices(expiry_epoch);
CREATE INDEX IF NOT EXISTS idx_devices_owner ON devices(owner_wallet);

-- Sensor Readings
CREATE TABLE IF NOT EXISTS sensor_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_pubkey TEXT NOT NULL,
  reading_json TEXT NOT NULL,
  temperature REAL,
  humidity REAL,
  timestamp_device INTEGER NOT NULL,
  signature_r TEXT NOT NULL,
  signature_s TEXT NOT NULL,
  batch_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (device_pubkey) REFERENCES devices(device_pubkey)
);

CREATE INDEX IF NOT EXISTS idx_readings_device ON sensor_readings(device_pubkey);
CREATE INDEX IF NOT EXISTS idx_readings_batch ON sensor_readings(batch_id);
CREATE INDEX IF NOT EXISTS idx_readings_created ON sensor_readings(created_at);

-- Batch Proofs
CREATE TABLE IF NOT EXISTS batch_proofs (
  batch_id TEXT PRIMARY KEY,
  device_pubkey TEXT NOT NULL,
  collection_mode TEXT NOT NULL,
  readings_count INTEGER NOT NULL,
  proof_data TEXT, -- ZK proof JSON
  public_inputs TEXT, -- JSON
  merkle_root TEXT NOT NULL,
  verified INTEGER DEFAULT 0, -- Boolean
  verified_at INTEGER,
  tx_hash TEXT, -- Midnight transaction hash
  block_number INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (device_pubkey) REFERENCES devices(device_pubkey)
);

CREATE INDEX IF NOT EXISTS idx_batch_proofs_device ON batch_proofs(device_pubkey);
CREATE INDEX IF NOT EXISTS idx_batch_proofs_verified ON batch_proofs(verified);
CREATE INDEX IF NOT EXISTS idx_batch_proofs_tx ON batch_proofs(tx_hash);

-- Rewards
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  farmer_address TEXT NOT NULL,
  amount REAL NOT NULL,
  tx_hash TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  paid_at INTEGER,
  FOREIGN KEY (batch_id) REFERENCES batch_proofs(batch_id)
);

CREATE INDEX IF NOT EXISTS idx_rewards_farmer ON rewards(farmer_address);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);
CREATE INDEX IF NOT EXISTS idx_rewards_tx ON rewards(tx_hash);

-- Nullifiers (prevent replay attacks)
CREATE TABLE IF NOT EXISTS nullifiers (
  claim_nullifier TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  spent_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (batch_id) REFERENCES batch_proofs(batch_id)
);

CREATE INDEX IF NOT EXISTS idx_nullifiers_batch ON nullifiers(batch_id);

-- Merkle Roots (historical tracking)
CREATE TABLE IF NOT EXISTS merkle_roots (
  root_hash TEXT PRIMARY KEY,
  collection_mode TEXT NOT NULL CHECK (collection_mode IN ('auto', 'manual')),
  device_count INTEGER NOT NULL,
  published_to_chain INTEGER DEFAULT 0, -- Boolean
  tx_hash TEXT,
  block_number INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_merkle_roots_mode ON merkle_roots(collection_mode);
CREATE INDEX IF NOT EXISTS idx_merkle_roots_published ON merkle_roots(published_to_chain);

-- Transaction Log (for audit trail)
CREATE TABLE IF NOT EXISTS transaction_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT NOT NULL,
  tx_type TEXT NOT NULL, -- 'proof_submission', 'reward_transfer', 'registry_update'
  status TEXT DEFAULT 'pending',
  block_number INTEGER,
  related_id TEXT, -- batch_id or reward_id
  metadata TEXT, -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  confirmed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tx_log_hash ON transaction_log(tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_log_type ON transaction_log(tx_type);
CREATE INDEX IF NOT EXISTS idx_tx_log_status ON transaction_log(status);
